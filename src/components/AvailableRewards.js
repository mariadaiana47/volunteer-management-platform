import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, Coffee, ShoppingBag, Tag, AlertCircle } from "lucide-react";
import Swal from "sweetalert2";

const AvailableRewards = ({ userCredits, onRedeemReward }) => {
  const rewards = [
    {
      id: 1,
      title: "20% Off at Starbucks",
      partnerName: "Starbucks",
      description: "Get 20% off on any beverage",
      creditCost: 15,
      type: "discount",
      icon: <Coffee className="w-6 h-6" />,
    },
    {
      id: 2,
      title: "Cinema City Voucher",
      partnerName: "Cinema City",
      description: "Free movie ticket at any Cinema City location",
      creditCost: 25,
      type: "voucher",
      icon: <Tag className="w-6 h-6" />,
    },
    {
      id: 3,
      title: "H&M Gift Card",
      partnerName: "H&M",
      description: "50 RON Gift Card for H&M stores",
      creditCost: 40,
      type: "product",
      icon: <ShoppingBag className="w-6 h-6" />,
    },
  ];

  const handleRedeemAttempt = async (reward) => {
    if (userCredits < reward.creditCost) {
      await Swal.fire({
        title: "Insufficient Credits",
        text: `You need ${reward.creditCost} credits to redeem this reward. Keep participating in events to earn more credits!`,
        icon: "warning",
      });
      return;
    }

    const result = await Swal.fire({
      title: "Redeem Reward",
      text: `Are you sure you want to redeem "${reward.title}" for ${reward.creditCost} credits?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, redeem now",
      cancelButtonText: "No, keep my credits",
    });

    if (result.isConfirmed) {
      try {
        await onRedeemReward(reward);
        await Swal.fire({
          title: "Success!",
          text: "Your reward has been redeemed successfully. Check your email for details!",
          icon: "success",
        });
      } catch (error) {
        await Swal.fire({
          title: "Error",
          text: "Failed to redeem reward. Please try again.",
          icon: "error",
        });
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Available Rewards</h2>
        <div className="flex items-center space-x-2">
          <Gift className="w-5 h-5 text-yellow-500" />
          <span className="text-lg font-semibold">
            {userCredits} Credits Available
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rewards.map((reward) => (
          <Card key={reward.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{reward.title}</CardTitle>
                {reward.icon}
              </div>
              <p className="text-sm text-gray-500">{reward.partnerName}</p>
            </CardHeader>
            <CardContent>
              <p className="mb-4">{reward.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <Gift className="w-4 h-4 text-yellow-500" />
                  <span className="font-semibold">
                    {reward.creditCost} Credits
                  </span>
                </div>
                <Button
                  onClick={() => handleRedeemAttempt(reward)}
                  disabled={userCredits < reward.creditCost}
                  className={
                    userCredits >= reward.creditCost
                      ? "bg-green-500 hover:bg-green-600"
                      : "bg-gray-300"
                  }
                >
                  Redeem Now
                </Button>
              </div>
              {userCredits < reward.creditCost && (
                <div className="mt-2 flex items-center text-sm text-orange-500">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  <span>
                    Need {reward.creditCost - userCredits} more credits
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AvailableRewards;
