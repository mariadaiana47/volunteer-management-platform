import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    senderAvatar: {
      type: String,
      default: "/default-avatar.png",
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

MessageSchema.index({ eventId: 1, timestamp: 1 });
MessageSchema.index({ senderId: 1 });

const Message =
  mongoose.models.Message || mongoose.model("Message", MessageSchema);

export default Message;
