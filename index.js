import express from "express";
import cors from "cors";
import client from "prom-client";  // 👈 add this

const app = express();

app.use(cors());
app.use(express.json());

// ✅ Collect default system metrics
client.collectDefaultMetrics();

// ✅ Custom metric (optional but good)
const httpRequestCounter = new client.Counter({
  name: "http_requests_total",
  help: "Total HTTP Requests",
});

// Middleware to count requests
app.use((req, res, next) => {
  httpRequestCounter.inc();
  next();
});

// 👇 YOUR EXISTING ROUTE
app.get("/", (req, res) => {
  res.json({ message: "Server running ✅" });
});

// ✅ METRICS ENDPOINT (VERY IMPORTANT)
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});

app.listen(10000, () => {
  console.log("🚀 Server started on port 10000");
});
