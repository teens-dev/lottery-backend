import type { Request as ExpressRequest, Response as ExpressResponse } from "express";
import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";
import { db } from "../../db/db";
import { users, referralCodes, referrals, wallets } from "../../db/schema";
import { eq } from "drizzle-orm";
import { sendWelcomeEmail } from "../../utils/sendEmail";

const JWT_SECRET = process.env.JWT_SECRET as string;

const JWT_OPTIONS: SignOptions = {
  expiresIn: (process.env.JWT_EXPIRES_IN as SignOptions["expiresIn"]) || "7d",
};

/* Generate Referral Code */
const generateReferralCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "REF";

  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  return code;
};


/* REGISTER USER */
export const register = async (
  req: ExpressRequest,
  res: ExpressResponse
) => {
  try {

    const { name, email, phone, password, level_id, country_id, referralCode } = req.body;

    if (!name || !email || !password || !level_id || !country_id) {
      return res.status(400).json({
        success:false,
        message: "Required fields missing",
      });
    }

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return res.status(409).json({
        success:false,
        message: "Email already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);

    const result = await db.transaction(async (tx) => {
      // 1. Create User
      const [user] = await tx
        .insert(users)
        .values({
          levelId: level_id,
          countryId: country_id,
          name,
          email,
          phone: phone || null,
          passwordHash: hashedPassword,
          points: 0,
          totalPoints: 0,
          status: "active",
          kycStatus: "pending",
          mfaEnabled: false,
          emailVerified: false,
          phoneVerified: false,
        })
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
        });

      // 2. Create Wallet
      const [wallet] = await tx
        .insert(wallets)
        .values({
          userId: user.id,
          balance: "0.00",
          lockedAmount: "0.00",
        })
        .returning({ id: wallets.id });

      // 3. Create Referral Code
      const code = generateReferralCode();
      await tx.insert(referralCodes).values({
        userId: user.id,
        code
      });

      // 4. Handle Referral Logic
      if (referralCode) {
        const [referrer] = await tx
          .select()
          .from(referralCodes)
          .where(eq(referralCodes.code, referralCode))
          .limit(1);

        if (referrer) {
          await tx.insert(referrals).values({
            referrerUserId: referrer.userId,
            referredUserId: user.id
          });

          await tx
            .update(referralCodes)
            .set({ totalReferrals: referrer.totalReferrals + 1 })
            .where(eq(referralCodes.userId, referrer.userId));
        }
      }

      return { user, walletId: wallet.id };
    });

    const { user, walletId } = result;

    /* ✅ Send Welcome Email (Non-blocking) */
    sendWelcomeEmail(user.email, user.name).catch(err =>
      console.error("Email Error:", err)
    );

    const token = jwt.sign(
      { 
        id: user.id,
        role: "user",
        walletId: walletId
      },
      JWT_SECRET,
      JWT_OPTIONS
    );

    res.cookie("token", token, {
      httpOnly:true,
      sameSite:"lax",
      secure:false,
      maxAge:7*24*60*60*1000
    });

    return res.status(201).json({
      success:true,
      message: "User registered successfully",
      user,
    });

  } catch (error) {

    console.error("REGISTER ERROR:", error);

    return res.status(500).json({
      success:false,
      message: "Registration failed",
      error: error instanceof Error ? error.message : String(error)
    });

  }
};


/* LOGIN USER */
export const login = async (
  req: ExpressRequest,
  res: ExpressResponse
) => {

  try {

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success:false,
        message: "Email and password required",
      });
    }

    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    const user = result[0];

    if (!user) {
      return res.status(401).json({
        success:false,
        message: "Invalid email or password",
      });
    }

    const match = await bcrypt.compare(
      String(password),
      user.passwordHash
    );

    if (!match) {
      return res.status(401).json({
        success:false,
        message: "Invalid email or password",
      });
    }

    let walletId: string | null = null;
    const userWallet = await db
      .select({ id: wallets.id })
      .from(wallets)
      .where(eq(wallets.userId, user.id))
      .limit(1);

    if (userWallet.length > 0) {
      walletId = userWallet[0].id;
    } else {
      // ✅ RESILIENT PROVISIONING: Create wallet if missing for legacy users
      console.log(`[Login] Provisioning missing wallet for legacy user: ${user.id}`);
      const [newWallet] = await db
        .insert(wallets)
        .values({
          userId: user.id,
          balance: "0.00",
          lockedAmount: "0.00",
        })
        .returning({ id: wallets.id });
      walletId = newWallet.id;
    }

    const token = jwt.sign(
      { 
        id: user.id,
        role: user.role, 
        walletId: walletId
      },
      JWT_SECRET,
      JWT_OPTIONS
    );

    res.cookie("token", token, {
      httpOnly:true,
      sameSite:"lax",
      secure:false,
      maxAge:7*24*60*60*1000
    });

    return res.json({
      success:true,
      message: "Login successful",
      user,
    });

  } catch (error) {

    console.error("LOGIN ERROR:", error);

    return res.status(500).json({
      success:false,
      message: "Login failed",
    });

  }

};


/* PROFILE */
export const profile = async (
  req: ExpressRequest,
  res: ExpressResponse
) => {

  try {

    const token = req.cookies.token;

    if(!token){
      return res.status(401).json({
        success:false
      });
    }

    const decoded:any = jwt.verify(token,JWT_SECRET);

    const user = await db
      .select({
        id:users.id,
        name:users.name,
        email:users.email,
        role:users.role
      })
      .from(users)
      .where(eq(users.id,decoded.id))
      .limit(1);

    return res.json({
      success:true,
      user:user[0]
    });

  } catch {
    return res.status(401).json({
      success:false
    });
  }

};


/* UPDATE PROFILE */
export const updateProfile = async (
  req: ExpressRequest,
  res: ExpressResponse
) => {

  try {

    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({
        success: false
      });
    }

    const decoded: any = jwt.verify(token, JWT_SECRET);

    const { username, email, password, role } = req.body;

    const updateData: any = {
      name: username,
      email,
      role
    };

    if (password && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.passwordHash = hashedPassword;
    }

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, decoded.id));

    return res.json({
      success: true,
      message: "Profile updated successfully"
    });

  } catch (error) {

    console.error("UPDATE PROFILE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Profile update failed"
    });

  }

};


/* LOGOUT */
export const logout = async (
  req:ExpressRequest,
  res:ExpressResponse
) => {

  res.clearCookie("token");

  return res.json({
    success:true
  });

};