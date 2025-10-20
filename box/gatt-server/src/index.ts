require("dotenv").config();

const express = require("express");
const { connect } = require("./db");
const ingestRoutes = require("./routes/ingest");

const app = express();
const PORT = process.env.PORT || 3000;

// parsers
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

// health check
app.get(
  "/health",
  (req: any, res: { json: (arg0: { status: string; ts: number }) => void }) => {
    res.json({ status: "ok", ts: Date.now() });
  }
);

// routes
app.use("/", ingestRoutes);

// start
(async () => {
  try {
    const uri = process.env.MONGODB_URI;
    const dbName = process.env.DB_NAME || "telemetry";
    if (!uri) throw new Error("Missing MONGODB_URI");
    await connect(uri, dbName);

    app.listen(PORT, () => {
      console.log(`[http] Listening on http://localhost:${PORT}`);
    });
  } catch (e) {
    console.error("Boot error:", e);
    process.exit(1);
  }
})();
