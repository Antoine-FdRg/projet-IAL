const express = require('express');
const router = express.Router();
const { z } = require('zod'); 
const Message = require('../models/Message');


const { z } = require('zod');

const MessagePayloadSchema = z.object({
  type: z.string(),
  value: z.number(),
  unit: z.string(),
  timestamp: z.string().datetime().optional(),
});

const IngestSchema = z.object({
  payload: MessagePayloadSchema, // payload doit être de cette forme
  source: z.string().optional(),
  type: z.string().optional(), // type global du message si tu veux en plus
});

router.use('/ingest', (req, _res, next) => {
  if (req.method === 'POST') {
    console.log('[ingest] body reçu:', req.body);
  }
  next();
});

router.post('/ingest', apiKeyGuard, async (req, res) => {
  try {
    const parsed = IngestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid body',
        details: parsed.error.flatten(),
      });
    }

    const doc = await Message.create({
      payload: parsed.data.payload,
      source: parsed.data.source ?? null,
      type: parsed.data.type ?? null,
      receivedAt: new Date(),
    });

    return res.status(201).json({ ok: true, id: doc._id.toString() });
  } catch (err) {
    console.error('[ingest] error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/messages', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit ?? '50', 10), 200);
    const page = Math.max(parseInt(req.query.page ?? '1', 10), 1);
    const skip = (page - 1) * limit;

    const q = {};
    if (req.query.source) q.source = req.query.source;
    if (req.query.type) q.type = req.query.type;

    const [items, total] = await Promise.all([
      Message.find(q).sort({ receivedAt: -1 }).skip(skip).limit(limit).lean(),
      Message.countDocuments(q),
    ]);

    return res.json({ page, limit, total, items });
  } catch (err) {
    console.error('[messages] error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
