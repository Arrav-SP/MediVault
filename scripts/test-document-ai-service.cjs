require("dotenv").config();
const fs = require("fs");
const { DocumentProcessorServiceClient } = require("@google-cloud/documentai");

async function main() {
  const client = new DocumentProcessorServiceClient({
    apiEndpoint: "asia-south1-documentai.googleapis.com",
  });

  const processorName =
    "projects/medivault-507415/locations/asia-south1/processors/3f00a55808e515f8";

  const filePath = "test-data/sample_blood_report.pdf";
  const fileContent = fs.readFileSync(filePath);

  const [result] = await client.processDocument({
    name: processorName,
    rawDocument: {
      content: fileContent,
      mimeType: "application/pdf",
    },
  });

  const text = result.document?.text ?? "";

  console.log("\n========== SERVICE OCR TEST ==========\n");
  console.log(text);
  console.log("\nCharacters:", text.length);
  console.log("\n========== END ==========\n");
}

main().catch((error) => {
  console.error("Document AI service test failed.");
  console.error(error.message);
  process.exit(1);
});