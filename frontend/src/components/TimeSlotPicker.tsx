import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Button,
  Typography,
  Alert,
  CircularProgress,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { availabilityApi } from "../lib/api";

interface TimeSlotPickerProps {
  packageId: number;
  date: Date;
  providerId?: number;
  onSlotSelect: (startTime: string) => void;
}

export default function TimeSlotPicker({
  packageId,
  date,
  providerId,
  onSlotSelect,
}: TimeSlotPickerProps) {
  const [loading, setLoading] = useState(true);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Use date string to prevent unnecessary re-renders
  const dateStr = useMemo(() => {
    if (!date) return "";
    return date.toISOString().split("T")[0];
  }, [date]);

  useEffect(() => {
    if (!dateStr) return; // Skip fetch if no valid date
    fetchAvailableSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packageId, dateStr, providerId]);

  const fetchAvailableSlots = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await availabilityApi.getAvailableSlots(
        packageId,
        dateStr,
        providerId
      );
      setAvailableSlots(data.available_slots);
    } catch (err) {
      console.error("Failed to load slots:", err);
      setError("Failed to load available slots");
    } finally {
      setLoading(false);
    }
  };

  const handleSlotClick = (startTime: string) => {
    setSelectedSlot(startTime);
    onSlotSelect(startTime);
  };

  // Helper functions for display
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""}`;
    return `${mins} min`;
  };

  const calculateEndTime = (startTime: string, durationMinutes: number) => {
    const [hours, minutes] = startTime.split(":").map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    startDate.setMinutes(startDate.getMinutes() + durationMinutes);

    // Handle next day
    const endHours = startDate.getHours();
    const endMinutes = startDate.getMinutes();
    const endTimeStr = `${endHours.toString().padStart(2, "0")}:${endMinutes
      .toString()
      .padStart(2, "0")}`;

    // Check if it crosses midnight
    const crossesMidnight = durationMinutes > 24 * 60 - hours * 60 - minutes;

    return crossesMidnight ? `${endTimeStr} (+1 day)` : endTimeStr;
  };

  // Group slots by time period
  const groupedSlots = useMemo(() => {
    const morning: any[] = [];
    const afternoon: any[] = [];
    const evening: any[] = [];

    availableSlots.forEach((slot) => {
      const hour = parseInt(slot.start_time.split(":")[0]);
      if (hour >= 6 && hour < 12) {
        morning.push(slot);
      } else if (hour >= 12 && hour < 18) {
        afternoon.push(slot);
      } else {
        evening.push(slot);
      }
    });

    return { morning, afternoon, evening };
  }, [availableSlots]);

  // Handle invalid date case
  if (!date || !dateStr) {
    return (
      <Alert severity="info">
        Please select a date to view available time slots.
      </Alert>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (availableSlots.length === 0) {
    return (
      <Alert severity="warning">
        No available time slots for this date. Please choose another date.
      </Alert>
    );
  }

  const renderSlotGroup = (slots: any[], title: string) => {
    if (slots.length === 0) return null;

    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          {title}
        </Typography>
        <Grid container spacing={1}>
          {slots.map((slot) => (
            <Grid key={slot.start_time} size={{ xs: 6, sm: 4, md: 3 }}>
              <Button
                fullWidth
                variant={
                  selectedSlot === slot.start_time ? "contained" : "outlined"
                }
                onClick={() => handleSlotClick(slot.start_time)}
                sx={{
                  minHeight: 65,
                  display: "flex",
                  flexDirection: "column",
                  py: 1,
                }}
              >
                <Typography variant="body2" fontWeight="bold">
                  {slot.start_time} -{" "}
                  {calculateEndTime(slot.start_time, slot.duration_minutes)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ({formatDuration(slot.duration_minutes)})
                </Typography>
              </Button>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        Available Time Slots ({date.toLocaleDateString()})
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ mb: 2, display: "block" }}
      >
        Select a starting time for your service
      </Typography>
      <Box sx={{ maxHeight: 450, overflowY: "auto" }}>
        {renderSlotGroup(groupedSlots.morning, "Morning (6:00 AM - 12:00 PM)")}
        {renderSlotGroup(
          groupedSlots.afternoon,
          "Afternoon (12:00 PM - 6:00 PM)"
        )}
        {renderSlotGroup(groupedSlots.evening, "Evening (6:00 PM - 12:00 AM)")}
      </Box>
    </Box>
  );
}
