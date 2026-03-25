import { db } from "./db/index.js";
import { draws } from "./db/schema/core.js";

async function checkDraws() {
  try {
    const allDraws = await db.select().from(draws).limit(5);
    console.log("RAW DRAWS FROM DB:");
    console.log(JSON.stringify(allDraws, null, 2));
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkDraws();
