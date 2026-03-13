import express from "express";
import userRoutes from "./api/routes/user.routes";
import drawRoutes from "./api/routes/draw.routes";

const app = express();

app.use(express.json());

app.use("/api", userRoutes);


app.get("/test", (req, res) => {
  res.send("Server is working");
});

app.use("/api", drawRoutes);

const PORT = 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});