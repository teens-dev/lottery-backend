import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Lottery API",
      version: "1.0.0",
    },

    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "token" // 👈 same cookie name
        }
      }
    },

    security: [
      {
        cookieAuth: []
      }
    ]
  },

  apis: ["./src/api/routes/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);