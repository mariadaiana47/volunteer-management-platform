import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";

const EventSearch = () => {
  const [events, setEvents] = useState([]);
  const [filters, setFilters] = useState({
    category: "",
    searchText: "",
    minCredits: 0,
    maxCredits: 1000,
    startDate: "",
    endDate: "",
  });
  const [userLocation, setUserLocation] = useState(null);
  const router = useRouter();

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Location access denied", error);
        }
      );
    }
  }, []);

  const fetchEvents = async () => {
    const queryParams = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        queryParams.append(key, value);
      }
    });

    if (userLocation) {
      queryParams.append("latitude", userLocation.latitude);
      queryParams.append("longitude", userLocation.longitude);
    }

    try {
      const response = await fetch(`/api/events/search?${queryParams}`);
      const data = await response.json();

      if (data.success) {
        setEvents(data.events);
      }
    } catch (error) {
      console.error("Failed to fetch events", error);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [filters, userLocation]);

  const handleEventClick = (eventId) => {
    router.push(`/events/${eventId}`);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4 grid md:grid-cols-3 gap-4">
        {/* Category Filter */}
        <select
          value={filters.category}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              category: e.target.value,
            }))
          }
          className="w-full p-2 border rounded"
        >
          <option value="">All Categories</option>
          <option value="Environment">Environment</option>
          <option value="Community Service">Community Service</option>
          <option value="Education">Education</option>
          <option value="Healthcare">Healthcare</option>
          <option value="Animal Welfare">Animal Welfare</option>
        </select>

        {/* Search Input */}
        <input
          type="text"
          placeholder="Search events..."
          value={filters.searchText}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              searchText: e.target.value,
            }))
          }
          className="w-full p-2 border rounded"
        />

        {/* Credits Range */}
        <div>
          <label className="block mb-2">
            Credits: {filters.minCredits} - {filters.maxCredits}
          </label>
          <input
            type="range"
            min="0"
            max="1000"
            value={filters.maxCredits}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                maxCredits: e.target.value,
              }))
            }
            className="w-full"
          />
        </div>
      </div>

      {/* Date Range Filters */}
      <div className="mb-4 grid md:grid-cols-2 gap-4">
        <div>
          <label>Start Date</label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                startDate: e.target.value,
              }))
            }
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label>End Date</label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                endDate: e.target.value,
              }))
            }
            className="w-full p-2 border rounded"
          />
        </div>
      </div>

      {/* Events Grid */}
      <div className="grid md:grid-cols-3 gap-4">
        {events.map((event) => (
          <div
            key={event._id}
            onClick={() => handleEventClick(event._id)}
            className="border p-4 rounded shadow-md cursor-pointer hover:bg-gray-50 transition"
          >
            <h3 className="font-bold text-xl mb-2">{event.title}</h3>
            <p className="text-gray-600 mb-2">{event.description}</p>
            <div className="flex justify-between">
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                {event.category}
              </span>
              <span className="text-green-600">{event.credits} Credits</span>
            </div>
            <div className="mt-2 text-sm text-gray-500">
              📍 {event.location}
              <br />
              📅 {new Date(event.date).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>

      {events.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          No events found. Try adjusting your filters.
        </div>
      )}
    </div>
  );
};

export default EventSearch;
