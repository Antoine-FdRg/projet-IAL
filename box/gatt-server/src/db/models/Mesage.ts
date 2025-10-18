import mongoose, { Schema, InferSchemaType } from "mongoose";

const MessageSchema = new Schema(
  {
    messageId: { type: String, index: true, unique: true, sparse: true }, // mets unique si tu fournis toujours un ID
    payload: { type: Schema.Types.Mixed, required: true }, // Buffer | string | JSON
    source: { type: String, default: "unknown" },
    metadata: { type: Schema.Types.Mixed },
    receivedAt: { type: Date, default: () => new Date(), index: -1 },
    expireAt: { type: Date, default: null, index: { expireAfterSeconds: 0 } },
  },
  { versionKey: false }
);

export type MessageDoc = InferSchemaType<typeof MessageSchema>;
export const MessageModel = mongoose.model(
  "Message",
  MessageSchema,
  "messages"
);
