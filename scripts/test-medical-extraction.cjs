const {
  extractMedicalData,
} = require("./medical-extraction.cjs");

const testReports = [
  {
    name: "Google Document AI output",
    text: `
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
`,
  },

  {
    name: "Inline report",
    text: `
HbA1c: 6.1 %
Glucose (Fasting): 108 mg/dL
Hemoglobin: 13.8 g/dL
LDL Cholesterol: 126 mg/dL
Creatinine: 1.0 mg/dL
`,
  },

  {
    name: "Alternative names",
    text: `
Fasting Glucose 108 mg/dL
Hb 13.8 g/dL
LDL-C 126 mg/dL
Creatinine 1.0 mg/dL
`,
  },
];

for (const report of testReports) {
  console.log(`\n========== ${report.name} ==========\n`);

  const result = extractMedicalData(report.text);

  console.log(JSON.stringify(result, null, 2));
}