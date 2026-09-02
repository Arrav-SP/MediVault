require("dotenv").config();

const { DocumentProcessorServiceClient } = require("@google-cloud/documentai");

const client = new DocumentProcessorServiceClient({
  apiEndpoint: "asia-south1-documentai.googleapis.com",
});

const processorName =
  "projects/medivault-507415/locations/asia-south1/processors/3f00a55808e515f8";

async function test() {
  const [processor] = await client.getProcessor({
    name: processorName,
  });

  console.log("Google Document AI connection successful!");
  console.log("Processor:", processor.displayName);
  console.log("Status:", processor.state);
}

test().catch((error) => {
  console.error("Google Document AI connection failed.");
  console.error(error.message);
  process.exit(1);
});