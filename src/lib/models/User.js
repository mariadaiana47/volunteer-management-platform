import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    nume: {
      type: String,
      required: true,
      trim: true,
    },
    prenume: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please fill a valid email address",
      ],
    },
    password: {
      type: String,
      required: true,
    },
    dataNastere: {
      type: Date,
      required: false,
    },
    adresa: {
      type: String,
      required: false,
      trim: true,
    },
    interese: {
      type: [String],
      default: [],
    },
    avatar: {
      type: String,
      default: null,
    },
    profilePicture: {
      type: String,
      default: "default-avatar.png",
    },
    role: {
      type: String,
      enum: ["admin", "volunteer", "company"],
      default: "volunteer",
    },
    credits: {
      total: {
        type: Number,
        default: 0,
        min: 0,
      },
      history: [
        {
          eventId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Event",
            required: true,
          },
          eventTitle: {
            type: String,
            required: true,
          },
          actionTitle: {
            type: String,
            required: true,
          },
          creditsEarned: {
            type: Number,
            required: true,
            min: 0,
          },
          earnedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
    },
    redeemedRewards: [
      {
        rewardId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Reward",
          required: true,
        },
        rewardTitle: {
          type: String,
          required: true,
        },
        description: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          enum: ["discount", "voucher", "product", "service"],
          required: true,
        },
        partnerName: {
          type: String,
          required: true,
        },
        redemptionCode: {
          type: String,
          required: true,
        },
        instructions: {
          type: String,
          required: true,
        },
        creditCost: {
          type: Number,
          required: true,
          min: 0,
        },
        status: {
          type: String,
          enum: ["active", "used", "expired"],
          default: "active",
        },
        redeemedAt: {
          type: Date,
          default: Date.now,
        },
        validUntil: {
          type: Date,
          required: true,
        },
        usedAt: {
          type: Date,
          default: null,
        },
        category: {
          type: String,
          required: true,
          enum: [
            "dining",
            "shopping",
            "entertainment",
            "travel",
            "education",
            "health",
            "services",
            "other",
          ],
        },
        termsAndConditions: {
          type: String,
          required: true,
        },
      },
    ],
    achievements: [
      {
        title: {
          type: String,
          required: true,
        },
        description: {
          type: String,
          required: true,
        },
        earnedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    volunteerLevel: {
      type: Number,
      default: 1,
      min: 1,
      max: 5,
    },
    totalVolunteerHours: {
      type: Number,
      default: 0,
      min: 0,
    },
    badgesEarned: [
      {
        title: {
          type: String,
          required: true,
        },
        description: {
          type: String,
          required: true,
        },
        icon: {
          type: String,
          default: null,
        },
        earnedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.calculateVolunteerLevel = function () {
  const totalCredits = this.credits.total;

  if (totalCredits < 50) return 1;
  if (totalCredits < 100) return 2;
  if (totalCredits < 250) return 3;
  if (totalCredits < 500) return 4;
  return 5;
};

userSchema.methods.addCredits = function (
  eventId,
  eventTitle,
  actionTitle,
  credits
) {
  this.credits.total += credits;
  this.credits.history.push({
    eventId,
    eventTitle,
    actionTitle,
    creditsEarned: credits,
    earnedAt: new Date(),
  });

  this.volunteerLevel = this.calculateVolunteerLevel();
  return this;
};

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.redeemReward = function (reward) {
  const hasRedeemed = this.redeemedRewards.some(
    (r) => r.rewardId.toString() === reward._id.toString()
  );

  if (hasRedeemed) {
    throw new Error("You have already redeemed this reward");
  }

  if (this.credits.total < reward.creditCost) {
    throw new Error("Insufficient credits");
  }

  this.credits.total -= reward.creditCost;

  this.redeemedRewards.push({
    rewardId: reward._id,
    rewardTitle: reward.title,
    description: reward.description,
    type: reward.type,
    partnerName: reward.partnerName,
    redemptionCode: reward.redemptionCode,
    instructions: reward.redemptionInstructions,
    creditCost: reward.creditCost,
    validUntil: reward.validUntil,
    category: reward.category,
    termsAndConditions: reward.termsAndConditions,
  });

  return this;
};

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
