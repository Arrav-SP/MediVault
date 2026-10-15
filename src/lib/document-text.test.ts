import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { processDocument } from "./document-ai";
import { getDocumentText, UnsupportedDocumentError } from "./document-text";
import { extractMedicalData } from "./medical/extraction";

vi.mock("./document-ai", () => ({ processDocument: vi.fn() }));

const SAMPLE_PDF = readFileSync("test-data/sample_blood_report.pdf");

// A valid one-page PDF with no text layer: what a scanned document looks like.
const BLANK_PDF = Buffer.from(
  "%PDF-1.4\n" +
    "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n" +
    "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
    "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\n" +
    "trailer<</Root 1 0 R>>\n%%EOF\n"
);

const PNG = Buffer.from("89504e470d0a1a0a", "hex");

describe("getDocumentText", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.mocked(processDocument).mockReset();
  });

  it("reads a digital PDF's built-in text locally, without calling OCR", async () => {
    vi.stubEnv("OCR_PROVIDER", "google");

    const { text, source } = await getDocumentText(SAMPLE_PDF, "application/pdf");

    expect(source).toBe("pdf-text");
    expect(processDocument).not.toHaveBeenCalled();
    expect(extractMedicalData(text).labResults).toEqual([
      { name: "HbA1c", value: 6.1, unit: "%", confidence: "high" },
      { name: "Glucose (Fasting)", value: 108, unit: "mg/dL", confidence: "high" },
      { name: "Hemoglobin", value: 13.8, unit: "g/dL", confidence: "high" },
      { name: "LDL Cholesterol", value: 126, unit: "mg/dL", confidence: "high" },
      { name: "Creatinine", value: 1, unit: "mg/dL", confidence: "high" },
    ]);
  });

  it("rejects scans and photos when no OCR provider is configured", async () => {
    vi.stubEnv("OCR_PROVIDER", "");

    await expect(getDocumentText(BLANK_PDF, "application/pdf")).rejects.toBeInstanceOf(
      UnsupportedDocumentError
    );
    await expect(getDocumentText(PNG, "image/png")).rejects.toBeInstanceOf(
      UnsupportedDocumentError
    );
    expect(processDocument).not.toHaveBeenCalled();
  });

  it("sends scans and photos to Google OCR when OCR_PROVIDER=google", async () => {
    vi.stubEnv("OCR_PROVIDER", "google");
    vi.mocked(processDocument).mockResolvedValue("HbA1c 6.1 %");

    await expect(getDocumentText(PNG, "image/png")).resolves.toEqual({
      text: "HbA1c 6.1 %",
      source: "google-ocr",
    });
    await expect(getDocumentText(BLANK_PDF, "application/pdf")).resolves.toMatchObject({
      source: "google-ocr",
    });
  });

  it("fails loudly on an unknown provider instead of treating it as unsupported", async () => {
    vi.stubEnv("OCR_PROVIDER", "tesseract");

    const error = await getDocumentText(PNG, "image/png").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(UnsupportedDocumentError);
  });
});
