import express from "express";
import cors from "cors";
import adminRoutes from "./api/routes/revenue.routes.ts";

console.log("🔥 THIS INDEX.TS IS RUNNING");

const app = express();

// ✅ CORS
app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// ✅ Middleware
app.use(express.json());

// ✅ Test route
app.get("/test", (req, res) => {
  res.send("Server is working");
});

// ✅ Routes
app.use("/api/admin", adminRoutes);

// ✅ Server
const PORT = 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});