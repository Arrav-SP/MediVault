import "dotenv/config";
import { analyzeMedicalRecord } from "../src/lib/medical-analysis-pipeline";

const recordId = "5cff0d57-75e0-48ce-8cd9-e7aba918e984";
const userId = process.env.TEST_USER_ID;

if (!userId) {
  throw new Error("TEST_USER_ID is missing from .env");
}

analyzeMedicalRecord(recordId, userId)
  .then((result) => {
    console.log("PIPELINE SUCCESS");
    console.dir(result, { depth: null });
  })
  .catch((error) => {
    console.error("PIPELINE FAILED");
    console.error(error);
    process.exit(1);
  });