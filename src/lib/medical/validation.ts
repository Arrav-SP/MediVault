import type { ExtractionResult, LabResult } from "./extraction";

// "VALID" only means the value passed extraction/plausibility checks.
// It is NOT a clinical reference range or a statement that a result is normal.
export type ValidationStatus = "VALID" | "REVIEW" | "REJECT";

export type ValidatedLabResult = LabResult & {
  validation: {
    status: ValidationStatus;
    errors: string[];
    warnings: string[];
  };
};

export type ValidationResult = {
  status: ValidationStatus;
  labResults: ValidatedLabResult[];
  errors: string[];
};

type ValidationRule = {
  units: string[];
  plausibleRange: [number, number];
};

const VALIDATION_RULES: Record<string, ValidationRule> = {
  HbA1c: {
    units: ["%"],
    plausibleRange: [2, 20],
  },
  "Glucose (Fasting)": {
    units: ["mg/dL", "mmol/L"],
    plausibleRange: [20, 1000],
  },
  Hemoglobin: {
    units: ["g/dL", "g/L"],
    plausibleRange: [3, 25],
  },
  "LDL Cholesterol": {
    units: ["mg/dL", "mmol/L"],
    plausibleRange: [10, 1000],
  },
  Creatinine: {
    units: ["mg/dL", "µmol/L", "umol/L"],
    plausibleRange: [0.1, 20],
  },
};

export function validateLabResult(result: LabResult): ValidatedLabResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!result.name) {
    errors.push("Test name is missing.");
  }

  if (result.value === null || result.value === undefined) {
    errors.push("Test value is missing.");
  }

  if (!Number.isFinite(result.value)) {
    errors.push("Test value is not a valid number.");
  }

  const rule = Object.hasOwn(VALIDATION_RULES, result.name)
    ? VALIDATION_RULES[result.name]
    : undefined;

  if (!rule) {
    warnings.push("No validation rule exists for this test.");
  } else {
    if (!result.unit) {
      warnings.push("Unit is missing.");
    } else if (!rule.units.includes(result.unit)) {
      errors.push(`Unexpected unit: ${result.unit}.`);
    }

    const [min, max] = rule.plausibleRange;

    if (Number.isFinite(result.value) && (result.value < min || result.value > max)) {
      warnings.push(
        `Value is outside the configured plausible range (${min}-${max}).`
      );
    }
  }

  if (result.confidence === "medium") {
    warnings.push("Extraction confidence is medium; review required.");
  }

  if (result.confidence === "low") {
    warnings.push("Extraction confidence is low; review required.");
  }

  let status: ValidationStatus = "VALID";

  if (errors.length > 0) {
    status = "REJECT";
  } else if (warnings.length > 0) {
    status = "REVIEW";
  }

  return {
    ...result,
    validation: {
      status,
      errors,
      warnings,
    },
  };
}

export function validateMedicalData(
  extractedData: Partial<ExtractionResult> | null | undefined
): ValidationResult {
  if (!extractedData || !Array.isArray(extractedData.labResults)) {
    return {
      status: "REJECT",
      labResults: [],
      errors: ["Invalid extraction data."],
    };
  }

  const labResults = extractedData.labResults.map(validateLabResult);

  let status: ValidationStatus = "VALID";

  if (labResults.some((result) => result.validation.status === "REJECT")) {
    status = "REJECT";
  } else if (labResults.some((result) => result.validation.status === "REVIEW")) {
    status = "REVIEW";
  }

  return {
    status,
    labResults,
    errors: [],
  };
}
