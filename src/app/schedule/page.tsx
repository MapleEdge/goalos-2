"use client";

import { useEffect, useState, useCallback } from "react";
import { CalendarView } from "@/components/schedule/CalendarView";
import { CalendarSettings } from "@/components/schedule/CalendarSettings";
import { EventModal } from "@/components/schedule/EventModal";

interface ScheduleEvent {
  id: string;
  title: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  allDay: boolean;
  location?: string | null;
  source: "GOALOS" | "GOOGLE" | "MICROSOFT";
  goalId?: string | null;
  actionId?: string | null;
  color?: string | null;
  calendarConnection?: {
    provider: string;
    accountEmail: string;
  } | null;
}

interface CalendarConnection {
  id: string;
  provider: "GOOGLE" | "MICROSOFT";
  accountEmail: string;
  syncEnabled: boolean;
  lastSyncAt: string | null;
}

export default function SchedulePage() {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [connections, setConnections] = useState<CalendarConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"week" | "month">("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    start: Date;
    end: Date;
  } | null>(null);

  const fetchEvents = useCallback(async () => {
    const start = getViewStart(currentDate, view);
    const end = getViewEnd(currentDate, view);
    const params = new URLSearchParams({
      start: start.toISOString(),
      end: end.toISOString(),
    });
    const res = await fetch(`/api/schedule?${params}`);
    const data = await res.json();
    setEvents(data);
  }, [currentDate, view]);

  const fetchConnections = useCallback(async () => {
    const res = await fetch("/api/calendar/connections");
    const data = await res.json();
    setConnections(data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      await Promise.all([fetchEvents(), fetchConnections()]);
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [fetchEvents, fetchConnections]);

  async function importGoalOSActions() {
    await fetch("/api/schedule/actions", { method: "POST" });
    await fetchEvents();
  }

  function handleSlotClick(start: Date, end: Date) {
    setSelectedSlot({ start, end });
    setShowEventModal(true);
  }

  async function handleCreateEvent(eventData: {
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    allDay?: boolean;
    location?: string;
    color?: string;
  }) {
    await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventData),
    });
    setShowEventModal(false);
    setSelectedSlot(null);
    await fetchEvents();
  }

  function navigateDate(direction: -1 | 1) {
    const d = new Date(currentDate);
    if (view === "week") d.setDate(d.getDate() + direction * 7);
    else d.setMonth(d.getMonth() + direction);
    setCurrentDate(d);
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Schedule</h1>
          <p className="text-sm text-zinc-500">
            {connections.length > 0
              ? `${connections.length} calendar${connections.length > 1 ? "s" : ""} connected`
              : "Connect a calendar to sync events"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={importGoalOSActions}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Import Actions
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="inline-block mr-1"
            >
              <path d="M6.5 1.5h3l.5 2.3 2-.8 2.1 2.1-.8 2 2.3.5v3l-2.3.5.8 2-2.1 2.1-2-.8-.5 2.3h-3l-.5-2.3-2 .8-2.1-2.1.8-2L.4 10.6v-3l2.3-.5-.8-2L4 3l2 .8.5-2.3z" />
              <circle cx="8" cy="8" r="2.5" />
            </svg>
            Calendars
          </button>
          <button
            onClick={() => {
              setSelectedSlot({
                start: new Date(),
                end: new Date(Date.now() + 60 * 60 * 1000),
              });
              setShowEventModal(true);
            }}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
          >
            + New Event
          </button>
        </div>
      </div>

      {/* Calendar Settings Panel */}
      {showSettings && (
        <CalendarSettings
          connections={connections}
          onRefresh={() => {
            fetchConnections();
            fetchEvents();
          }}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Calendar Navigation */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(new Date())}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Today
          </button>
          <button
            onClick={() => navigateDate(-1)}
            className="rounded-lg border border-zinc-200 p-1.5 text-zinc-700 hover:bg-zinc-50"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 4l-4 4 4 4" />
            </svg>
          </button>
          <button
            onClick={() => navigateDate(1)}
            className="rounded-lg border border-zinc-200 p-1.5 text-zinc-700 hover:bg-zinc-50"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 4l4 4-4 4" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold text-zinc-900">
            {formatDateRange(currentDate, view)}
          </h2>
        </div>
        <div className="flex rounded-lg border border-zinc-200 overflow-hidden">
          <button
            onClick={() => setView("week")}
            className={`px-3 py-1.5 text-sm font-medium ${
              view === "week"
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setView("month")}
            className={`px-3 py-1.5 text-sm font-medium ${
              view === "month"
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            Month
          </button>
        </div>
      </div>

      {/* Calendar */}
      <CalendarView
        events={events}
        view={view}
        currentDate={currentDate}
        onSlotClick={handleSlotClick}
      />

      {/* Event Modal */}
      {showEventModal && selectedSlot && (
        <EventModal
          start={selectedSlot.start}
          end={selectedSlot.end}
          onSave={handleCreateEvent}
          onClose={() => {
            setShowEventModal(false);
            setSelectedSlot(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────

function getViewStart(date: Date, view: "week" | "month"): Date {
  const d = new Date(date);
  if (view === "week") {
    d.setDate(d.getDate() - d.getDay());
  } else {
    d.setDate(1);
    d.setDate(d.getDate() - d.getDay());
  }
  d.setHours(0, 0, 0, 0);
  return d;
}

function getViewEnd(date: Date, view: "week" | "month"): Date {
  const d = new Date(date);
  if (view === "week") {
    d.setDate(d.getDate() - d.getDay() + 6);
  } else {
    d.setMonth(d.getMonth() + 1, 0);
    d.setDate(d.getDate() + (6 - d.getDay()));
  }
  d.setHours(23, 59, 59, 999);
  return d;
}

function formatDateRange(date: Date, view: "week" | "month"): string {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  if (view === "month") {
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  }
  const start = getViewStart(date, "week");
  const end = getViewEnd(date, "week");
  if (start.getMonth() === end.getMonth()) {
    return `${months[start.getMonth()]} ${start.getDate()} – ${end.getDate()}, ${start.getFullYear()}`;
  }
  return `${months[start.getMonth()]} ${start.getDate()} – ${months[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
}
