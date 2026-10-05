"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Calendar } from "lucide-react";

type MeetingItem = {
  id: string;
  title: string;
  startTime: string | Date;
  endTime: string | Date;
  projectName?: string;
};

type Props = {
  meetings: MeetingItem[];
  userEmail: string;
};

// Sound notification function
function playNotificationSound() {
  try {
    // Create audio context for notification sound
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Set frequency and type for a pleasant notification sound
    oscillator.frequency.value = 800;
    oscillator.type = "sine";

    // Fade in and out
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.warn("Could not play notification sound:", error);
  }
}

// Request notification permission
async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    console.warn("This browser does not support notifications");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
}

// Show browser notification
function showBrowserNotification(title: string, options: NotificationOptions) {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  try {
    const notification = new Notification(title, {
      icon: "/favicon.ico", // You can add a custom icon
      badge: "/favicon.ico",
      ...options,
    });

    // Auto-close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);

    // Handle click
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (error) {
    console.warn("Could not show notification:", error);
  }
}

export function MeetingReminder({ meetings, userEmail }: Props) {
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionRequested, setPermissionRequested] = useState(false);
  const notifiedMeetingsRef = useRef<Set<string>>(new Set());
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check current permission status
  useEffect(() => {
    if ("Notification" in window) {
      setHasPermission(Notification.permission === "granted");
      setPermissionRequested(Notification.permission !== "default");
    }
  }, []);

  // Request notification permission on mount (only if not already requested)
  useEffect(() => {
    if (!permissionRequested && "Notification" in window && Notification.permission === "default") {
      requestNotificationPermission().then((granted) => {
        setHasPermission(granted);
        setPermissionRequested(true);
        if (granted) {
          toast.success("Meeting reminders enabled!", {
            description: "You'll receive notifications 5 minutes before meetings",
          });
        } else {
          toast.info("Enable notifications", {
            description: "Allow notifications to receive meeting reminders",
          });
        }
      });
    }
  }, [permissionRequested]);

  // Check for upcoming meetings
  useEffect(() => {
    if (!hasPermission) return;

    const checkUpcomingMeetings = () => {
      const now = new Date();
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

      meetings.forEach((meeting) => {
        const meetingId = meeting.id;
        
        // Skip if already notified
        if (notifiedMeetingsRef.current.has(meetingId)) {
          return;
        }

        const startTime = new Date(meeting.startTime);
        const timeDiff = startTime.getTime() - now.getTime();

        // Check if meeting starts in 5 minutes (±30 seconds tolerance)
        if (timeDiff >= 4.5 * 60 * 1000 && timeDiff <= 5.5 * 60 * 1000) {
          // Mark as notified
          notifiedMeetingsRef.current.add(meetingId);

          // Play sound
          playNotificationSound();

          // Show browser notification
          showBrowserNotification("Meeting starting soon!", {
            body: `${meeting.title}${meeting.projectName ? ` (${meeting.projectName})` : ""} starts in 5 minutes`,
            tag: `meeting-${meetingId}`,
            requireInteraction: false,
          });

          // Show toast notification
          toast.info("Meeting starting soon!", {
            description: `${meeting.title} starts in 5 minutes`,
            icon: <Calendar className="h-4 w-4" />,
            duration: 10000,
            action: {
              label: "View",
              onClick: () => {
                window.location.href = "/dashboard/calendar";
              },
            },
          });
        }
      });
    };

    // Check immediately
    checkUpcomingMeetings();

    // Check every 30 seconds
    checkIntervalRef.current = setInterval(checkUpcomingMeetings, 30 * 1000);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [meetings, hasPermission]);

  // Reset notified meetings when meetings list changes significantly
  useEffect(() => {
    // Reset if meetings list is empty or significantly changed
    if (meetings.length === 0) {
      notifiedMeetingsRef.current.clear();
    }
  }, [meetings.length]);

  return null; // This component doesn't render anything
}
