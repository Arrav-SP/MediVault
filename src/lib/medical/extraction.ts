export type Confidence = "high" | "medium" | "low";

export type LabResult = {
  name: string;
  value: number;
  unit: string | null;
  confidence: Confidence;
};

export type ExtractionResult = {
  labResults: LabResult[];
  warnings: string[];
};

type TestDefinition = {
  name: string;
  aliases: string[];
  units: string[];
};

const TEST_DEFINITIONS: TestDefinition[] = [
  {
    name: "HbA1c",
    aliases: ["hba1c"],
    units: ["%"],
  },
  {
    name: "Glucose (Fasting)",
    aliases: ["glucose (fasting)", "fasting glucose"],
    units: ["mg/dL", "mmol/L"],
  },
  {
    name: "Hemoglobin",
    aliases: ["hemoglobin", "haemoglobin", "hb"],
    units: ["g/dL", "g/L"],
  },
  {
    name: "LDL Cholesterol",
    aliases: ["ldl cholesterol", "ldl", "ldl-c"],
    units: ["mg/dL", "mmol/L"],
  },
  {
    name: "Creatinine",
    aliases: ["creatinine"],
    units: ["mg/dL", "µmol/L", "umol/L"],
  },
];

const UNIT_ALIASES: Record<string, string> = {
  "%": "%",
  "mg/dl": "mg/dL",
  "g/dl": "g/dL",
  "g/l": "g/L",
  "mmol/l": "mmol/L",
  "µmol/l": "µmol/L",
  "umol/l": "umol/L",
};

function normalizeText(text: string) {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function normalizeName(text: string) {
  return normalizeText(text)
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function findTestDefinition(name: string) {
  const normalizedName = normalizeName(name);

  return TEST_DEFINITIONS.find((test) =>
    test.aliases.some((alias) => normalizeName(alias) === normalizedName)
  );
}

function normalizeUnit(unit: string | undefined) {
  if (!unit) {
    return null;
  }

  const normalized = unit.trim().replace(/[.,;]+$/, "");

  return UNIT_ALIASES[normalized.toLowerCase()] || normalized;
}

function parseValue(value: string | undefined) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).replace(/,/g, "").trim();

  const match = normalized.match(/-?\d+(?:\.\d+)?/);

  if (!match) {
    return null;
  }

  const number = Number(match[0]);

  return Number.isFinite(number) ? number : null;
}

// Longest aliases first prevents "ldl" matching "ldl cholesterol".
const ALIASES_LONGEST_FIRST = TEST_DEFINITIONS.flatMap((test) =>
  test.aliases.map((alias) => ({ test, alias }))
).sort((a, b) => b.alias.length - a.alias.length);

function findTestInLine(line: string): LabResult | null {
  const normalizedLine = normalizeText(line);
  const lowerLine = normalizedLine.toLowerCase();

  for (const { test, alias } of ALIASES_LONGEST_FIRST) {
    if (!lowerLine.startsWith(alias.toLowerCase())) {
      continue;
    }

    const remainder = normalizedLine
      .slice(alias.length)
      .replace(/^[\s:\-]+/, "")
      .trim();

    const valueMatch = remainder.match(/^(-?\d+(?:\.\d+)?)\s*(.*)$/i);

    if (!valueMatch) {
      continue;
    }

    const value = Number(valueMatch[1]);

    if (!Number.isFinite(value)) {
      continue;
    }

    const unit = normalizeUnit(valueMatch[2]);
    const validUnit = unit === null || test.units.includes(unit);

    return {
      name: test.name,
      value,
      unit,
      confidence: validUnit ? "high" : "medium",
    };
  }

  return null;
}

function extractFromSequentialLines(lines: string[]) {
  const results: LabResult[] = [];

  for (let i = 0; i < lines.length; i++) {
    const testDefinition = findTestDefinition(lines[i]);

    if (!testDefinition) {
      continue;
    }

    const value = parseValue(lines[i + 1]);

    if (value === null) {
      continue;
    }

    const unit = normalizeUnit(lines[i + 2]);
    const validUnit = unit === null || testDefinition.units.includes(unit);

    results.push({
      name: testDefinition.name,
      value,
      unit,
      confidence: validUnit ? "high" : "medium",
    });
  }

  return results;
}

function removeDuplicates(results: LabResult[]) {
  const seen = new Set<string>();

  return results.filter((result) => {
    const key = `${result.name}|${result.value}|${result.unit}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function extractMedicalData(ocrText: unknown): ExtractionResult {
  if (!ocrText || typeof ocrText !== "string") {
    return {
      labResults: [],
      warnings: ["No OCR text was provided."],
    };
  }

  const lines = ocrText.split("\n").map(normalizeText).filter(Boolean);

  const results: LabResult[] = [];

  // Strategy 1: inline formats, e.g. "HbA1c: 6.1 %" or "Glucose (Fasting) 108 mg/dL".
  for (const line of lines) {
    const result = findTestInLine(line);

    if (result) {
      results.push(result);
    }
  }

  // Strategy 2: sequential OCR table output (name, value and unit on separate lines).
  results.push(...extractFromSequentialLines(lines));

  const labResults = removeDuplicates(results);

  const warnings: string[] = [];

  for (const result of labResults) {
    if (!result.unit) {
      warnings.push(`Unit missing for ${result.name}.`);
    }

    if (result.confidence !== "high") {
      warnings.push(`Review extraction for ${result.name}.`);
    }
  }

  return {
    labResults,
    warnings,
  };
}
