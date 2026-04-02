import { db } from "../../db";
import { admins } from "../../db/schema";
import { eq } from "drizzle-orm";

export const getAllAdminEmails = async () => {
  const adminsList = await db
    .select({ email: admins.email })
    .from(admins)
    .where(eq(admins.isActive, true));

  return adminsList.map(a => a.email);
};