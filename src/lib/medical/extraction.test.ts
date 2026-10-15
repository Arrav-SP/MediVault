import { describe, expect, it } from "vitest";
import { extractMedicalData } from "./extraction";

const SAMPLE_PANEL = [
  { name: "HbA1c", value: 6.1, unit: "%", confidence: "high" },
  { name: "Glucose (Fasting)", value: 108, unit: "mg/dL", confidence: "high" },
  { name: "Hemoglobin", value: 13.8, unit: "g/dL", confidence: "high" },
  { name: "LDL Cholesterol", value: 126, unit: "mg/dL", confidence: "high" },
  { name: "Creatinine", value: 1, unit: "mg/dL", confidence: "high" },
];

describe("extractMedicalData", () => {
  it("reads Document AI's sequential table output (name / value / unit lines)", () => {
    const ocrText = [
      "Results", "-", "sample_blood_report.pdf", "Test", "Value", "Unit",
      "HbA1c", "6.1", "%",
      "Glucose (Fasting)", "108", "mg/dL",
      "Hemoglobin", "13.8", "g/dL",
      "LDL Cholesterol", "126", "mg/dL",
      "Creatinine", "1.0", "mg/dL",
    ].join("\n");

    expect(extractMedicalData(ocrText)).toEqual({ labResults: SAMPLE_PANEL, warnings: [] });
  });

  it("reads inline 'Name: value unit' lines", () => {
    const ocrText = `
HbA1c: 6.1 %
Glucose (Fasting): 108 mg/dL
Hemoglobin: 13.8 g/dL
LDL Cholesterol: 126 mg/dL
Creatinine: 1.0 mg/dL
`;

    expect(extractMedicalData(ocrText)).toEqual({ labResults: SAMPLE_PANEL, warnings: [] });
  });

  it("maps aliases to canonical test names", () => {
    const { labResults } = extractMedicalData(
      "Fasting Glucose 108 mg/dL\nHb 13.8 g/dL\nLDL-C 126 mg/dL\nHaemoglobin 14 g/L"
    );

    expect(labResults.map((r) => r.name)).toEqual([
      "Glucose (Fasting)",
      "Hemoglobin",
      "LDL Cholesterol",
      "Hemoglobin",
    ]);
  });

  it("prefers the longest alias ('LDL Cholesterol' over 'LDL', 'HbA1c' over 'Hb')", () => {
    const { labResults } = extractMedicalData("LDL Cholesterol 130 mg/dL\nHbA1c 7 %");

    expect(labResults).toEqual([
      { name: "LDL Cholesterol", value: 130, unit: "mg/dL", confidence: "high" },
      { name: "HbA1c", value: 7, unit: "%", confidence: "high" },
    ]);
  });

  it("tolerates OCR noise: CRLF, tabs, repeated spaces, case and trailing punctuation", () => {
    const { labResults } = extractMedicalData(
      "  hba1c   :   7.25   %  \r\n\tLDL   cholesterol - 130 mg/dl.\r\n"
    );

    expect(labResults).toEqual([
      { name: "HbA1c", value: 7.25, unit: "%", confidence: "high" },
      { name: "LDL Cholesterol", value: 130, unit: "mg/dL", confidence: "high" },
    ]);
  });

  it("warns when a unit is missing", () => {
    const result = extractMedicalData("HbA1c\n6.1");

    expect(result.labResults).toEqual([
      { name: "HbA1c", value: 6.1, unit: null, confidence: "high" },
    ]);
    expect(result.warnings).toEqual(["Unit missing for HbA1c."]);
  });

  it("lowers confidence and asks for review when the unit is unexpected", () => {
    const result = extractMedicalData("Hemoglobin 13.8 mg/dL");

    expect(result.labResults[0]).toMatchObject({ unit: "mg/dL", confidence: "medium" });
    expect(result.warnings).toEqual(["Review extraction for Hemoglobin."]);
  });

  it("skips tests whose value cannot be read", () => {
    expect(extractMedicalData("Glucose (Fasting)\nabc\nmg/dL").labResults).toEqual([]);
    expect(extractMedicalData("Hemoglobin A1c 6.1 %").labResults).toEqual([]);
  });

  it("removes duplicates found by both strategies", () => {
    const { labResults } = extractMedicalData("HbA1c: 6.1 %\nHbA1c\n6.1\n%");

    expect(labResults).toHaveLength(1);
  });

  it("returns a warning instead of throwing on empty or non-text input", () => {
    for (const input of ["", null, undefined, 42]) {
      expect(extractMedicalData(input)).toEqual({
        labResults: [],
        warnings: ["No OCR text was provided."],
      });
    }
  });
});
