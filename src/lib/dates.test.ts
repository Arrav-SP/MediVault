import { describe, expect, it } from "vitest";
import {
  dateInputToUtcIso,
  formatDateOnly,
  toLocalDateInput,
  toLocalTimeInput,
  utcIsoToDateInput,
} from "./dates";

// Run under several zones (see the "test" script / CI matrix): every assertion
// here must hold regardless of process.env.TZ.
describe(`date helpers (TZ=${process.env.TZ ?? "system"})`, () => {
  it("round-trips a date-only value without shifting the calendar day", () => {
    for (const day of ["2026-01-01", "2026-03-29", "2026-10-15", "2026-12-31"]) {
      const stored = dateInputToUtcIso(day);

      expect(stored).toBe(`${day}T00:00:00.000Z`);
      // Saving then re-opening the edit form, repeatedly, keeps the same day.
      expect(utcIsoToDateInput(utcIsoToDateInput(stored))).toBe(day);
    }
  });

  it("reads Postgres timestamptz strings for date-only fields in UTC", () => {
    expect(utcIsoToDateInput("2026-10-15T00:00:00+00:00")).toBe("2026-10-15");
  });

  it("rejects malformed and impossible dates", () => {
    expect(dateInputToUtcIso("")).toBeNull();
    expect(dateInputToUtcIso("10/15/2026")).toBeNull();
    expect(dateInputToUtcIso("2026-02-31")).toBeNull();
    expect(dateInputToUtcIso("2026-13-01")).toBeNull();
    expect(utcIsoToDateInput(null)).toBe("");
    expect(utcIsoToDateInput("not a date")).toBe("");
  });

  it("formats date-only values as the stored calendar day", () => {
    const formatted = formatDateOnly("2026-10-15T00:00:00.000Z");
    const expected = new Date(Date.UTC(2026, 9, 15)).toLocaleDateString(undefined, {
      timeZone: "UTC",
    });

    expect(formatted).toBe(expected);
  });

  it("round-trips local date + time inputs through an instant", () => {
    // Just after local midnight: the case the old UTC-date default got wrong in IST.
    const local = new Date(2026, 9, 15, 0, 30);
    const date = toLocalDateInput(local);
    const time = toLocalTimeInput(local);

    expect(date).toBe("2026-10-15");
    expect(time).toBe("00:30");

    const saved = new Date(`${date}T${time}`).toISOString();
    const reopened = new Date(saved);

    expect(toLocalDateInput(reopened)).toBe(date);
    expect(toLocalTimeInput(reopened)).toBe(time);
  });
});
