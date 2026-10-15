import { extractText, getDocumentProxy } from "unpdf";
import { processDocument } from "./document-ai";

export type DocumentTextSource = "pdf-text" | "google-ocr";

export type DocumentText = {
  text: string;
  source: DocumentTextSource;
};

/** The document has no readable text layer and no OCR provider is configured. */
export class UnsupportedDocumentError extends Error {}

// Below this, a PDF's text layer is treated as empty (e.g. a scan with a stray caption).
const MIN_TEXT_CHARACTERS = 20;

async function readPdfText(fileContent: Buffer) {
  const pdf = await getDocumentProxy(new Uint8Array(fileContent));
  const { text } = await extractText(pdf, { mergePages: false });

  return text.join("\n");
}

function hasReadableText(text: string) {
  return text.replace(/\s/g, "").length >= MIN_TEXT_CHARACTERS;
}

/**
 * Returns the document's text. Digital PDFs are read locally from their built-in
 * text layer (free, and the file never leaves the server). Scans and photos go to
 * the OCR provider named by OCR_PROVIDER, if one is configured.
 */
export async function getDocumentText(
  fileContent: Buffer,
  mimeType: string
): Promise<DocumentText> {
  if (mimeType === "application/pdf") {
    const text = await readPdfText(fileContent);

    if (hasReadableText(text)) {
      return { text, source: "pdf-text" };
    }
  }

  const provider = process.env.OCR_PROVIDER;

  if (!provider) {
    throw new UnsupportedDocumentError(
      "Document has no text layer and no OCR provider is configured."
    );
  }

  if (provider === "google") {
    return { text: await processDocument(fileContent, mimeType), source: "google-ocr" };
  }

  throw new Error(`Unknown OCR_PROVIDER "${provider}". See .env.example.`);
}
