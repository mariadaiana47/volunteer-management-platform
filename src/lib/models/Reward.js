import mongoose from "mongoose";

const rewardSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters long"],
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      minlength: [10, "Description must be at least 10 characters long"],
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    partnerName: {
      type: String,
      required: [true, "Partner name is required"],
      trim: true,
    },
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    creditCost: {
      type: Number,
      required: [true, "Credit cost is required"],
      min: [1, "Credit cost must be at least 1"],
    },
    type: {
      type: String,
      enum: {
        values: ["discount", "voucher", "product", "service"],
        message: "Invalid reward type",
      },
      required: [true, "Reward type is required"],
    },
    validUntil: {
      type: Date,
      required: [true, "Validity date is required"],
      validate: {
        validator: function (value) {
          return value > new Date();
        },
        message: "Validity date must be in the future",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    availableQuantity: {
      type: Number,
      default: null,
      validate: {
        validator: function (value) {
          return value === null || value >= 0;
        },
        message: "Available quantity cannot be negative",
      },
    },
    termsAndConditions: {
      type: String,
      required: [true, "Terms and conditions are required"],
      minlength: [
        10,
        "Terms and conditions must be at least 10 characters long",
      ],
    },
    redemptionInstructions: {
      type: String,
      required: [true, "Redemption instructions are required"],
    },
    imageUrl: {
      type: String,
      default: null,
    },
    category: {
      type: String,
      enum: {
        values: [
          "dining",
          "shopping",
          "entertainment",
          "travel",
          "education",
          "health",
          "services",
          "other",
        ],
        message: "Invalid category",
      },
      required: [true, "Category is required"],
    },
    timesRedeemed: {
      type: Number,
      default: 0,
      min: 0,
    },
    redemptionHistory: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        redeemedAt: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: ["pending", "completed", "cancelled"],
          default: "completed",
        },
      },
    ],
    restrictions: {
      minAge: {
        type: Number,
        default: null,
      },
      maxRedemptionsPerUser: {
        type: Number,
        default: null,
      },
      locationRestriction: {
        type: String,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  }
);

rewardSchema.index({ isActive: 1, validUntil: 1 });
rewardSchema.index({ partnerId: 1 });
rewardSchema.index({ type: 1 });
rewardSchema.index({ category: 1 });

rewardSchema.virtual("isExpired").get(function () {
  return this.validUntil < new Date();
});

rewardSchema.virtual("isAvailable").get(function () {
  return (
    this.isActive &&
    !this.isExpired &&
    (this.availableQuantity === null || this.availableQuantity > 0)
  );
});

rewardSchema.pre("save", function (next) {
  if (this.isModified("validUntil") && this.validUntil < new Date()) {
    next(new Error("Validity date must be in the future"));
  }
  next();
});

rewardSchema.methods.canBeRedeemedBy = function (user) {
  if (!this.isAvailable) {
    return false;
  }

  if (this.restrictions.minAge && user.dataNastere) {
    const age =
      new Date().getFullYear() - new Date(user.dataNastere).getFullYear();
    if (age < this.restrictions.minAge) {
      return false;
    }
  }

  if (this.restrictions.maxRedemptionsPerUser) {
    const userRedemptions = this.redemptionHistory.filter(
      (h) => h.userId.toString() === user._id.toString()
    ).length;
    if (userRedemptions >= this.restrictions.maxRedemptionsPerUser) {
      return false;
    }
  }

  return true;
};

const Reward = mongoose.models.Reward || mongoose.model("Reward", rewardSchema);

export default Reward;
