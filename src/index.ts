import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import drawRoutes from "./api/routes/draw.routes";
import paymentRoutes from "./api/routes/payment.routes";
import walletRoutes from "./api/routes/wallet.routes";
import userRoutes from "./api/routes/user.routes";

import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

const app = express();

/* =====================================================
   SWAGGER CONFIG (WITH COOKIE AUTH)
===================================================== */

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
        description: "Local server",
      },
    ],

    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "token", // 🔥 cookie name same undali
        },
      },
    },

    security: [
      {
        cookieAuth: [],
      },
    ],
  },

  apis: ["./src/api/routes/*.ts", "./src/api/controllers/*.ts"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/* =====================================================
   MIDDLEWARES
===================================================== */

app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:10000",
    "http://127.0.0.1:10000"
  ],
  credentials: true // 🔥 IMPORTANT for cookies
}));

app.use(express.json());
app.use(cookieParser()); // 🔥 REQUIRED for reading cookies

/* =====================================================
   TEST ROUTE
===================================================== */

app.get("/test", (req, res) => {
  res.send("Server is working");
});

/* =====================================================
   ROUTES
===================================================== */

app.use("/api", userRoutes);
app.use("/api", drawRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/wallet", walletRoutes);

/* =====================================================
   SERVER START
===================================================== */

const PORT = 10000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📄 Swagger Docs: http://localhost:${PORT}/api-docs`);
});