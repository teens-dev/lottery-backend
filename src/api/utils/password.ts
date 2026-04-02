import bcrypt from "bcrypt";
import crypto from "crypto";

export const hashPassword = async (password: string) => {
  return bcrypt.hash(password, 10);
};

export const generateStrongPassword = () => {
  return crypto.randomBytes(8).toString("hex");
};