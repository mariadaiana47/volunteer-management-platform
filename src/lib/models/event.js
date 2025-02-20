import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true,
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
    default: null,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: [
        "Environmental",
        "Education",
        "Healthcare",
        "Social",
        "Cultural",
        "Sports",
        "Tech",
        "Community Development",
        "Animal Welfare",
        "Disaster Relief",
        "Other",
      ],
      required: true,
      default: "Other",
    },
    coordinates: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        index: "2dsphere",
      },
    },
    credits: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxParticipants: {
      type: Number,
      default: 0,
      min: 0,
    },
    remainingSlots: {
      type: Number,
      default: function () {
        return this.maxParticipants;
      },
      min: 0,
    },
    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
    },
    actions: [
      {
        title: String,
        description: String,
        requiredVolunteers: Number,
        credits: Number,
        currentVolunteers: {
          type: Number,
          default: 0,
        },
        status: {
          type: String,
          enum: ["ongoing", "completed"],
          default: "ongoing",
        },
        assignedVolunteers: [
          {
            volunteerId: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
            },
            volunteerName: String,
            assignedAt: {
              type: Date,
              default: Date.now,
            },
          },
        ],
      },
    ],
    requests: [
      {
        _id: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          default: () => new mongoose.Types.ObjectId(),
        },
        volunteerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        volunteerName: {
          type: String,
          required: true,
        },
        status: {
          type: String,
          enum: ["pending", "approved", "rejected"],
          default: "pending",
        },
        appliedAt: {
          type: Date,
          default: Date.now,
        },
        actionId: {
          type: mongoose.Schema.Types.ObjectId,
          default: null,
        },
        processedAt: {
          type: Date,
          default: null,
        },
        processedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          default: null,
        },
      },
    ],
    creditsHaveBeenClaimed: {
      type: Boolean,
      default: false,
    },
    messages: [messageSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

eventSchema.index({ "messages.timestamp": 1 });
eventSchema.index({ "coordinates.coordinates": "2dsphere" });
eventSchema.index({
  title: "text",
  description: "text",
  location: "text",
  category: "text",
});

const Event = mongoose.models.Event || mongoose.model("Event", eventSchema);

export default Event;
