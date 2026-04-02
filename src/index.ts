import express from "express";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";

import walletRoutes from "./api/routes/wallet.routes";

const app = express();

app.use(express.json());

// ✅ Swagger route
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ✅ API routes
app.use("/api", walletRoutes);

app.listen(10000, () => {
  console.log("Server running on port 10000");
});