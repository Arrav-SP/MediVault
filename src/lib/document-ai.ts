import { DocumentProcessorServiceClient } from "@google-cloud/documentai";

const client = new DocumentProcessorServiceClient({
  apiEndpoint: "asia-south1-documentai.googleapis.com",
});

const processorName =
  "projects/medivault-507415/locations/asia-south1/processors/3f00a55808e515f8";

export async function processDocument(
  fileContent: Buffer,
  mimeType: string
) {
  const [result] = await client.processDocument({
    name: processorName,
    rawDocument: {
      content: fileContent,
      mimeType,
    },
  });

  return result.document?.text ?? "";
}