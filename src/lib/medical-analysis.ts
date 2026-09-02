import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const { extractMedicalData } = require("../../scripts/medical-extraction.cjs");

export { extractMedicalData };