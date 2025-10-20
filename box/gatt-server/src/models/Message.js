const { Schema, model } = require('mongoose');

const PayloadSchema = new Schema(
  {
    type: { type: String, required: true },
    value: { type: Number, required: true },
    unit: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }, // si absent, on met la date actuelle
  },
  { _id: false }
);

const MessageSchema = new Schema(
  {
    payload: { type: PayloadSchema, required: true },
    source: { type: String, default: null },
    type: { type: String, default: null },
    receivedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

module.exports = model('Message', MessageSchema);
