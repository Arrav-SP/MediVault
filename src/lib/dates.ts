// Date-only fields (start/end dates, diagnosis dates) are stored as UTC midnight,
// and always read back and displayed in UTC, so the calendar day never shifts
// with the viewer's timezone. Date-time fields (measuredAt, completedAt) are
// real instants: entered and displayed in the viewer's local time.

const DATE_INPUT = /^\d{4}-\d{2}-\d{2}$/;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

/** "2026-10-15" from <input type="date"> → "2026-10-15T00:00:00.000Z"; null if invalid. */
export function dateInputToUtcIso(value: string): string | null {
  if (!DATE_INPUT.test(value)) {
    return null;
  }

  const iso = `${value}T00:00:00.000Z`;
  const date = new Date(iso);

  // Rejects impossible dates such as 2026-02-31, which Date would roll over.
  return !Number.isNaN(date.getTime()) && date.toISOString() === iso ? iso : null;
}

/** Stored date-only value → "YYYY-MM-DD" for <input type="date">, read in UTC. */
export function utcIsoToDateInput(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

/** Stored date-only value → human-readable date, formatted in UTC. */
export function formatDateOnly(value: string): string {
  return new Date(value).toLocaleDateString(undefined, { timeZone: "UTC" });
}

/** Instant → "YYYY-MM-DD" in the viewer's local timezone (defaults to now). */
export function toLocalDateInput(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Instant → "HH:MM" in the viewer's local timezone (defaults to now). */
export function toLocalTimeInput(date: Date = new Date()): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
