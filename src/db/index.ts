import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

import drawRoutes from "../api/routes/draw.routes";
import paymentRoutes from "../api/routes/payment.routes";
import authRoutes from "../api/routes/auth.routes";
import userRoutes from "../api/routes/user.routes";
import adminRoutes from "../api/routes/admin.route";

dotenv.config();

const app = express();

// ✅ CORS (for cookies + frontend)
app.use(
  cors({
    origin: ["http://localhost:3000"],
    credentials: true,
  })
);

// ✅ Middlewares
app.use(express.json());
app.use(cookieParser());

// ✅ Health check route
app.get("/", (req, res) => {
  res.send("API is running 🚀");
});

// ✅ Routes
app.use("/api", userRoutes);
app.use("/api", drawRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

// ✅ Port config
const PORT = process.env.PORT || 5000;

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});





