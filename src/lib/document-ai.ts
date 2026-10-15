import { DocumentProcessorServiceClient } from "@google-cloud/documentai";

let client: DocumentProcessorServiceClient | null = null;

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not set. See .env.example.`);
  }

  return value;
}

function getConfig() {
  const location = requireEnv("DOCUMENT_AI_LOCATION");

  return {
    location,
    processorName: `projects/${requireEnv("DOCUMENT_AI_PROJECT_ID")}/locations/${location}/processors/${requireEnv("DOCUMENT_AI_PROCESSOR_ID")}`,
  };
}

export async function processDocument(
  fileContent: Buffer,
  mimeType: string
) {
  const { location, processorName } = getConfig();

  client ??= new DocumentProcessorServiceClient({
    apiEndpoint: `${location}-documentai.googleapis.com`,
  });

  const [result] = await client.processDocument({
    name: processorName,
    rawDocument: {
      content: fileContent,
      mimeType,
    },
  });

  return result.document?.text ?? "";
}
