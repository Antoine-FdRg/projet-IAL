const express = require('express');
const router = express.Router();
const { z } = require('zod');
const { publish } = require('../lib/nats');

const MessagePayloadSchema = z.object({
  type: z.string(),
  value: z.number(),
  unit: z.string(),
  timestamp: z.string().datetime().optional(),
});

const IngestSchema = z.object({
  payload: MessagePayloadSchema,
  source: z.string().optional(),
  type: z.string().optional(),
});

router.use('/ingest', (req, _res, next) => {
  if (req.method === 'POST') console.log('[ingest] body reçu:', req.body);
  next();
});

router.post('/ingest', async (req, res) => {
  try {
    const subject = req.app.locals.natsSubject;
    await publish(subject, req.body.payload);
    console.log('[nats] published →', subject, req.body.payload);
    return res.status(201).json({ ok: true, published: true });
  } catch (e) {
    console.error('[ingest] publish error:', e);
    return res.status(502).json({ error: 'Publish failed' });
  }
});

module.exports = router;
