import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";

import { db } from "../../db/db";
import { admins } from "../../db/schema/core";
import { adminRoles } from "../../db/schema";

import {
  adminLoginSchema,
  createAdminRoleSchema,
  createAdminSchema,
} from "../validators/admin.validator";
import { AuthRequest } from "../middleware/auth.middleware";

export const createAdminRole = async (req: Request, res: Response) => {
  try {
    const validated = createAdminRoleSchema.safeParse(req.body);

    if (!validated.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validated.error.flatten().fieldErrors,
      });
    }

    const { name, permissions } = validated.data;

    const existingRole = await db
      .select()
      .from(adminRoles)
      .where(eq(adminRoles.name, name));

    if (existingRole.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Admin role already exists",
      });
    }

    const newRole = await db
      .insert(adminRoles)
      .values({
        name,
        permissions,
      })
      .returning();

    return res.status(201).json({
      success: true,
      message: "Admin role created successfully",
      data: newRole[0],
    });
  } catch (error) {
    console.error("Create admin role error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const createAdmin = async (req: Request, res: Response) => {
  try {
    const validated = createAdminSchema.safeParse(req.body);

    if (!validated.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
      });
    }

    const { roleId, name, email, password } = validated.data;

    const passwordHash = await bcrypt.hash(password, 10);

    const newAdmin = await db
      .insert(admins)
      .values({
        roleId,
        name,
        email,
        passwordHash,
      })
      .returning();

    return res.status(201).json({
      success: true,
      message: "Admin created successfully",
      data: newAdmin[0],
    });
  } catch (error) {
    console.error("Create admin error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const adminLogin = async (req: Request, res: Response) => {
  try {
    const validated = adminLoginSchema.safeParse(req.body);

    if (!validated.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
      });
    }

    const { email, password } = validated.data;

    const adminData = await db
      .select({
        id: admins.id,
        name: admins.name,
        email: admins.email,
        passwordHash: admins.passwordHash,
        roleName: adminRoles.name,
        permissions: adminRoles.permissions,
      })
      .from(admins)
      .innerJoin(adminRoles, eq(admins.roleId, adminRoles.id))
      .where(eq(admins.email, email));

    if (!adminData.length) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const admin = adminData[0];

    const isPasswordValid = await bcrypt.compare(
      password,
      admin.passwordHash
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      {
        id: admin.id,
        role: admin.roleName,
        permissions: admin.permissions,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "1d" }
    );

    // ✅ Only token cookie
    res.cookie("admin_token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Admin login successful",
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const getAdminProfile = async (req: AuthRequest, res: Response) => {
  return res.status(200).json({
    success: true,
    user: req.user,
  });
};