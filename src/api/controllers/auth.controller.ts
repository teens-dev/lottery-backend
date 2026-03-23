import type { Request as ExpressRequest, Response as ExpressResponse } from "express";
import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";
import { db } from "../../db/db";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET as string;

const JWT_OPTIONS: SignOptions = {
  expiresIn: (process.env.JWT_EXPIRES_IN as SignOptions["expiresIn"]) || "7d",
};

/* REGISTER USER */
export const register = async (
  req: ExpressRequest,
  res: ExpressResponse
) => {
  try {

    const { name, email, phone, password, level_id, country_id } = req.body;

    /* VALIDATION */
    if (!name || !email || !password || !level_id || !country_id) {
      return res.status(400).json({
        message: "Required fields missing",
      });
    }

    /* CHECK IF EMAIL EXISTS */
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return res.status(409).json({
        message: "Email already registered",
      });
    }

    /* HASH PASSWORD */
    const hashedPassword = await bcrypt.hash(String(password), 10);

    /* INSERT USER */
    const insertedUser = await db
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

    const user = insertedUser[0];

    /* CREATE TOKEN */
    const token = jwt.sign(
      { id: user.id },
      JWT_SECRET,
      JWT_OPTIONS
    );

    return res.status(201).json({
      message: "User registered successfully",
      token,
      user,
    });

  } catch (error) {

    console.error("REGISTER ERROR:", error);

    return res.status(500).json({
      message: "Registration failed",
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

    /* VALIDATION */
    if (!email || !password) {
      return res.status(400).json({
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
        message: "Invalid email or password",
      });
    }

    const match = await bcrypt.compare(
      String(password),
      user.passwordHash
    );

    if (!match) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      { id: user.id },
      JWT_SECRET,
      JWT_OPTIONS
    );

    return res.json({
      message: "Login successful",
      token,
      user,
    });

  } catch (error) {

    console.error("LOGIN ERROR:", error);

    return res.status(500).json({
      message: "Login failed",
    });

  }

};