import express from "express";
import cors from "cors";
import drawRoutes from "./api/routes/draw.routes";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

const app = express();

const swaggerOptions: swaggerJsdoc.Options = {
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
      schemas: {
        Draw: {
          type: "object",
          properties: {
            id:             { type: "string", format: "uuid", example: "550e8400-e29b-41d4-a716-446655440000" },
            name:           { type: "string", example: "Weekly Mega Draw" },
            status:         { type: "string", enum: ["draft","scheduled","live","completed","cancelled"], example: "live" },
            prizePool:      { type: "string", example: "100000.00" },
            ticketPrice:    { type: "string", example: "50.00" },
            maxEntries:     { type: "integer", example: 1000 },
            currentEntries: { type: "integer", example: 342 },
            minEntries:     { type: "integer", example: 10 },
            drawDate:       { type: "string", format: "date-time", example: "2026-03-20T18:00:00.000Z" },
            drawStartDate:  { type: "string", format: "date-time", example: "2026-03-13T00:00:00.000Z" },
            drawEndDate:    { type: "string", format: "date-time", example: "2026-03-19T23:59:59.000Z" },
            description:    { type: "string", nullable: true, example: "Weekly lottery draw" },
            isGuaranteed:   { type: "boolean", example: true },
            rngSeedHash:    { type: "string", nullable: true, example: null },
            gameTypeId:     { type: "integer", example: 1 },
            gameTypeName:   { type: "string", nullable: true, example: "Classic Lottery" },
            gameTypeIcon:   { type: "string", nullable: true, example: "🎰" },
            createdAt:      { type: "string", format: "date-time", example: "2026-03-13T07:00:00.000Z" },
            updatedAt:      { type: "string", format: "date-time", example: "2026-03-13T07:00:00.000Z" },
          },
        },
      },
    },
  },
  apis: ["./src/api/controllers/*.ts", "./src/api/routes/*.ts"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:10000", "http://127.0.0.1:10000"],
}));

app.use(express.json());

app.get("/test", (req, res) => {
  res.send("Server is working");
});

app.use("/api", drawRoutes);

const PORT = 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`📄 Swagger docs: http://localhost:${PORT}/api-docs`);
});