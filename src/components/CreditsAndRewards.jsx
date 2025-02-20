import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Gift, Coffee, ShoppingBag, Tag } from "lucide-react";
import { jwtDecode } from "jwt-decode";
import { useRouter } from "next/router";
import Swal from "sweetalert2";

const CreditsAndRewards = () => {
  const router = useRouter();
  const [userCredits, setUserCredits] = useState(0);
  const [availableRewards, setAvailableRewards] = useState([]);
  const [userRewards, setUserRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);

  const defaultRewards = [
    {
      _id: "1",
      title: "20% Off at Starbucks",
      description: "Get 20% off on any beverage",
      partnerName: "Starbucks",
      creditCost: 15,
      type: "discount",
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    {
      _id: "2",
      title: "Cinema City Voucher",
      description: "Free movie ticket at any Cinema City location",
      partnerName: "Cinema City",
      creditCost: 25,
      type: "voucher",
      validUntil: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
    },
    {
      _id: "3",
      title: "H&M Gift Card",
      description: "50 RON Gift Card for H&M stores",
      partnerName: "H&M",
      creditCost: 40,
      type: "product",
      validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    },
  ];

  const validateToken = () => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      return null;
    }

    try {
      const cleanToken = token.replace(/^["']|["']$/g, "");
      const decoded = jwtDecode(cleanToken);
      console.log("Decoded token:", decoded);

      const currentTime = Date.now() / 1000;
      if (decoded.exp < currentTime) {
        localStorage.removeItem("authToken");
        localStorage.removeItem("userRole");
        return null;
      }
      return cleanToken;
    } catch (error) {
      console.error("Token validation error:", error);
      localStorage.removeItem("authToken");
      localStorage.removeItem("userRole");
      return null;
    }
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const validToken = validateToken();
      if (!validToken) {
        throw new Error("Authentication required");
      }

      const decoded = jwtDecode(validToken);
      console.log("Making request with token:", {
        token: validToken,
        decoded: decoded,
      });

      const response = await fetch("/api/events", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${validToken}`,
        },
      });

      if (!response.ok) {
        let errorMessage = "Failed to fetch events";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          console.error("Error parsing error response:", e);
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      if (!data || !Array.isArray(data.events)) {
        throw new Error("Invalid response format from server");
      }

      const processedEvents = data.events.map((event) => ({
        ...event,
        date: new Date(event.date),
        requests: Array.isArray(event.requests) ? event.requests : [],
        actions: Array.isArray(event.actions) ? event.actions : [],
      }));

      setEvents(processedEvents);
      setFilteredEvents(processedEvents);
      setError(null);
    } catch (error) {
      console.error("Error fetching events:", error);
      setError(error.message || "Failed to load events");
      if (error.message.includes("Authentication required")) {
        router.push("/auth/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const getRewardIcon = (type) => {
    switch (type) {
      case "discount":
        return <Coffee className="w-6 h-6" />;
      case "voucher":
        return <Tag className="w-6 h-6" />;
      case "product":
        return <ShoppingBag className="w-6 h-6" />;
      case "service":
        return <Gift className="w-6 h-6" />;
      default:
        return <Gift className="w-6 h-6" />;
    }
  };

  const fetchCreditsAndRewards = async () => {
    try {
      const validToken = validateToken();
      if (!validToken) {
        router.push("/auth/login");
        return;
      }

      setLoading(true);

      const profileResponse = await fetch("/api/user/profile", {
        headers: {
          Authorization: `Bearer ${validToken}`,
        },
      });
      const profileData = await profileResponse.json();
      setUserCredits(profileData.user.credits?.total || 0);

      const rewardsResponse = await fetch("/api/rewards", {
        headers: {
          Authorization: `Bearer ${validToken}`,
        },
      });

      let rewardsData;
      try {
        rewardsData = await rewardsResponse.json();
      } catch (parseError) {
        console.warn("Failed to parse rewards response, using default rewards");
        rewardsData = { rewards: defaultRewards };
      }

      setAvailableRewards(
        rewardsData.rewards && rewardsData.rewards.length > 0
          ? rewardsData.rewards
          : defaultRewards
      );

      const userRewardsResponse = await fetch("/api/rewards/user", {
        headers: {
          Authorization: `Bearer ${validToken}`,
        },
      });
      const userRewardsData = await userRewardsResponse.json();
      setUserRewards(userRewardsData.rewards || []);
    } catch (error) {
      console.error("Failed to fetch credits and rewards", error);
      setAvailableRewards(defaultRewards);
      setUserCredits(0);

      if (!error.message.includes("Authentication required")) {
        await Swal.fire({
          icon: "warning",
          title: "Rewards Unavailable",
          text: "Could not retrieve credits and rewards. Showing sample rewards.",
        });
      }

      if (error.message.includes("Authentication required")) {
        router.push("/auth/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemReward = async (reward) => {
    let loadingAlert;
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        router.push("/auth/login");
        return;
      }

      if (userCredits < reward.creditCost) {
        await Swal.fire({
          title: "Insufficient Credits",
          text: `You need ${reward.creditCost} credits to redeem this reward. You currently have ${userCredits} credits.`,
          icon: "warning",
        });
        return;
      }

      loadingAlert = Swal.fire({
        title: "Processing...",
        text: "Redeeming your reward",
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const response = await fetch("/api/rewards/redeem", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rewardId: reward._id,
        }),
      });

      const data = await response.json();
      console.log("Redemption response:", data);

      if (loadingAlert) {
        await (await loadingAlert).close();
      }

      if (!response.ok) {
        throw new Error(
          data.message || data.error || "Failed to redeem reward"
        );
      }

      setUserCredits((prev) => prev - reward.creditCost);

      await Swal.fire({
        title: "Success!",
        text: "Reward redeemed successfully! Check your email for details.",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });

      await fetchCreditsAndRewards();
    } catch (error) {
      console.error("Redemption error:", error);

      if (loadingAlert) {
        await (await loadingAlert).close();
      }

      await Swal.fire({
        title: "Error",
        text: error.message || "Failed to redeem reward. Please try again.",
        icon: "error",
      });

      if (
        error.message.includes("token") ||
        error.message.includes("authentication")
      ) {
        localStorage.removeItem("authToken");
        router.push("/auth/login");
      }
    }
  };

  useEffect(() => {
    const initializePage = async () => {
      try {
        await Promise.all([fetchEvents(), fetchCreditsAndRewards()]);
      } catch (error) {
        console.error("Error initializing page:", error);
      }
    };

    initializePage();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-4">Loading credits and rewards...</div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center mb-6">
        <Star className="w-8 h-8 mr-2 text-yellow-500" />
        <h2 className="text-2xl font-bold">Credits and Rewards</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Credits Section */}
        <Card>
          <CardHeader>
            <CardTitle>Accumulated Credits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center text-4xl font-bold text-blue-600">
              {userCredits} <Star className="ml-2 w-8 h-8 text-yellow-500" />
            </div>
            <p className="text-center text-gray-600 mt-2">
              Continue participating in events to earn more credits!
            </p>
          </CardContent>
        </Card>

        {/* Available Rewards Section */}
        <Card>
          <CardHeader>
            <CardTitle>Available Rewards</CardTitle>
          </CardHeader>
          <CardContent>
            {availableRewards.length === 0 ? (
              <p className="text-center text-gray-500">
                No rewards available at the moment.
              </p>
            ) : (
              <div className="space-y-4">
                {availableRewards.map((reward) => (
                  <div
                    key={reward._id}
                    className="border p-4 rounded-lg flex justify-between items-center"
                  >
                    <div className="flex items-center space-x-4">
                      {getRewardIcon(reward.type)}
                      <div>
                        <h3 className="font-semibold">{reward.title}</h3>
                        <p className="text-sm text-gray-600">
                          {reward.description}
                        </p>
                        <div className="flex items-center mt-2">
                          <Star className="w-4 h-4 mr-1 text-yellow-500" />
                          <span>{reward.creditCost} credits</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          From {reward.partnerName}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Valid until{" "}
                          {new Date(reward.validUntil).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleRedeemReward(reward)}
                      disabled={userCredits < reward.creditCost}
                      variant={
                        userCredits >= reward.creditCost ? "default" : "outline"
                      }
                    >
                      {userCredits >= reward.creditCost
                        ? "Redeem"
                        : "Insufficient Credits"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* User's Redeemed Rewards Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>My Rewards</CardTitle>
        </CardHeader>
        <CardContent>
          {userRewards.length === 0 ? (
            <p className="text-center text-gray-500">
              You haven't redeemed any rewards yet.
            </p>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              {userRewards.map((reward) => (
                <div
                  key={reward._id}
                  className="border p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-center mb-4">
                    {getRewardIcon(reward.type)}
                  </div>
                  <h3 className="font-semibold text-center text-lg mb-2">
                    {reward.rewardTitle}
                  </h3>
                  <p className="text-sm text-gray-600 text-center mb-3">
                    {reward.description}
                  </p>
                  <div className="bg-gray-50 p-3 rounded-lg mb-3">
                    <p className="text-sm font-semibold text-center text-blue-600 mb-1">
                      Redemption Code:
                    </p>
                    <p className="text-lg font-mono text-center font-bold tracking-wider">
                      {reward.redemptionCode}
                    </p>
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p className="text-center font-medium text-gray-700">
                      How to use:
                    </p>
                    <p className="text-center">{reward.instructions}</p>
                    <div className="border-t mt-2 pt-2">
                      <p className="text-center">From {reward.partnerName}</p>
                      <p className="text-center">
                        Redeemed on{" "}
                        {new Date(reward.redeemedAt).toLocaleDateString()}
                      </p>
                      <p className="text-center text-yellow-600">
                        Valid until{" "}
                        {new Date(reward.validUntil).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CreditsAndRewards;
