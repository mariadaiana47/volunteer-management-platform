import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import CreditsAndRewards from "@/components/CreditsAndRewards";
import { CheckCircle } from "lucide-react";
import EventChatComponent from "@/components/ui/EventChatComponent";
import {
  Calendar,
  Users,
  MapPin,
  Star,
  UserCircle,
  Camera,
} from "lucide-react";
import { useRouter } from "next/router";
import { jwtDecode } from "jwt-decode";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Swal from "sweetalert2";

const VolunteerDashboard = () => {
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("available");
  const [filters, setFilters] = useState({
    location: "",
    type: "",
  });
  const [profile, setProfile] = useState({
    nume: "",
    prenume: "",
    email: "",
    dataNastere: "",
    adresa: "",
    interese: "",
    avatar: null,
  });

  const refreshUserSession = async () => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) {
        throw new Error("No refresh token available");
      }

      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error("Failed to refresh token");
      }

      const data = await response.json();
      localStorage.setItem("authToken", data.token);
      return data.token;
    } catch (error) {
      console.error("Error refreshing session:", error);
      return null;
    }
  };

  const validateToken = useCallback(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      return null;
    }

    try {
      const cleanToken = token.replace(/^["']|["']$/g, "");

      const decoded = jwtDecode(cleanToken);
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
  }, []);

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({
        title: "Error",
        text: "Image size should be less than 5MB",
        icon: "error",
        timer: 2000,
      });
      return;
    }

    if (!file.type.startsWith("image/")) {
      Swal.fire({
        title: "Error",
        text: "Please upload an image file",
        icon: "error",
        timer: 2000,
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const validToken = validateToken();
      if (!validToken) {
        router.push("/auth/login");
        return;
      }

      const response = await fetch("/api/user/avatar", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${validToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload avatar");
      }

      const data = await response.json();

      if (data.success) {
        setProfile((prev) => ({
          ...prev,
          avatar: data.avatarUrl,
        }));

        await Swal.fire({
          title: "Success!",
          text: "Profile photo updated successfully",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
      }
    } catch (error) {
      console.error("Error uploading avatar:", error);
      Swal.fire({
        title: "Error!",
        text: error.message || "Failed to upload profile photo",
        icon: "error",
        timer: 2000,
      });
    }
  };

  const fetchProfile = async () => {
    try {
      const validToken = validateToken();
      if (!validToken) {
        router.push("/auth/login");
        return;
      }

      const response = await fetch("/api/user/profile", {
        headers: {
          Authorization: `Bearer ${validToken}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        console.error("Profile fetch error:", data);
        return;
      }

      const data = await response.json();
      if (data.success && data.user) {
        setProfile({
          nume: data.user.nume || "",
          prenume: data.user.prenume || "",
          email: data.user.email || "",
          dataNastere: data.user.dataNastere
            ? new Date(data.user.dataNastere).toISOString().split("T")[0]
            : "",
          adresa: data.user.adresa || "",
          interese: data.user.interese || "",
          avatar: data.user.avatar || null,
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    try {
      const validToken = validateToken();
      if (!validToken) {
        router.push("/auth/login");
        return;
      }

      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${validToken}`,
        },
        body: JSON.stringify(profile),
      });

      if (!response.ok) throw new Error("Failed to update profile");

      await Swal.fire({
        title: "Success!",
        text: "Profile updated successfully!",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      Swal.fire({
        title: "Error!",
        text: error.message || "Failed to update profile",
        icon: "error",
        timer: 2000,
      });
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

  const handleApplyRequest = async (eventId) => {
    try {
      const validToken = validateToken();
      if (!validToken) {
        throw new Error("No valid authentication token found");
      }

      const decodedToken = jwtDecode(validToken);
      const requestData = {
        eventId,
        volunteerId: decodedToken.id,
        timestamp: new Date().toISOString(),
      };

      const response = await fetch("/api/events/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${validToken}`,
        },
        body: JSON.stringify(requestData),
      });

      const responseData = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          await Swal.fire({
            title: "Already Applied",
            text:
              responseData.message || "You have already applied to this event",
            icon: "info",
          });
          return;
        }
        throw new Error(responseData.message || "Failed to submit application");
      }

      setEvents((prevEvents) =>
        prevEvents.map((event) => {
          if (event._id === eventId) {
            const newRequest = {
              _id: responseData.request._id,
              volunteerId: decodedToken.id,
              volunteerName: `${decodedToken.name}`,
              status: "pending",
              appliedAt: new Date(),
            };
            return {
              ...event,
              requests: [...(event.requests || []), newRequest],
              remainingSlots:
                event.remainingSlots > 0 ? event.remainingSlots - 1 : 0,
            };
          }
          return event;
        })
      );

      setFilteredEvents((prevEvents) =>
        prevEvents.map((event) => {
          if (event._id === eventId) {
            const newRequest = {
              _id: responseData.request._id,
              volunteerId: decodedToken.id,
              volunteerName: `${decodedToken.name}`,
              status: "pending",
              appliedAt: new Date(),
            };
            return {
              ...event,
              requests: [...(event.requests || []), newRequest],
              remainingSlots:
                event.remainingSlots > 0 ? event.remainingSlots - 1 : 0,
            };
          }
          return event;
        })
      );

      await Swal.fire({
        title: "Success!",
        text: "Application submitted successfully!",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Application error:", error);
      await Swal.fire({
        title: "Application Error",
        text:
          error.message || "There was a problem submitting your application.",
        icon: "error",
      });

      if (
        error.message.includes("authentication") ||
        error.message.includes("token")
      ) {
        localStorage.removeItem("authToken");
        localStorage.removeItem("userRole");
        router.push("/auth/login");
      }
    }
  };

  const handleApplyToAction = async (eventId, actionId) => {
    try {
      const validToken = validateToken();
      if (!validToken) {
        router.push("/auth/login");
        return;
      }

      const response = await fetch(
        `/api/events/${eventId}/actions/${actionId}/apply`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${validToken}`,
          },
        }
      );
      const data = await response.json();
      if (data.success) {
        await Swal.fire({
          title: "Success!",
          text: "You've successfully applied to this action",
          icon: "success",
        });
        await fetchEvents();
      } else {
        await Swal.fire({
          title: "Error",
          text: data.message,
          icon: "error",
        });
      }
    } catch (error) {
      console.error("Error applying to action:", error);
      await Swal.fire({
        title: "Error",
        text: "Failed to apply to the action",
        icon: "error",
      });
    }
  };

  const handleClaimCredits = async (eventId) => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        router.push("/auth/login");
        return;
      }

      const response = await fetch(`/api/events/${eventId}/claim-credits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        await Swal.fire({
          title: "Credits Claimed!",
          text: `You have successfully claimed ${data.credits} credits for this event.`,
          icon: "success",
        });

        setEvents((prevEvents) =>
          prevEvents.map((event) =>
            event._id === eventId
              ? { ...event, creditsHaveBeenClaimed: true }
              : event
          )
        );

        setFilteredEvents((prevEvents) =>
          prevEvents.map((event) =>
            event._id === eventId
              ? { ...event, creditsHaveBeenClaimed: true }
              : event
          )
        );
      } else {
        await Swal.fire({
          title: "Error",
          text: data.message || "Failed to claim credits",
          icon: "error",
        });
      }
    } catch (error) {
      console.error("Error claiming credits:", error);
      await Swal.fire({
        title: "Error",
        text: "An unexpected error occurred",
        icon: "error",
      });
    }
  };

  const getUserApplications = () => {
    const token = localStorage.getItem("authToken");
    if (!token) return [];

    try {
      const decoded = jwtDecode(token);
      const userId = decoded.id;

      return events.filter((event) =>
        event.requests?.some(
          (request) => request.volunteerId?.toString() === userId.toString()
        )
      );
    } catch (error) {
      console.error("Error getting user applications:", error);
      return [];
    }
  };

  useEffect(() => {
    const validToken = validateToken();
    if (!validToken) {
      router.push("/auth/login");
      return;
    }
    fetchProfile();
    fetchEvents();
  }, []);

  useEffect(() => {
    const filterEvents = () => {
      let filtered = events;
      if (filters.location) {
        filtered = filtered.filter((event) =>
          event.location.toLowerCase().includes(filters.location.toLowerCase())
        );
      }
      if (filters.type) {
        filtered = filtered.filter((event) => event.category === filters.type);
      }
      setFilteredEvents(filtered);
    };
    filterEvents();
  }, [filters, events]);

  if (loading) {
    return <div className="text-center py-4">Loading events...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center py-4">{error}</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Volunteer Dashboard</h1>
        <Button
          onClick={() => {
            localStorage.removeItem("authToken");
            localStorage.removeItem("userRole");
            router.push("/auth/login");
          }}
          variant="outline"
          className="bg-red-500 text-white hover:bg-red-600"
        >
          Logout
        </Button>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="available">Available Events</TabsTrigger>
          <TabsTrigger value="applications">My Applications</TabsTrigger>
          <TabsTrigger value="profile">My Profile</TabsTrigger>
          <TabsTrigger value="chat">Event Chat</TabsTrigger>
          <TabsTrigger value="credits">Credits & Rewards</TabsTrigger>
        </TabsList>

        <TabsContent value="available">
          <div className="space-y-4 mb-6">
            <Input
              placeholder="Filter by Location"
              value={filters.location}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, location: e.target.value }))
              }
            />
            <select
              value={filters.type}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, type: e.target.value }))
              }
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Event Types</option>
              <option value="Environmental">Environmental</option>
              <option value="Education">Education</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Social">Social</option>
              <option value="Cultural">Cultural</option>
              <option value="Sports">Sports</option>
              <option value="Tech">Tech</option>
              <option value="Community Development">
                Community Development
              </option>
              <option value="Animal Welfare">Animal Welfare</option>
              <option value="Disaster Relief">Disaster Relief</option>
            </select>
          </div>

          <div className="space-y-4">
            {filteredEvents.map((event) => (
              <Card key={event._id} className="mb-4">
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    {event.title}
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                      {event.category}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(event.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{event.location}</span>
                      </div>
                    </div>

                    <p className="text-gray-600">{event.description}</p>

                    <div className="flex items-center gap-4">
                      {event.credits && (
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4" />
                          <span>{event.credits} credits</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>
                          {event.maxParticipants
                            ? `${event.remainingSlots}/${event.maxParticipants} spots`
                            : "Unlimited spots"}
                        </span>
                      </div>
                    </div>

                    {/* Completed Event Section */}
                    {event.status === "completed" && (
                      <div className="w-full p-4 bg-green-100 text-green-800 rounded-lg flex items-center justify-between">
                        <div className="flex items-center">
                          <CheckCircle className="w-6 h-6 mr-3" />
                          <span className="font-bold text-lg">
                            Event Completed
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Star className="w-5 h-5 text-yellow-500" />
                          <span className="text-md font-semibold">
                            {event.credits} Credits
                          </span>
                          <Button
                            onClick={() => handleClaimCredits(event._id)}
                            disabled={event.creditsHaveBeenClaimed}
                            className="ml-4 bg-white text-green-600 hover:bg-gray-100"
                          >
                            {event.creditsHaveBeenClaimed
                              ? "Credits Claimed"
                              : "Claim Credits"}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Apply to Event Button */}
                    {event.status !== "completed" && (
                      <Button
                        onClick={() => handleApplyRequest(event._id)}
                        className="w-full mt-4"
                        disabled={event.requests?.some((request) => {
                          const token = localStorage.getItem("authToken");
                          try {
                            const decoded = jwtDecode(token);
                            return (
                              request.volunteerId?.toString() ===
                              decoded.id.toString()
                            );
                          } catch {
                            return false;
                          }
                        })}
                        variant={
                          event.requests?.some((request) => {
                            const token = localStorage.getItem("authToken");
                            try {
                              const decoded = jwtDecode(token);
                              return (
                                request.volunteerId?.toString() ===
                                decoded.id.toString()
                              );
                            } catch {
                              return false;
                            }
                          })
                            ? "outline"
                            : "default"
                        }
                      >
                        {event.requests?.some((request) => {
                          const token = localStorage.getItem("authToken");
                          try {
                            const decoded = jwtDecode(token);
                            return (
                              request.volunteerId?.toString() ===
                              decoded.id.toString()
                            );
                          } catch {
                            return false;
                          }
                        })
                          ? "Already Applied"
                          : "Apply to Event"}
                      </Button>
                    )}

                    {/* Event Actions */}
                    {event.actions && event.actions.length > 0 && (
                      <div className="mt-6 border-t pt-4">
                        <h4 className="text-lg font-semibold mb-4">
                          Event Actions
                        </h4>
                        <div className="space-y-4">
                          {event.actions.map((action) => (
                            <div
                              key={action._id}
                              className="border rounded-lg p-4 bg-gray-50"
                            >
                              <div className="flex justify-between items-center mb-2">
                                <h5 className="font-medium text-lg">
                                  {action.title}
                                </h5>
                                <div className="flex items-center gap-2">
                                  <Star className="w-4 h-4 text-yellow-500" />
                                  <span>{action.credits} credits</span>
                                </div>
                              </div>

                              <p className="text-gray-600 mb-4">
                                {action.description}
                              </p>

                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <Users className="w-4 h-4" />
                                  <span>
                                    {action.currentVolunteers}/
                                    {action.requiredVolunteers} volunteers
                                  </span>
                                </div>

                                <Button
                                  onClick={() =>
                                    handleApplyToAction(event._id, action._id)
                                  }
                                  variant="outline"
                                  disabled={
                                    action.status !== "open" ||
                                    action.assignedVolunteers.some(
                                      (vol) => vol.volunteerId === decoded.id
                                    )
                                  }
                                >
                                  {action.status === "full"
                                    ? "Action Full"
                                    : action.assignedVolunteers.some(
                                        (vol) => vol.volunteerId === decoded.id
                                      )
                                    ? "Already Applied"
                                    : "Apply to Action"}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="applications">
          <h2 className="text-2xl font-bold mb-4">My Applications</h2>
          <div className="space-y-4">
            {getUserApplications().map((event) => {
              const token = localStorage.getItem("authToken");
              let myRequests = [];

              try {
                const decoded = jwtDecode(token);
                myRequests = event.requests.filter(
                  (request) =>
                    request.volunteerId?.toString() === decoded.id.toString()
                );
              } catch (error) {
                console.error("Error decoding token:", error);
              }

              return myRequests.map((request) => (
                <Card key={`${event._id}-${request._id}`}>
                  <CardHeader>
                    <CardTitle>{event.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(event.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{event.location}</span>
                      </div>
                      <div className="mt-2">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            request.status === "approved"
                              ? "bg-green-100 text-green-800"
                              : request.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          Status:{" "}
                          {request.status.charAt(0).toUpperCase() +
                            request.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-gray-600">{event.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ));
            })}

            {getUserApplications().length === 0 && (
              <p className="text-center text-gray-500">
                You haven't applied to any events yet.
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>My Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={updateProfile} className="space-y-6">
                <div className="flex flex-col items-center gap-4">
                  <Avatar className="w-32 h-32">
                    {profile.avatar ? (
                      <AvatarImage
                        src={profile.avatar}
                        alt="Profile picture"
                        className="object-cover"
                      />
                    ) : (
                      <AvatarFallback>
                        <UserCircle className="w-20 h-20" />
                      </AvatarFallback>
                    )}
                  </Avatar>

                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="avatar-upload"
                      className="flex items-center gap-2 cursor-pointer bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                    >
                      <Camera className="w-4 h-4" />
                      Upload Photo
                    </label>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">First Name</label>
                    <Input
                      value={profile.nume}
                      onChange={(e) =>
                        setProfile((prev) => ({
                          ...prev,
                          nume: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Last Name</label>
                    <Input
                      value={profile.prenume}
                      onChange={(e) =>
                        setProfile((prev) => ({
                          ...prev,
                          prenume: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      value={profile.email}
                      onChange={(e) =>
                        setProfile((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Birth Date</label>
                    <Input
                      type="date"
                      value={profile.dataNastere}
                      onChange={(e) =>
                        setProfile((prev) => ({
                          ...prev,
                          dataNastere: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">Address</label>
                    <Input
                      value={profile.adresa}
                      onChange={(e) =>
                        setProfile((prev) => ({
                          ...prev,
                          adresa: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">Interests</label>
                    <Textarea
                      value={profile.interese}
                      onChange={(e) =>
                        setProfile((prev) => ({
                          ...prev,
                          interese: e.target.value,
                        }))
                      }
                      placeholder="Tell us about your interests..."
                      rows={4}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full">
                  Update Profile
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chat">
          <EventChatComponent />
        </TabsContent>

        <TabsContent value="credits">
          <CreditsAndRewards />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VolunteerDashboard;
