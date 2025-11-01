require("dotenv").config();
const express = require("express");
const ingestRoutes = require("./routes/ingest");
const { connectNats } = require("./lib/nats");

const app = express();
const PORT = process.env.GATT_SERVER_PORT || 2000;

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

app.get("/health", (_req: any, res: any) =>
  res.json({ status: "ok", ts: Date.now() })
);

(async () => {
  try {
    const natsServers = process.env.NATS_SERVER;
    const natsSubject = process.env.BOX_PRODUCER_QUEUE;
    if (!natsServers) throw new Error("Missing NATS_SERVER");
    if (!natsSubject) throw new Error("Missing BOX_PRODUCER_QUEUE");

    await connectNats(natsServers);
    app.locals.natsSubject = natsSubject;

    app.use("/", ingestRoutes);

    app.listen(PORT, () =>
      console.log(
        `[http] Listening on http://localhost:${PORT} | [nats] subject=${natsSubject}`
      )
    );
  } catch (e) {
    console.error("Boot error:", e);
    process.exit(1);
  }
})();
