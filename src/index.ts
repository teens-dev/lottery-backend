import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

// ✅ Swagger imports (FIXED)
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

// Routes
import drawRoutes from "./api/routes/draw.routes";
import paymentRoutes from "./api/routes/payment.routes";
import authRoutes from "./api/routes/auth.routes";
import userRoutes from "./api/routes/user.routes";
import adminRoutes from "./api/routes/admin.route";

dotenv.config();

const app = express();

// ✅ Swagger configuration
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
        url: "http://localhost:10000", // ✅ FIXED PORT
        description: "Local server",
      },
    ],
  },
  apis: ["./src/api/routes/*.ts", "./src/api/controllers/*.ts"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// ✅ Swagger route
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ✅ CORS (FIXED for cookies)
app.use(
  cors({
    origin: "http://localhost:3000", // frontend
    credentials: true, // 🔥 REQUIRED for cookies
  })
);

// ✅ Middlewares
app.use(express.json());
app.use(cookieParser());

// ✅ Test route
app.get("/", (req, res) => {
  res.send("API is running 🚀");
});

// ✅ Routes
app.use("/api", userRoutes);
app.use("/api", drawRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

// ✅ Port setup
const PORT = process.env.PORT || 10000;

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});