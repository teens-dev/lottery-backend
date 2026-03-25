import { z } from "zod";

export const adminLoginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const createAdminRoleSchema = z.object({
  name: z.string().min(2, "Role name is required"),
  permissions: z.array(z.string()).default([]),
});


export const createAdminSchema = z.object({
  roleId: z.number().int().positive("Valid roleId is required"),
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  isActive: z.boolean().optional(),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type CreateAdminRoleInput = z.infer<typeof createAdminRoleSchema>;
export type CreateAdminInput = z.infer<typeof createAdminSchema>;







