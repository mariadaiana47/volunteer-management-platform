import mongoose from "mongoose";

const creditTransactionSchema = new mongoose.Schema({
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true
    },
    actionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event.actions"
    },
    type: {
      type: String,
      enum: ["earned", "redeemed"],
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    description: String,
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending"
    }
  }, { timestamps: true });