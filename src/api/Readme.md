# 🚀 Lottery Network — Express API Backend

> **Node.js + Express + TypeScript + Drizzle ORM + Supabase PostgreSQL**  
> Complete REST API backend for the Lottery Network Platform.

---

## 📁 Complete Folder Structure
```
backend/
├── src/
│   ├── api/                          ← All Express API code lives here
│   │   ├── routes/                   ← URL route definitions
│   │   │   ├── auth.routes.ts        ← /api/v1/auth/*
│   │   │   ├── user.routes.ts        ← /api/v1/users/*
│   │   │   ├── draw.routes.ts        ← /api/v1/draws/*
│   │   │   ├── wallet.routes.ts      ← /api/v1/wallet/*
│   │   │   └── referral.routes.ts    ← /api/v1/referrals/*
│   │   ├── controllers/              ← Business logic for each route
│   │   │   ├── auth.controller.ts    ← register, login, logout, refresh
│   │   │   ├── user.controller.ts    ← getProfile, updateProfile, getLevel
│   │   │   ├── draw.controller.ts    ← listDraws, getDrawById, buyTicket
│   │   │   ├── wallet.controller.ts  ← getBalance, topUp, withdraw
│   │   │   └── referral.controller.ts← getReferralCode, getReferralStats
│   │   ├── middleware/               ← Request interceptors
│   │   │   ├── auth.middleware.ts    ← Verifies JWT token on protected routes
│   │   │   ├── admin.middleware.ts   ← Checks if user is an admin
│   │   │   ├── rateLimit.middleware.ts← Prevents abuse / DDoS
│   │   │   └── validate.middleware.ts ← Validates request body with Zod
│   │   ├── validators/               ← Zod schemas for request validation
│   │   │   ├── auth.validator.ts     ← Register/Login input rules
│   │   │   ├── draw.validator.ts     ← Draw creation/ticket purchase rules
│   │   │   └── wallet.validator.ts   ← Top-up/withdrawal amount rules
│   │   └── utils/                   ← Shared helper functions
│   ├── db/                          ← Database layer (Drizzle ORM)
│   │   ├── index.ts                 ← PostgreSQL connection pool
│   │   ├── seed.ts                  ← Seed all 34 tables with sample data
│   │   └── schema/                  ← All 34 table definitions
│   │       ├── index.ts             ← Re-exports everything
│   │       ├── independent.ts       ← Tier 1: levels, countries, game_types...
│   │       ├── core.ts              ← Tier 2: users, admins, draws, wallets...
│   │       ├── junction.ts          ← Tier 3: draw_eligible_levels, draw_winners...
│   │       └── dependent.ts         ← Tier 4: tickets, transactions, audit_logs...
│   └── index.ts                     ← Express app entry point
├── drizzle.config.ts                ← Drizzle Kit config (points to schema + DB)
├── package.json
├── tsconfig.json
└── .env                             ← Environment variables (never commit this)
```

---

## 📦 All Commands Used — What & Why

### Step 1 — Install Core Dependencies

```bash
npm install express cors helmet morgan bcryptjs jsonwebtoken
```

| Package | Why It's Used |
|---|---|
| `express` | The web framework — handles HTTP requests, routing, middleware |
| `cors` | Allows your React/React Native frontend to call this API from a different origin |
| `helmet` | Automatically sets secure HTTP headers (prevents XSS, clickjacking, etc.) |
| `morgan` | Logs every incoming request to the console — essential for debugging |
| `bcryptjs` | Hashes passwords before storing in DB — never store plain text passwords |
| `jsonwebtoken` | Creates and verifies JWT tokens for user authentication |

---

### Step 2 — Install Type Definitions (TypeScript)

```bash
npm install -D @types/express @types/cors @types/morgan @types/bcryptjs @types/jsonwebtoken
```

| Package | Why It's Used |
|---|---|
| `@types/*` | TypeScript needs type definitions for JavaScript libraries to get autocomplete and type checking |
| `-D` flag | Installs as devDependency — only needed during development, not in production build |

---

### Step 3 — Install Utility Packages

```bash
npm install zod uuid
npm install -D @types/uuid
```

| Package | Why It's Used |
|---|---|
| `zod` | Validates incoming request body/params — e.g. "email must be valid", "amount must be > 0" |
| `uuid` | Generates unique IDs — used for transaction references, ticket numbers etc. |

---

### Step 4 — Install Database Packages

```bash
npm install drizzle-orm pg dotenv
npm install -D drizzle-kit @types/pg tsx
```

