import express from "express";
import cors from "cors";
import drawRoutes from "./api/routes/draw.routes";
import paymentRoutes from "./api/routes/payment.routes";
import userRoutes from "./api/routes/user.routes"; // ✅ IMPORTANT
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

const app = express();

// ✅ Swagger
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

// ✅ CORS
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ],
  })
);

app.use(express.json());

// ✅ Test route
app.get("/test", (req, res) => {
  res.send("Server is working");
});

// ✅ ROUTES (ORDER IMPORTANT)
app.use("/api/users", userRoutes); // ✅ MUST BE HERE
app.use("/api", drawRoutes);
app.use("/api/payments", paymentRoutes);

// ✅ Server
const PORT = 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});