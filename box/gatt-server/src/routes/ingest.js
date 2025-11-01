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
  const parsed = IngestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });
  }

  const { payload, source, type } = parsed.data;
  const msg = {
    source: source ?? null,
    deviceType: type ?? null,
    type: payload.type,
    value: payload.value,
    unit: payload.unit,
    timestamp: payload.timestamp ?? new Date().toISOString(),
    receivedAt: new Date().toISOString(),
  };

  try {
    const subject = req.app.locals.natsSubject;
    await publish(subject, msg);
    console.log('[nats] published →', subject, msg);
    return res.status(201).json({ ok: true, published: true });
  } catch (e) {
    console.error('[ingest] publish error:', e);
    return res.status(502).json({ error: 'Publish failed' });
  }
});

module.exports = router;
