import express from "express";
import cors from "cors";
import drawRoutes from "./api/routes/draw.routes";
import paymentRoutes from "./api/routes/payment.routes";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

const app = express();

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

app.use(express.json());

app.get("/test", (req, res) => {
  res.send("Server is working");
});

app.use("/api", drawRoutes);
app.use("/api/payments", paymentRoutes);

const PORT = 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});