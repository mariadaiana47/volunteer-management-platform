import dbConnection from "@/lib/dbConnection";
import User from "@/lib/models/User";
import Reward from "@/lib/models/Reward";
import { verifyToken } from "@/lib/auth";
import { Types } from "mongoose";

function generateRedemptionCode(type) {
  const prefix =
    {
      discount: "DSC",
      voucher: "VCH",
      product: "PRD",
      service: "SRV",
    }[type] || "REW";

  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export default async function handler(req, res) {
  console.log("Starting redemption process");

  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, message: "Method not allowed" });
  }

  try {
    await dbConnection();
    console.log("Database connected");

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res
        .status(401)
        .json({ success: false, message: "No token provided" });
    }

    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;

    const decoded = verifyToken(token);
    console.log("Token decoded:", decoded);

    if (!decoded || !decoded.id) {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    const { rewardId } = req.body;
    console.log("Reward ID:", rewardId);

    if (!rewardId) {
      return res.status(400).json({
        success: false,
        message: "Reward ID is required",
      });
    }

    const user = await User.findById(decoded.id);
    console.log("User found:", user ? user._id : "No user");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    let reward;
    if (["1", "2", "3"].includes(rewardId)) {
      const defaultRewards = {
        1: {
          _id: new Types.ObjectId(),
          title: "20% Off at Starbucks",
          description: "Get 20% off on any beverage",
          partnerName: "Starbucks",
          creditCost: 15,
          type: "discount",
          category: "dining",
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          termsAndConditions:
            "Valid for one-time use. Cannot be combined with other offers.",
          redemptionInstructions:
            "Show this code at any Starbucks location when ordering.",
        },
        2: {
          _id: new Types.ObjectId(),
          title: "Cinema City Voucher",
          description: "Free movie ticket at any Cinema City location",
          partnerName: "Cinema City",
          creditCost: 25,
          type: "voucher",
          category: "entertainment",
          validUntil: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
          termsAndConditions:
            "Valid for any 2D movie. Additional charges apply for 3D and special screenings.",
          redemptionInstructions:
            "Present this code at the Cinema City box office.",
        },
        3: {
          _id: new Types.ObjectId(),
          title: "H&M Gift Card",
          description: "50 RON Gift Card for H&M stores",
          partnerName: "H&M",
          creditCost: 40,
          type: "product",
          category: "shopping",
          validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          termsAndConditions:
            "Valid at all H&M locations in Romania. No cash value.",
          redemptionInstructions: "Show this code at H&M checkout counter.",
        },
      };
      reward = defaultRewards[rewardId];
      console.log("Using default reward:", reward.title);
    } else {
      reward = await Reward.findById(rewardId);
      console.log(
        "Found database reward:",
        reward ? reward.title : "No reward"
      );
    }

    if (!reward) {
      return res.status(404).json({
        success: false,
        message: "Reward not found",
      });
    }

    if (user.credits.total < reward.creditCost) {
      return res.status(400).json({
        success: false,
        message: "Insufficient credits",
      });
    }

    const redemptionCode = generateRedemptionCode(reward.type);
    console.log("Generated code:", redemptionCode);

    user.redeemedRewards.push({
      rewardId: reward._id,
      rewardTitle: reward.title,
      description: reward.description,
      type: reward.type,
      partnerName: reward.partnerName,
      redemptionCode: redemptionCode,
      instructions: reward.redemptionInstructions,
      creditCost: reward.creditCost,
      status: "active",
      validUntil: reward.validUntil,
      category: reward.category,
      termsAndConditions: reward.termsAndConditions,
    });

    user.credits.total -= reward.creditCost;

    await user.save();
    console.log("User updated successfully");

    return res.status(200).json({
      success: true,
      message: "Reward redeemed successfully",
      data: {
        remainingCredits: user.credits.total,
        reward: {
          title: reward.title,
          type: reward.type,
          partnerName: reward.partnerName,
          redemptionCode: redemptionCode,
          instructions: reward.redemptionInstructions,
          validUntil: reward.validUntil,
          termsAndConditions: reward.termsAndConditions,
        },
      },
    });
  } catch (error) {
    console.error("Redemption error:", {
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to redeem reward",
      error: error.message,
    });
  }
}
