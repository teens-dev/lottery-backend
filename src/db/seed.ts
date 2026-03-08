import { db } from './index';
import {
  levels, gameTypes, paymentMethods,
  kycDocumentTypes, countries, adminRoles, rejectionReasons
} from './schema/index';

async function seed() {
  console.log('Seeding master data...');

  await db.insert(levels).values([
    { levelNum: 1,  name: 'Basic Member', color: '#4a5568', pointsMin: 0,     pointsMax: 99,    discountPct: 0,  picksCount: 1  },
    { levelNum: 2,  name: 'Bronze',       color: '#cd7c2f', pointsMin: 100,   pointsMax: 299,   discountPct: 5,  picksCount: 2  },
    { levelNum: 3,  name: 'Silver',       color: '#94a3b8', pointsMin: 300,   pointsMax: 599,   discountPct: 10, picksCount: 3  },
    { levelNum: 4,  name: 'Gold',         color: '#f5c518', pointsMin: 600,   pointsMax: 999,   discountPct: 15, picksCount: 4  },
    { levelNum: 5,  name: 'Platinum',     color: '#00d68f', pointsMin: 1000,  pointsMax: 1999,  discountPct: 20, picksCount: 5  },
    { levelNum: 6,  name: 'Diamond',      color: '#06b6d4', pointsMin: 2000,  pointsMax: 4999,  discountPct: 25, picksCount: 6  },
    { levelNum: 7,  name: 'Elite',        color: '#a855f7', pointsMin: 5000,  pointsMax: 9999,  discountPct: 30, picksCount: 7  },
    { levelNum: 8,  name: 'Superstar',    color: '#f59e0b', pointsMin: 10000, pointsMax: 19999, discountPct: 35, picksCount: 8  },
    { levelNum: 9,  name: 'Titan',        color: '#3d9eff', pointsMin: 20000, pointsMax: 49999, discountPct: 40, picksCount: 9  },
    { levelNum: 10, name: 'VIP',          color: '#f5c518', pointsMin: 50000, pointsMax: null,  discountPct: 50, picksCount: 99 },
  ]).onConflictDoNothing();

  await db.insert(gameTypes).values([
    { name: 'Mega Millions',  icon: '🎰', description: 'Large jackpot draws' },
    { name: 'Super Jackpot',  icon: '💰', description: 'Weekly jackpots'     },
    { name: 'Power Ball',     icon: '⚡', description: 'Daily power draws'   },
    { name: 'Daily Draw',     icon: '🎯', description: 'Daily small draws'   },
    { name: 'Weekly Special', icon: '🌟', description: 'Weekly specials'     },
  ]).onConflictDoNothing();

  await db.insert(paymentMethods).values([
    { name: 'UPI',         icon: '📱' },
    { name: 'Card',        icon: '💳' },
    { name: 'Net Banking', icon: '🏦' },
    { name: 'Wallet',      icon: '👛' },
    { name: 'PayPal',      icon: '🔵' },
  ]).onConflictDoNothing();

  await db.insert(kycDocumentTypes).values([
    { name: 'Aadhaar Card', countriesAccepted: ['IN'] },
    { name: 'PAN Card',     countriesAccepted: ['IN'] },
    { name: 'Passport',     countriesAccepted: ['IN', 'US', 'UK', 'AE'] },
    { name: 'Voter ID',     countriesAccepted: ['IN'] },
    { name: 'Driving License', countriesAccepted: ['IN', 'US', 'UK'] },
  ]).onConflictDoNothing();

  await db.insert(adminRoles).values([
    { name: 'Super Admin',      permissions: ['*'] },
    { name: 'Operations Manager', permissions: ['users', 'draws', 'kyc', 'reports'] },
    { name: 'Finance Manager',  permissions: ['payments', 'wallets', 'reports'] },
    { name: 'Support Agent',    permissions: ['users:read', 'notifications'] },
    { name: 'Compliance Officer', permissions: ['kyc', 'audit_logs', 'reports'] },
  ]).onConflictDoNothing();

  await db.insert(rejectionReasons).values([
    { reason: 'Blurry/Unclear Image',      description: 'Document image is not clearly readable' },
    { reason: 'Name Mismatch',             description: 'Name on document differs from account' },
    { reason: 'Expired Document',          description: 'Document has passed its expiry date'   },
    { reason: 'Suspected Fake Document',   description: 'Document appears to be tampered with'  },
    { reason: 'Incomplete Submission',     description: 'Required pages or selfie are missing'  },
  ]).onConflictDoNothing();

  console.log('Seed complete! All master data inserted.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});