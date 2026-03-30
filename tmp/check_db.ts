import { db } from '../src/db/index';
import { users, wallets, transactions } from '../src/db/schema/index';

async function checkDb() {
  try {
    console.log("--- USERS ---");
    const allUsers = await db.select().from(users).limit(10);
    console.table(allUsers.map(u => ({ id: u.id, name: u.name, email: u.email })));

    console.log("\n--- WALLETS ---");
    const allWallets = await db.select().from(wallets).limit(10);
    console.table(allWallets.map(w => ({ id: w.id, userId: w.userId, balance: w.balance })));

    console.log("\n--- TRANSACTIONS ---");
    const allTxns = await db.select().from(transactions).limit(10);
    console.table(allTxns.map(t => ({ id: t.id, userId: t.userId, txnRef: t.txnRef, status: t.status })));

  } catch (err) {
    console.error("Database Error:", err);
  } finally {
    process.exit(0);
  }
}

checkDb();
