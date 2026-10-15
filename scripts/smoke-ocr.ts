// Reads a document the same way the analysis pipeline does, then runs extraction +
// validation. Digital PDFs are read locally (no cloud call); scans and photos use the
// provider in OCR_PROVIDER, which calls a real cloud service with your .env credentials.
// Usage: npx tsx scripts/smoke-ocr.ts [file] [mime-type]
import "dotenv/config";
import { readFileSync } from "node:fs";
import { getDocumentText } from "../src/lib/document-text";
import { extractMedicalData } from "../src/lib/medical/extraction";
import { validateMedicalData } from "../src/lib/medical/validation";

const filePath = process.argv[2] ?? "test-data/sample_blood_report.pdf";
const mimeType = process.argv[3] ?? "application/pdf";

getDocumentText(readFileSync(filePath), mimeType)
  .then(({ text, source }) => {
    console.log(`Read OK: source=${source}, ${text.length} characters`);
    console.dir(validateMedicalData(extractMedicalData(text)), { depth: null });
  })
  .catch((error: unknown) => {
    console.error("Smoke test failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  });
