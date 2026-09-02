const {
  extractMedicalData,
} = require("./medical-extraction.cjs");

const {
  validateMedicalData,
} = require("./medical-validation.cjs");

const ocrText = `
Results
-
sample_blood_report.pdf
Test
Value
Unit
HbA1c
6.1
%
Glucose (Fasting)
108
mg/dL
Hemoglobin
13.8
g/dL
LDL Cholesterol
126
mg/dL
Creatinine
1.0
mg/dL
`;

const extractedData = extractMedicalData(ocrText);

const validatedData = validateMedicalData(extractedData);

console.log(
  JSON.stringify(validatedData, null, 2)
);