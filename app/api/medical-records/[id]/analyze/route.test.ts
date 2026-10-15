import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/src/lib/supabase-server";
import {
  analyzeMedicalRecord,
  RecordNotFoundError,
  UnsupportedDocumentError,
} from "@/src/lib/medical-analysis-pipeline";
import { POST } from "./route";

vi.mock("@/src/lib/supabase-server", () => ({ createClient: vi.fn() }));

vi.mock("@/src/lib/medical-analysis-pipeline", () => ({
  analyzeMedicalRecord: vi.fn(),
  RecordNotFoundError: class RecordNotFoundError extends Error {},
  UnsupportedDocumentError: class UnsupportedDocumentError extends Error {},
}));

const RECORD_ID = "5f1c2b7e-1d2a-4c3b-9e8f-0a1b2c3d4e5f";
const USER_ID = "user-123";

function signIn(user: { id: string } | null) {
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user }, error: null }) },
  } as unknown as Awaited<ReturnType<typeof createClient>>);
}

function callRoute(id: string) {
  return POST(new Request(`http://localhost/api/medical-records/${id}/analyze`, { method: "POST" }), {
    params: Promise.resolve({ id }),
  });
}

describe("POST /api/medical-records/[id]/analyze", () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.mocked(analyzeMedicalRecord).mockReset();
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it.each([RECORD_ID, "not-a-uuid"])(
    "returns 401 without a session, before validating the ID (%s)",
    async (id) => {
      signIn(null);

      const response = await callRoute(id);

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized." });
      expect(analyzeMedicalRecord).not.toHaveBeenCalled();
    }
  );

  it("returns 400 for a malformed ID when signed in", async () => {
    signIn({ id: USER_ID });

    const response = await callRoute("not-a-uuid");

    expect(response.status).toBe(400);
    expect(analyzeMedicalRecord).not.toHaveBeenCalled();
  });

  it("returns 404 when the record is missing or owned by someone else", async () => {
    signIn({ id: USER_ID });
    vi.mocked(analyzeMedicalRecord).mockRejectedValue(
      new RecordNotFoundError("Medical record not found.")
    );

    const response = await callRoute(RECORD_ID);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Medical record not found." });
    // Ownership is enforced by the pipeline with the session's user ID, never a client value.
    expect(analyzeMedicalRecord).toHaveBeenCalledWith(RECORD_ID, USER_ID);
  });

  it("returns 422 with a safe message for scans and photos it cannot read", async () => {
    signIn({ id: USER_ID });
    vi.mocked(analyzeMedicalRecord).mockRejectedValue(
      new UnsupportedDocumentError("internal: no text layer, OCR_PROVIDER unset")
    );

    const response = await callRoute(RECORD_ID);
    const body = await response.text();

    expect(response.status).toBe(422);
    expect(JSON.parse(body)).toEqual({
      error:
        "This looks like a scanned document or photo. Reading scans automatically isn't available yet.",
    });
    expect(body).not.toContain("OCR_PROVIDER");
  });

  it("does not treat a plain error with the same message as not-found", async () => {
    signIn({ id: USER_ID });
    vi.mocked(analyzeMedicalRecord).mockRejectedValue(new Error("Medical record not found."));

    expect((await callRoute(RECORD_ID)).status).toBe(500);
  });

  it("returns a generic 500 and logs only the record ID on failure", async () => {
    signIn({ id: USER_ID });
    vi.mocked(analyzeMedicalRecord).mockRejectedValue(
      new Error("secret detail: signed URL https://x/token=abc, OCR text HbA1c 6.1")
    );

    const response = await callRoute(RECORD_ID);
    const body = await response.text();

    expect(response.status).toBe(500);
    expect(JSON.parse(body)).toEqual({ error: "Analysis failed. Please try again." });
    expect(body).not.toContain("secret detail");
    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith("Medical analysis failed for record", RECORD_ID);
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(USER_ID);
  });

  it("returns exactly analysisId, status and extractedData on success", async () => {
    signIn({ id: USER_ID });
    vi.mocked(analyzeMedicalRecord).mockResolvedValue({
      analysisId: "analysis-1",
      status: "completed",
      extractedData: { status: "VALID", labResults: [], errors: [] },
    });

    const response = await callRoute(RECORD_ID);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(Object.keys(body).sort()).toEqual(["analysisId", "extractedData", "status"]);
  });
});
