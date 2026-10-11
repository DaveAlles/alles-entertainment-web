import type { EditorialDateState } from "./types";
// Format API-supplied calendar values, never derive the upcoming range locally.
export const formatDate = (date: string, long = false) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: long ? "long" : "short",
    day: "numeric",
    ...(long ? { year: "numeric" } : {}),
  }).format(new Date(date + "T12:00:00Z"));
export const editedAt = (value: string | null) =>
  value && Number.isFinite(Date.parse(value))
    ? new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(value)) + " ET"
    : null;
export const locked = (day: EditorialDateState) =>
  !day.editable || day.puzzleGenerated || day.state === "locked";
export const canSchedule = (day: EditorialDateState) =>
  !locked(day) &&
  (day.state === "none" ||
    (day.state === "cancelled" && !!day.override?.revision));
export const canUpdate = (day: EditorialDateState) =>
  !locked(day) && day.state === "scheduled" && !!day.override?.revision;

// Default preview date comes from authoritative server time, independent of device zone.
export const gameDateAt = (serverNow: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(serverNow));
