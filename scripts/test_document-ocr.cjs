require("dotenv").config();

const fs = require("fs");
const { DocumentProcessorServiceClient } = require("@google-cloud/documentai");

const client = new DocumentProcessorServiceClient({
  apiEndpoint: "asia-south1-documentai.googleapis.com",
});

const processorName =
  "projects/medivault-507415/locations/asia-south1/processors/3f00a55808e515f8";

const filePath = "./test-data/sample_blood_report.pdf";

async function testOCR() {
  const fileContent = fs.readFileSync(filePath);

  const request = {
    name: processorName,
    rawDocument: {
      content: fileContent,
      mimeType: "application/pdf",
    },
  };

  const [result] = await client.processDocument(request);

  const text = result.document?.text || "";

  console.log("\n================ OCR RESULT ================\n");
  console.log(text);
  console.log("\n================ END RESULT ================\n");

  console.log(`Extracted characters: ${text.length}`);
}

testOCR().catch((error) => {
  console.error("Google Document AI OCR failed.");
  console.error(error.message);
  process.exit(1);
});