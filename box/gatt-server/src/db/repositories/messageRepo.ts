const { MessageModel } = require("../models/Mesage");
const crypto = require("crypto");

async function saveMessage({
  messageId,
  payload,
  source,
  metadata,
  ttlDays,
}: {
  messageId?: string;
  payload: any;
  source?: string;
  metadata?: Record<string, any>;
  ttlDays?: number;
}) {
  const expireAt = ttlDays ? new Date(Date.now() + ttlDays * 86400000) : null;

  return await MessageModel.create({
    messageId: messageId ?? crypto.randomUUID(),
    payload,
    source: source ?? "unknown",
    metadata: metadata ?? {},
    expireAt,
  });
}

async function getRecentMessages(limit = 20) {
  return await MessageModel.find().sort({ receivedAt: -1 }).limit(limit).lean();
}

module.exports = {
  saveMessage,
  getRecentMessages,
};
