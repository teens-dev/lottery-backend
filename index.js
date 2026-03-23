import express from "express";
import cors from "cors";
import userRoutes from "./src/api/routes/user.routes.ts";
import adminRoutes from "./api/routes/admin.routes";


const app = express();

app.use(cors());
app.use(express.json());

// connect routes
app.use("/api", userRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Server running ✅" });
});

app.listen(10000, () => {
  console.log("🚀 Server started on port 10000");
});