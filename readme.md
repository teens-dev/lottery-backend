# 1. Install
npm install drizzle-orm pg dotenv
npm install -D drizzle-kit @types/pg tsx

# 2. Generate migration SQL files from schema
npm run db:generate

# 3. Apply migrations to Supabase
npm run db:migrate

# 4. Seed master data
npx tsx src/db/seed.ts

# 5. Open Drizzle Studio (visual DB browser)
npm run db:studio

# 6. If schema changes later — regenerate + migrate
npm run db:generate
npm run db:migrate