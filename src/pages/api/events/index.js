import dbConnection from "@/lib/dbConnection";
import Event from "@/lib/models/event";
import User from "@/lib/models/User";
import { verifyToken } from "@/lib/auth";

export default async function handler(req, res) {
  try {
    await dbConnection();

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "No authorization token provided",
      });
    }

    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    let user;
    try {
      user = await User.findById(decoded.id);

      if (!user) {
        console.error("User not found for ID:", {
          id: decoded.id,
          decodedToken: decoded,
        });

        return res.status(404).json({
          success: false,
          message: "User not found",
          details: {
            id: decoded.id,
            tokenInfo: {
              role: decoded.role,
              email: decoded.email,
            },
          },
        });
      }
    } catch (findError) {
      console.error("Error finding user:", {
        error: findError.message,
        id: decoded.id,
      });

      return res.status(500).json({
        success: false,
        message: "Error finding user",
        error: findError.message,
      });
    }

    let query = {};
    if (user.role === "company") {
      query = { createdBy: user._id };
    } else if (user.role === "volunteer") {
      query = {
        status: { $ne: "cancelled" },
      };
    } else if (user.role === "admin") {
      query = {};
    }

    switch (req.method) {
      case "GET":
        const events = await Event.find(query)
          .populate("createdBy", "nume prenume role")
          .populate({
            path: "requests.volunteerId",
            select: "nume prenume",
          })
          .sort({ createdAt: -1 });

        return res.status(200).json({
          success: true,
          events: events,
        });

      case "POST":
        try {
          const eventData = {
            ...req.body,
            createdBy: user._id,
            coordinates: {
              type: "Point",
              coordinates: [req.body.longitude || 0, req.body.latitude || 0],
            },
            status: "active",
          };

          Object.keys(eventData).forEach(
            (key) => eventData[key] === undefined && delete eventData[key]
          );

          const newEvent = new Event(eventData);

          await newEvent.validate();
          await newEvent.save();

          await newEvent.populate("createdBy", "nume prenume role");

          return res.status(201).json({
            success: true,
            event: newEvent,
            message: "Event created successfully",
          });
        } catch (validationError) {
          console.error("Event Creation Validation Error:", {
            name: validationError.name,
            message: validationError.message,
            errors: validationError.errors,
          });

          const errorDetails = Object.keys(validationError.errors || {}).map(
            (key) => ({
              field: key,
              message:
                validationError.errors[key]?.message || "Validation failed",
            })
          );

          return res.status(400).json({
            success: false,
            message: "Event validation failed",
            errors: errorDetails,
          });
        }

      case "PATCH":
        try {
          const { id, ...updateData } = req.body;

          const existingEvent = await Event.findById(id);
          if (!existingEvent) {
            return res.status(404).json({
              success: false,
              message: "Event not found",
            });
          }

          if (
            existingEvent.createdBy.toString() !== user._id.toString() &&
            user.role !== "admin"
          ) {
            return res.status(403).json({
              success: false,
              message: "You do not have permission to update this event",
            });
          }

          const sanitizedUpdateData = { ...updateData };
          if (updateData.longitude || updateData.latitude) {
            sanitizedUpdateData.coordinates = {
              type: "Point",
              coordinates: [
                updateData.longitude || 0,
                updateData.latitude || 0,
              ],
            };
          }

          const updatedEvent = await Event.findByIdAndUpdate(
            id,
            sanitizedUpdateData,
            { new: true, runValidators: true }
          ).populate("createdBy", "nume prenume role");

          return res.status(200).json({
            success: true,
            event: updatedEvent,
            message: "Event updated successfully",
          });
        } catch (updateError) {
          console.error("Event Update Error:", updateError);
          return res.status(500).json({
            success: false,
            message: "Failed to update event",
            error: updateError.message,
          });
        }

      case "DELETE":
        try {
          const { id: eventId } = req.body;
          const eventToDelete = await Event.findById(eventId);

          if (!eventToDelete) {
            return res.status(404).json({
              success: false,
              message: "Event not found",
            });
          }

          if (
            eventToDelete.createdBy.toString() !== user._id.toString() &&
            user.role !== "admin"
          ) {
            return res.status(403).json({
              success: false,
              message: "You do not have permission to delete this event",
            });
          }

          await Event.findByIdAndDelete(eventId);

          return res.status(200).json({
            success: true,
            message: "Event deleted successfully",
          });
        } catch (deleteError) {
          console.error("Event Deletion Error:", deleteError);
          return res.status(500).json({
            success: false,
            message: "Failed to delete event",
            error: deleteError.message,
          });
        }

      default:
        return res.status(405).json({
          success: false,
          message: "Method not allowed",
        });
    }
  } catch (error) {
    console.error("Events API Global Error:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}
