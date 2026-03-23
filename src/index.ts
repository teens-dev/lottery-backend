import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

import drawRoutes from "./api/routes/draw.routes";
import paymentRoutes from "./api/routes/payment.routes";
import authRoutes from "./api/routes/auth.routes";
import userRoutes from "./api/routes/user.routes";
import adminRoutes from "./api/routes/admin.route";

dotenv.config();

const app = express();

// ✅ CORS (important for cookies)
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Lottery Backend API',
      version: '1.0.0',
      description: 'API Documentation for the Lottery Backend',
    },
    servers: [
      {
        url: 'http://localhost:10000',
        description: 'Local server',
      },
    ],
  },
  apis: ['./src/api/routes/*.ts', './src/api/controllers/*.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:10000', 'http://127.0.0.1:10000']
}));

// ✅ Middlewares
app.use(express.json());
app.use(cookieParser());

// ✅ Test route (optional but useful)
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
const PORT = process.env.PORT || 5000;

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});