| Package | Why It's Used |
|---|---|
| `drizzle-orm` | The ORM — lets you write type-safe database queries in TypeScript |
| `pg` | PostgreSQL driver — the actual connection library that talks to Supabase |
| `dotenv` | Loads `.env` file variables into `process.env` |
| `drizzle-kit` | CLI tool for generating and running migrations |
| `tsx` | Runs TypeScript files directly without compiling first (used for seed, scripts) |

---

### Step 5 — Create Folder Structure (Windows PowerShell)

```powershell
# Create all folders at once
New-Item -ItemType Directory -Force -Path src/api/routes, src/api/controllers, src/api/middleware, src/api/utils, src/api/validators
```

**Why:** Organizes code by responsibility — routes only define URLs, controllers only contain logic, middleware only intercepts requests. This is the industry-standard MVC-style structure.

--- 

### Step 6 — Create All Files (Windows PowerShell)

```powershell
# Route files
$null = New-Item -Force src/api/routes/auth.routes.ts, src/api/routes/user.routes.ts, src/api/routes/draw.routes.ts, src/api/routes/wallet.routes.ts, src/api/routes/referral.routes.ts

# Controller files
$null = New-Item -Force src/api/controllers/auth.controller.ts, src/api/controllers/user.controller.ts, src/api/controllers/draw.controller.ts, src/api/controllers/wallet.controller.ts, src/api/controllers/referral.controller.ts

# Middleware files
$null = New-Item -Force src/api/middleware/auth.middleware.ts, src/api/middleware/admin.middleware.ts, src/api/middleware/rateLimit.middleware.ts, src/api/middleware/validate.middleware.ts

# Validator + entry point files
$null = New-Item -Force src/api/validators/auth.validator.ts, src/api/validators/draw.validator.ts, src/api/validators/wallet.validator.ts, src/index.ts
```

**Why `$null =`:** Suppresses the verbose output PowerShell prints when creating files. Without it, PowerShell prints every file created which clutters the terminal.

---

### Step 7 — If Using Git Bash Instead (Recommended on Windows)

```bash
# Create folders
mkdir -p src/api/routes src/api/controllers src/api/middleware src/api/utils src/api/validators

# Create all files
touch src/api/routes/auth.routes.ts src/api/routes/user.routes.ts src/api/routes/draw.routes.ts src/api/routes/wallet.routes.ts src/api/routes/referral.routes.ts
touch src/api/controllers/auth.controller.ts src/api/controllers/user.controller.ts src/api/controllers/draw.controller.ts src/api/controllers/wallet.controller.ts src/api/controllers/referral.controller.ts
touch src/api/middleware/auth.middleware.ts src/api/middleware/admin.middleware.ts src/api/middleware/rateLimit.middleware.ts src/api/middleware/validate.middleware.ts
touch src/api/validators/auth.validator.ts src/api/validators/draw.validator.ts src/api/validators/wallet.validator.ts src/index.ts
```

---

### Step 8 — Database Commands

```bash
# Generate SQL migration files from your schema
npm run db:generate

# Apply migrations to Supabase (creates all 34 tables)
npm run db:migrate

# Seed all 34 tables with sample data
npx tsx src/db/seed.ts

# Open Drizzle Studio (visual table browser in browser)
npm run db:studio

# Push schema directly without migration files (dev only)
npm run db:push
```

---

### Step 9 — Run the Server

```bash
# Development mode (auto-restarts on file save)
npm run dev

# Production build
npm run build

# Run production build
npm start
```

---

## ⚙️ package.json Scripts

```json
{
  "scripts": {
    "dev":          "tsx watch src/index.ts",
    "build":        "tsc",
    "start":        "node dist/index.js",
    "db:generate":  "drizzle-kit generate",
    "db:migrate":   "drizzle-kit migrate",
    "db:push":      "drizzle-kit push",
    "db:studio":    "drizzle-kit studio",
    "db:seed":      "tsx src/db/seed.ts"
  }
}
```

| Script | What It Does |
|---|---|
| `npm run dev` | Starts server with `tsx watch` — auto-restarts when you save any file |
| `npm run build` | Compiles TypeScript → JavaScript into `dist/` folder |
| `npm start` | Runs the compiled JavaScript (use in production) |
| `npm run db:generate` | Reads schema files and generates `.sql` migration files |
| `npm run db:migrate` | Runs pending migrations against Supabase database |
| `npm run db:push` | Directly syncs schema to DB — skips migration files (dev only) |
| `npm run db:studio` | Opens visual database browser at localhost |
| `npm run db:seed` | Runs seed.ts and inserts sample data into all 34 tables |

---

