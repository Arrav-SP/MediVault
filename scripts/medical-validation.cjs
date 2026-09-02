const VALIDATION_RULES = {
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

function validateLabResult(result) {
  const errors = [];
  const warnings = [];

  if (!result.name) {
    errors.push("Test name is missing.");
  }

  if (result.value === null || result.value === undefined) {
    errors.push("Test value is missing.");
  }

  if (!Number.isFinite(result.value)) {
    errors.push("Test value is not a valid number.");
  }

  const rule = VALIDATION_RULES[result.name];

  if (!rule) {
    warnings.push("No validation rule exists for this test.");
  } else {
    if (!result.unit) {
      warnings.push("Unit is missing.");
    } else if (!rule.units.includes(result.unit)) {
      errors.push(`Unexpected unit: ${result.unit}.`);
    }

    if (
      Number.isFinite(result.value) &&
      (
        result.value < rule.plausibleRange[0] ||
        result.value > rule.plausibleRange[1]
      )
    ) {
      warnings.push(
        `Value is outside the configured plausible range (${rule.plausibleRange[0]}-${rule.plausibleRange[1]}).`
      );
    }
  }

  if (result.confidence === "medium") {
    warnings.push("Extraction confidence is medium; review required.");
  }

  if (result.confidence === "low") {
    warnings.push("Extraction confidence is low; review required.");
  }

  let status = "VALID";

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

function validateMedicalData(extractedData) {
  if (!extractedData || !Array.isArray(extractedData.labResults)) {
    return {
      status: "REJECT",
      labResults: [],
      errors: ["Invalid extraction data."],
    };
  }

  const labResults = extractedData.labResults.map(validateLabResult);

  const hasRejected = labResults.some(
    (result) => result.validation.status === "REJECT"
  );

  const hasReview = labResults.some(
    (result) => result.validation.status === "REVIEW"
  );

  let status = "VALID";

  if (hasRejected) {
    status = "REJECT";
  } else if (hasReview) {
    status = "REVIEW";
  }

  return {
    status,
    labResults,
    errors: [],
  };
}

module.exports = {
  validateLabResult,
  validateMedicalData,
};