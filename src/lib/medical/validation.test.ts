import { describe, expect, it } from "vitest";
import type { LabResult } from "./extraction";
import { validateLabResult, validateMedicalData } from "./validation";

function lab(overrides: Partial<LabResult>): LabResult {
  return { name: "HbA1c", value: 6.1, unit: "%", confidence: "high", ...overrides };
}

describe("validateLabResult", () => {
  it("accepts a well-formed, plausible result", () => {
    expect(validateLabResult(lab({})).validation).toEqual({
      status: "VALID",
      errors: [],
      warnings: [],
    });
  });

  it("treats plausible-range boundaries as inclusive", () => {
    expect(validateLabResult(lab({ value: 2 })).validation.status).toBe("VALID");
    expect(validateLabResult(lab({ value: 20 })).validation.status).toBe("VALID");
    expect(
      validateLabResult(lab({ name: "Creatinine", value: 0.1, unit: "mg/dL" })).validation.status
    ).toBe("VALID");
  });

  it("flags values outside the plausible range for review, not rejection", () => {
    for (const value of [1.9, 20.1]) {
      expect(validateLabResult(lab({ value })).validation).toEqual({
        status: "REVIEW",
        errors: [],
        warnings: ["Value is outside the configured plausible range (2-20)."],
      });
    }
  });

  it("rejects an unexpected unit", () => {
    expect(validateLabResult(lab({ unit: "mg/dL" })).validation).toMatchObject({
      status: "REJECT",
      errors: ["Unexpected unit: mg/dL."],
    });
  });

  it("asks for review when the unit is missing or confidence is not high", () => {
    expect(validateLabResult(lab({ unit: null })).validation.warnings).toEqual([
      "Unit is missing.",
    ]);
    expect(validateLabResult(lab({ confidence: "medium" })).validation.status).toBe("REVIEW");
    expect(validateLabResult(lab({ confidence: "low" })).validation.warnings).toEqual([
      "Extraction confidence is low; review required.",
    ]);
  });

  it("rejects missing or non-numeric values", () => {
    expect(validateLabResult(lab({ value: Number.NaN })).validation).toMatchObject({
      status: "REJECT",
      errors: ["Test value is not a valid number."],
    });
  });

  it("asks for review on tests without a rule, including prototype property names", () => {
    for (const name of ["Vitamin D", "constructor", "toString"]) {
      expect(validateLabResult(lab({ name })).validation).toMatchObject({
        status: "REVIEW",
        warnings: ["No validation rule exists for this test."],
      });
    }
  });

  it("is a plausibility check, not a clinical judgement", () => {
    // HbA1c 9% is clinically significant, yet it is a plausible OCR reading,
    // so the validator must say VALID and must not use clinical labels.
    const result = validateLabResult(lab({ value: 9 }));
    const text = JSON.stringify(result).toLowerCase();

    expect(result.validation.status).toBe("VALID");
    for (const word of ["normal", "abnormal", "healthy", "diagnos", "high risk"]) {
      expect(text).not.toContain(word);
    }
  });
});

describe("validateMedicalData", () => {
  it("rolls up to the most severe status", () => {
    expect(validateMedicalData({ labResults: [lab({})] }).status).toBe("VALID");
    expect(validateMedicalData({ labResults: [lab({}), lab({ value: 50 })] }).status).toBe(
      "REVIEW"
    );
    expect(
      validateMedicalData({ labResults: [lab({ value: 50 }), lab({ unit: "g/L" })] }).status
    ).toBe("REJECT");
  });

  it("is VALID for an empty result list", () => {
    expect(validateMedicalData({ labResults: [], warnings: [] })).toEqual({
      status: "VALID",
      labResults: [],
      errors: [],
    });
  });

  it("rejects invalid extraction data", () => {
    for (const input of [null, undefined, {}]) {
      expect(validateMedicalData(input)).toEqual({
        status: "REJECT",
        labResults: [],
        errors: ["Invalid extraction data."],
      });
    }
  });
});
