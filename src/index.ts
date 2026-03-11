import express from "express";
import cors from "cors";
import drawRoutes from "./api/routes/draw.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server running");
});

/* IMPORTANT */
app.use("/api", drawRoutes);

app.listen(10000, () => {
  console.log("🚀 Server running on port 10000");
});