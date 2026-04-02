import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

// Swagger
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

// Routes
import drawRoutes from "./api/routes/draw.routes";
import paymentRoutes from "./api/routes/payment.routes";
import authRoutes from "./api/routes/auth.routes";
import userRoutes from "./api/routes/user.routes";
import adminRoutes from "./api/routes/admin.route";
import revenueRoutes from "./api/routes/revenue.routes";
import referralRoutes from "./api/routes/referral.routes";
import ticketRoutes from "./api/routes/ticket.routes";

dotenv.config();


import walletRoutes from "./api/routes/wallet.routes";

const app = express();

app.use(express.json());
app.use(cookieParser());   // ✅ IMPORTANT FIX

// Swagger
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Lottery Backend API",
      version: "1.0.0",
      description: "API Documentation for the Lottery Backend",
    },
    servers: [
      {
        url: "http://localhost:10000",
      },
    ],
  },
  apis: ["./src/api/routes/*.ts", "./src/api/controllers/*.ts"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/", (req, res) => {
  res.send("API is running 🚀");
});



import levelRoutes from "./api/routes/level.routes";
import revenueRoutes from "./api/routes/revenue.routes";

// ✅ ROUTES (ORDER IMPORTANT)
app.use("/api/users", userRoutes); // ✅ MUST BE HERE
// ✅ Routes
app.use("/api/revenue", revenueRoutes);

app.use("/api", drawRoutes);
app.use("/api", levelRoutes); // ✅ NEW: Level Game Routes
app.use("/api/payments", paymentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/referral", referralRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api", walletRoutes);

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});