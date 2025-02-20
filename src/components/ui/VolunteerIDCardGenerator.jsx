// VolunteerIDCardGenerator.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IdCard, Download, PrinterIcon } from "lucide-react";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// ID Card Template Component
const VolunteerIDCardTemplate = React.forwardRef(({ volunteerData, eventData, templateStyle = 'default' }, ref) => {
  const templateStyles = {
    default: {
      background: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
      textColor: 'black'
    },
    modern: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      textColor: 'white'
    },
    professional: {
      background: 'linear-gradient(135deg, #2980b9 0%, #2c3e50 100%)',
      textColor: 'white'
    }
  };

  const style = templateStyles[templateStyle];

  return (
    <div 
      ref={ref}
      className="w-[350px] h-[550px] mx-auto bg-white shadow-lg rounded-lg overflow-hidden"
      style={{ 
        background: style.background,
        color: style.textColor
      }}
    >
      <div className="p-6 text-center">
        <div className="w-32 h-32 mx-auto mb-4 bg-white rounded-full overflow-hidden border-4 border-white flex items-center justify-center">
          <IdCard className="w-16 h-16 text-gray-400" />
        </div>

        <h2 className="text-2xl font-bold mb-2">
          {volunteerData.volunteerName || volunteerData.name}
        </h2>
        
        <div className="space-y-2 mb-4">
          <p className="text-lg">
            <strong>Event:</strong> {eventData.title}
          </p>
          <p>
            <strong>Date:</strong> {new Date(eventData.date).toLocaleDateString()}
          </p>
          <p>
            <strong>Location:</strong> {eventData.location}
          </p>
          {volunteerData.actionTitle && (
            <p>
              <strong>Role:</strong> {volunteerData.actionTitle}
            </p>
          )}
        </div>

        <div className="bg-white/20 p-2 rounded mt-4">
          <p className="text-sm">
            Volunteer ID: {volunteerData._id?.slice(-8).toUpperCase()}
          </p>
        </div>
      </div>
    </div>
  );
});

// Main ID Card Generator Component
const VolunteerIDCardGenerator = () => {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedVolunteer, setSelectedVolunteer] = useState(null);
  const [templateStyle, setTemplateStyle] = useState('default');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const idCardRef = useRef(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        // Clean the token
        const cleanToken = token.replace(/^["'](.+(?=["']$))["']$/, '$1').trim();
        
        const response = await fetch('/api/events/company', {
          headers: { 
            Authorization: `Bearer ${cleanToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setEvents(data.events || []);
          }
        }
      } catch (error) {
        console.error('Error fetching events:', error);
        setError('Failed to load events');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const getApprovedVolunteers = (event) => {
    if (!event?.requests) return [];
    return event.requests
      .filter(request => request.status?.toLowerCase() === 'approved')
      .map(request => ({
        _id: request._id,
        volunteerName: request.volunteerName,
        email: request.email,
        actionTitle: event.actions?.find(action => action._id === request.actionId)?.title
      }));
  };

  const generatePDF = () => {
    if (!idCardRef.current) return;

    html2canvas(idCardRef.current).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = canvas.height * imgWidth / canvas.width;
      const position = (pageHeight - imgHeight) / 2;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      pdf.save(`volunteer_id_${selectedVolunteer.volunteerName.replace(/\s+/g, '_')}.pdf`);
    });
  };

  const printIDCard = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Volunteer ID Card Generator</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block mb-2">Select Event</label>
              <Select 
                onValueChange={(eventId) => {
                  const event = events.find(e => e._id === eventId);
                  setSelectedEvent(event);
                  setSelectedVolunteer(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose an event" />
                </SelectTrigger>
                <SelectContent>
                  {events.map(event => (
                    <SelectItem key={event._id} value={event._id}>
                      {event.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block mb-2">Select Volunteer</label>
              <Select 
                onValueChange={(volunteerId) => {
                  const volunteer = getApprovedVolunteers(selectedEvent)
                    .find(v => v._id === volunteerId);
                  setSelectedVolunteer(volunteer);
                }}
                disabled={!selectedEvent}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a volunteer" />
                </SelectTrigger>
                <SelectContent>
                  {getApprovedVolunteers(selectedEvent).map(volunteer => (
                    <SelectItem key={volunteer._id} value={volunteer._id}>
                      {volunteer.volunteerName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block mb-2">ID Card Style</label>
              <Select 
                value={templateStyle}
                onValueChange={setTemplateStyle}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select template style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="modern">Modern</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex space-x-4 mt-6">
              <Button 
                onClick={generatePDF} 
                disabled={!selectedVolunteer}
                className="w-full"
              >
                <Download className="mr-2" /> Download PDF
              </Button>
              <Button 
                onClick={printIDCard} 
                disabled={!selectedVolunteer}
                variant="outline"
                className="w-full"
              >
                <PrinterIcon className="mr-2" /> Print
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-center">
            {selectedVolunteer && selectedEvent ? (
              <VolunteerIDCardTemplate 
                ref={idCardRef}
                volunteerData={selectedVolunteer}
                eventData={selectedEvent}
                templateStyle={templateStyle}
              />
            ) : (
              <div className="text-center text-gray-500">
                <IdCard className="w-24 h-24 mx-auto mb-4 text-gray-300" />
                <p>Select an event and volunteer to generate ID card</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VolunteerIDCardGenerator;