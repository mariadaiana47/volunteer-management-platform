import mongoose from "mongoose";

const partnerSchema = new mongoose.Schema({
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    logo: String,
    website: String,
    category: {
      type: String,
      enum: ["retail", "education", "entertainment", "food", "health", "other"],
      required: true
    },
    address: String,
    contactEmail: String,
    contactPhone: String,
    isActive: {
      type: Boolean,
      default: true
    }
  }, { timestamps: true });