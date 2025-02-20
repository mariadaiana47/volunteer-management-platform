import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  MessageCircle,
  Users,
  FileText,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const POLLING_INTERVAL = 5000;

const EventChatComponent = () => {
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(() =>
    localStorage.getItem("userRole")
  );
  const [activeTab, setActiveTab] = useState("chat");
  const [activeApplicationTab, setActiveApplicationTab] = useState("pending");
  const [volunteerApplications, setVolunteerApplications] = useState([]);
  const [isApplicationDialogOpen, setIsApplicationDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  const fetchProfile = useCallback(async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        router.push("/auth/login");
        return null;
      }

      const response = await fetch("/api/user/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data?.success && data.user) {
        setCurrentUser(data.user);
        const role = localStorage.getItem("userRole");
        setUserRole(role);
        console.log("User role set to:", role);
        return data.user;
      }
    } catch (error) {
      console.error("Profile fetch error:", error);
      setError("Failed to load profile");
    }
  }, [router]);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) {
        router.push("/auth/login");
        return;
      }

      const endpoint =
        userRole === "company"
          ? "/api/events/company"
          : "/api/events/volunteer-chat";

      console.log("Fetching events from:", endpoint);
      console.log("User role:", userRole);

      const response = await fetch(endpoint, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error response:", errorData);
        throw new Error(
          errorData.message || `Request failed with status ${response.status}`
        );
      }

      const data = await response.json();
      console.log("Received events data:", data);

      if (data?.success) {
        setEvents(data.events || []);
        if (data.events?.length > 0 && !selectedEvent) {
          setSelectedEvent(data.events[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching events:", error);
      setError(error.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, [selectedEvent, userRole, router]);

  const getProcessedToken = useCallback(() => {
    try {
      const rawToken = localStorage.getItem("authToken");
      if (!rawToken) {
        console.error("No token found in localStorage");
        return null;
      }

      let token = rawToken.replace(/^["']|["']$/g, "").trim();
      return token && token.length >= 10 ? token : null;
    } catch (error) {
      console.error("Token processing error:", error);
      return null;
    }
  }, []);

  const fetchEventMessages = useCallback(
    async (eventId) => {
      if (!eventId) return;

      try {
        const response = await fetch(`/api/events/${eventId}/messages`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getProcessedToken()}`,
          },
        });

        console.log("Fetch Messages Response:", {
          status: response.status,
          statusText: response.statusText,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Error response body:", errorText);

          if (response.status === 404) {
            setMessages([]);
            return;
          }

          throw new Error(
            `Request failed with status ${response.status}: ${errorText}`
          );
        }

        const data = await response.json();

        if (data?.success) {
          setMessages(data.messages || []);
        } else {
          console.error("Messages fetch was not successful:", data);
          setMessages([]);
        }
      } catch (error) {
        console.error("Error fetching messages:", error);

        setError(`Failed to load messages: ${error.message}`);

        setMessages([]);
      }
    },
    [getProcessedToken]
  );

  const fetchVolunteerApplications = useCallback(async (eventId) => {
    if (!eventId) return;

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`/api/events/${eventId}/applications`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 404) {
        setVolunteerApplications([]);
        return;
      }

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();
      if (data?.success) {
        setVolunteerApplications(
          data.applications.map((app) => ({
            ...app,
            status: app.status.toLowerCase(),
          }))
        );
      } else {
        setVolunteerApplications([]);
      }
    } catch (error) {
      console.error("Error fetching applications:", error);
      if (!error.message.includes("404")) {
        setError("Failed to load applications");
      }
      setVolunteerApplications([]);
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      await fetchProfile();
      await fetchEvents();
    };
    initialize();
  }, [fetchProfile, fetchEvents]);

  useEffect(() => {
    if (selectedEvent) {
      fetchVolunteerApplications(selectedEvent._id);
    }
  }, [selectedEvent, fetchVolunteerApplications]);

  useEffect(() => {
    let chatInterval;

    if (selectedEvent?._id) {
      fetchEventMessages(selectedEvent._id);
      chatInterval = setInterval(() => {
        fetchEventMessages(selectedEvent._id);
      }, POLLING_INTERVAL);
    }

    return () => {
      if (chatInterval) {
        clearInterval(chatInterval);
      }
    };
  }, [selectedEvent, fetchEventMessages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedEvent?._id) return;

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `/api/events/${selectedEvent._id}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            content: newMessage.trim(),
            eventId: selectedEvent._id,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const data = await response.json();
      if (data?.success) {
        setMessages((prev) => [
          ...prev,
          {
            _id: Date.now().toString(),
            content: newMessage,
            senderId: currentUser._id,
            senderName: `${currentUser.nume} ${currentUser.prenume}`,
            timestamp: new Date().toISOString(),
            eventId: selectedEvent._id,
          },
        ]);
        setNewMessage("");
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setError("Failed to send message");
    }
  };

  const handleApplicationAction = async (applicationId, status) => {
    try {
      const token = localStorage.getItem("authToken");

      const url = `/api/events/${selectedEvent._id}/applications/${applicationId}`;

      console.log("Making request to:", url, {
        applicationId,
        status,
        eventId: selectedEvent._id,
      });

      const response = await fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(`Expected JSON response but got ${contentType}`);
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update application");
      }

      if (data.success) {
        setVolunteerApplications((prev) =>
          prev.map((app) =>
            app._id === applicationId ? { ...app, status } : app
          )
        );
        await fetchVolunteerApplications(selectedEvent._id);
        setIsApplicationDialogOpen(false);
        setError(null);
      }
    } catch (error) {
      console.error("Error updating application:", error);
      setError(`Failed to update application: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4 p-6">
      {error && (
        <div className="col-span-3 bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-4">
          {error}
        </div>
      )}

      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>My Events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[70vh] overflow-y-auto">
          {events.map((event) => (
            <div
              key={event._id}
              onClick={() => {
                setSelectedEvent(event);
                setActiveTab("chat");
                setError(null);
              }}
              className={`cursor-pointer p-3 rounded-lg ${
                selectedEvent?._id === event._id
                  ? "bg-blue-100 border-blue-300"
                  : "hover:bg-gray-100"
              } border`}
            >
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">{event.title}</h3>
                <span>👥</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                <span>📅</span>
                {new Date(event.date).toLocaleDateString()}
                <span>📍</span>
                {event.location}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="col-span-2">
        {selectedEvent ? (
          <>
            <CardHeader className="border-b">
              <div className="flex justify-between items-center">
                <CardTitle>{selectedEvent.title}</CardTitle>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>📅</span>
                  {new Date(selectedEvent.date).toLocaleDateString()}
                  <span>📍</span>
                  {selectedEvent.location}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="chat">💬 Chat</TabsTrigger>
                  {userRole === "company" && (
                    <TabsTrigger value="applications">
                      📝 Applications
                    </TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="chat">
                  <div className="h-[60vh] overflow-y-auto space-y-4 mb-4 mt-4">
                    {messages.map((message) => (
                      <div
                        key={message._id}
                        className={`flex items-center ${
                          message.senderId === currentUser?._id
                            ? "justify-end"
                            : "justify-start"
                        } gap-2`}
                      >
                        {message.senderId !== currentUser?._id && (
                          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                            <img
                              src={
                                message.senderAvatar || "/default-avatar.png"
                              }
                              alt={message.senderName}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div
                          className={`max-w-[70%] p-3 rounded-lg ${
                            message.senderId === currentUser?._id
                              ? "bg-blue-500 text-white"
                              : "bg-gray-200 text-black"
                          }`}
                        >
                          <div className="text-sm font-semibold mb-1">
                            {message.senderName}
                          </div>
                          <div>{message.content}</div>
                          <div className="text-xs mt-1 opacity-70">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSendMessage();
                      }}
                      placeholder="Type your message..."
                      className="flex-grow"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                    >
                      Send 📤
                    </Button>
                  </div>
                </TabsContent>

                {userRole === "company" && (
                  <TabsContent value="applications" className="mt-4">
                    <div className="border-b pb-2">
                      <div className="flex space-x-4">
                        <button
                          className={`px-4 py-2 rounded-md ${
                            activeApplicationTab === "pending"
                              ? "bg-blue-100 text-blue-800"
                              : "text-gray-600 hover:bg-gray-100"
                          }`}
                          onClick={() => setActiveApplicationTab("pending")}
                        >
                          Applications
                        </button>
                        <button
                          className={`px-4 py-2 rounded-md ${
                            activeApplicationTab === "participants"
                              ? "bg-blue-100 text-blue-800"
                              : "text-gray-600 hover:bg-gray-100"
                          }`}
                          onClick={() =>
                            setActiveApplicationTab("participants")
                          }
                        >
                          Participants
                        </button>
                      </div>
                    </div>

                    {activeApplicationTab === "pending" && (
                      <div className="space-y-2">
                        {volunteerApplications
                          .filter(
                            (app) => app.status.toLowerCase() === "pending"
                          )
                          .map((application) => (
                            <div
                              key={application._id}
                              className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                              onClick={() => {
                                setSelectedApplication(application);
                                setIsApplicationDialogOpen(true);
                              }}
                            >
                              <div>
                                <div className="font-semibold">
                                  {application.volunteerName}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {application.email}
                                </div>
                              </div>
                              <div
                                className={`
                                px-2 py-1 rounded-full text-xs font-medium 
                                ${
                                  application.status === "pending"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : application.status === "approved"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }
                              `}
                              >
                                {application.status}
                              </div>
                            </div>
                          ))}

                        {volunteerApplications.filter(
                          (app) => app.status === "pending"
                        ).length === 0 && (
                          <div className="text-center py-8 text-gray-500">
                            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                            <p>No pending applications</p>
                          </div>
                        )}
                      </div>
                    )}

                    {activeApplicationTab === "participants" && (
                      <div className="space-y-2">
                        {volunteerApplications
                          .filter(
                            (app) => app.status.toLowerCase() === "approved"
                          )
                          .map((participant) => (
                            <div
                              key={participant._id}
                              className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50"
                            >
                              <div>
                                <div className="font-semibold">
                                  {participant.volunteerName}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {participant.email}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                                  Approved
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    console.log(
                                      "Chat with participant",
                                      participant
                                    );
                                  }}
                                >
                                  <MessageCircle className="w-4 h-4 mr-2" />{" "}
                                  Chat
                                </Button>
                              </div>
                            </div>
                          ))}

                        {volunteerApplications.filter(
                          (app) => app.status.toLowerCase() === "approved"
                        ).length === 0 && (
                          <div className="text-center py-8 text-gray-500">
                            <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                            <p>No participants yet</p>
                          </div>
                        )}
                      </div>
                    )}
                  </TabsContent>
                )}
              </Tabs>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>Select an event to start chatting</p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Application Details Dialog */}
      {userRole === "company" && (
        <Dialog
          open={isApplicationDialogOpen}
          onOpenChange={setIsApplicationDialogOpen}
        >
          <DialogContent className="sm:max-w-[600px]">
            {selectedApplication && (
              <>
                <DialogHeader>
                  <DialogTitle>Volunteer Application Details</DialogTitle>
                  <DialogDescription>
                    Review and manage the volunteer application
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label className="text-right font-medium">Name</label>
                    <span className="col-span-3">
                      {selectedApplication.volunteerName}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <label className="text-right font-medium">Email</label>
                    <span className="col-span-3">
                      {selectedApplication.email}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <label className="text-right font-medium">Phone</label>
                    <span className="col-span-3">
                      {selectedApplication.phone || "N/A"}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <label className="text-right font-medium">Motivation</label>
                    <p className="col-span-3 text-gray-600 italic">
                      {selectedApplication.motivation ||
                        "No motivation provided"}
                    </p>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <label className="text-right font-medium">
                      Current Status
                    </label>
                    <span
                      className={`col-span-3 px-2 py-1 rounded-full text-xs font-medium 
                        ${
                          selectedApplication.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : selectedApplication.status === "approved"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }
                      `}
                    >
                      {selectedApplication.status}
                    </span>
                  </div>
                </div>

                {selectedApplication.status === "pending" && (
                  <div className="flex justify-end gap-4 mt-4">
                    <Button
                      variant="destructive"
                      onClick={() =>
                        handleApplicationAction(
                          selectedApplication._id,
                          "rejected"
                        )
                      }
                    >
                      <XCircle className="w-4 h-4 mr-2" /> Reject
                    </Button>
                    <Button
                      variant="default"
                      onClick={() =>
                        handleApplicationAction(
                          selectedApplication._id,
                          "approved"
                        )
                      }
                    >
                      <CheckCircle className="w-4 h-4 mr-2" /> Approve
                    </Button>
                  </div>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default EventChatComponent;
