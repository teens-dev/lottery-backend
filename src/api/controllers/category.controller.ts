import { Request, Response } from "express";
import { db } from "../../db/index";
import { gameTypes } from "../../db/schema";

export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await db.select().from(gameTypes);
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name, description, icon, type } = req.body;
    const newCategory = await db.insert(gameTypes).values({ name, description, icon, type }).returning();
    res.status(201).json({ success: true, data: newCategory });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