## 🔧 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## 🌐 API Routes Overview

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Register new user | No |
| POST | `/api/v1/auth/login` | Login with email + password | No |
| POST | `/api/v1/auth/logout` | Invalidate session token | Yes |
| POST | `/api/v1/auth/refresh` | Get new access token | Refresh Token |
| GET | `/api/v1/users/me` | Get current user profile + level | Yes |
| PATCH | `/api/v1/users/me` | Update profile details | Yes |
| GET | `/api/v1/draws` | List all live/upcoming draws | No |
| GET | `/api/v1/draws/:id` | Get single draw details | No |
| POST | `/api/v1/draws/:id/tickets` | Purchase a ticket for a draw | Yes |
| GET | `/api/v1/wallet` | Get wallet balance | Yes |
| POST | `/api/v1/wallet/topup` | Add money to wallet | Yes |
| POST | `/api/v1/wallet/withdraw` | Request withdrawal | Yes |
| GET | `/api/v1/wallet/transactions` | Get transaction history | Yes |
| GET | `/api/v1/referrals` | Get referral code + stats | Yes |
| GET | `/api/v1/results` | Get draw results archive | No |

---

## 🔑 Environment Variables (.env)

```env
# Database — get from Supabase → Settings → Database → URI
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"

# JWT Secrets — generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_ACCESS_SECRET="your_64_char_random_secret_here"
JWT_REFRESH_SECRET="your_different_64_char_random_secret_here"

# Token Expiry
JWT_ACCESS_EXPIRES="15m"
JWT_REFRESH_EXPIRES="30d"

# Server
PORT=5000
NODE_ENV="development"

# Razorpay (get from razorpay.com dashboard)
RAZORPAY_KEY_ID="rzp_live_xxxxxxxxxxxx"
RAZORPAY_KEY_SECRET="your_razorpay_secret"

# App
FRONTEND_URL="http://localhost:3000"
```

> ⚠️ **Never commit `.env` to Git.** Add it to `.gitignore` immediately.

---

## 🛡️ Middleware Explained

### `auth.middleware.ts`
Runs on every protected route. Reads the `Authorization: Bearer <token>` header, verifies the JWT signature, and attaches the user object to `req.user`. If token is missing or invalid, returns `401 Unauthorized`.

### `admin.middleware.ts`
Runs after `auth.middleware` on admin-only routes. Checks if the authenticated user has an admin role. Returns `403 Forbidden` if a regular user tries to access admin endpoints.

### `rateLimit.middleware.ts`
Limits how many requests a single IP can make per minute. Prevents brute-force attacks on login and abuse of the API. Example: max 20 requests/minute for public endpoints, 100 for authenticated.

### `validate.middleware.ts`
Wraps Zod schemas and validates `req.body` before it reaches the controller. If validation fails, returns `400 Bad Request` with clear error messages — the controller never runs with invalid data.

---

## 📐 How Routes → Controllers Work

```
HTTP Request
     ↓
Express Router (routes/auth.routes.ts)
     ↓
Middleware chain (validate → auth → rateLimit)
     ↓
Controller function (controllers/auth.controller.ts)
     ↓
Database query via Drizzle ORM (db/schema/)
     ↓
JSON Response back to client
```

---

## 🚦 How to Run — Complete Sequence

```bash
# 1. Install all packages
npm install

# 2. Set up your .env file with DATABASE_URL and JWT secrets
# (copy from the Environment Variables section above)

# 3. Generate migration files from schema
npm run db:generate

# 4. Apply migrations — creates all 34 tables in Supabase
npm run db:migrate

# 5. Seed the database with sample data
npm run db:seed

# 6. Start development server
npm run dev

# Server starts at: http://localhost:5000
# Test it: http://localhost:5000/api/v1/draws
```

---

## ✅ Verify Server is Running

```bash
# In a new terminal, test with curl:
curl http://localhost:5000/api/v1/draws

# Or open in browser:
http://localhost:5000/api/v1/draws

# Expected response:
# { "success": true, "data": [...] }
```

---

## ❌ Common Errors & Fixes

| Error | Cause | Fix |
|---|---|---|
| `Cannot find module 'express'` | Packages not installed | Run `npm install` |
| `connect ECONNREFUSED` | DATABASE_URL wrong or Supabase down | Check `.env` DATABASE_URL |
| `JWT malformed` | Wrong or expired token in request | Re-login to get fresh token |
| `relation does not exist` | Migrations not run yet | Run `npm run db:migrate` |
| `touch is not recognized` | You're on Windows PowerShell | Use `New-Item` or switch to Git Bash |
| `mkdir: positional parameter` | Windows PowerShell mkdir limitation | Use `New-Item -ItemType Directory` |
| `Port 5000 already in use` | Another process using port 5000 | Change `PORT=5001` in `.env` |

---

*Lottery Network Backend — Express API v1.0*