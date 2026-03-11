import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());



app.get("/", (req, res) => {
  res.json({ message: "Server running ✅" });
});

app.listen(10000, () => {
  console.log("🚀 Server started on port 10000");
});