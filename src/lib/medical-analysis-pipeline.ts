import { createClient } from "@supabase/supabase-js";
import db from "./prisma";
import { processDocument } from "./document-ai";
import { extractMedicalData } from "./medical-analysis";
import { validateMedicalData } from "./medical-validation";

const BUCKET_NAME = "medical-records";

export async function analyzeMedicalRecord(
  recordId: string,
  userId: string
) {
  // 1. Verify ownership of the medical record.
  const record = await db.orm.public.MedicalRecord
    .where({
      id: recordId,
      userId,
    })
    .first();

  if (!record) {
    throw new Error("Medical record not found.");
  }

  // 2. Create an analysis record.
  const analysis = await db.orm.public.RecordAnalysis.create({
    recordId: record.id,
    status: "pending",
  });

  try {
    // 3. Mark the analysis as processing.
    await db.orm.public.RecordAnalysis
      .where({ id: analysis.id })
      .update({
        status: "processing",
      });

    // 4. Create a privileged server-side Supabase client.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    );

    // 5. Download the private medical file.
    const { data: fileData, error: downloadError } =
      await supabase.storage
        .from(BUCKET_NAME)
        .download(record.fileUrl);

    if (downloadError || !fileData) {
      throw new Error(
        `Failed to download medical record: ${
          downloadError?.message ?? "File not found."
        }`
      );
    }

    // 6. Convert the file to a Buffer.
    const fileBuffer = Buffer.from(await fileData.arrayBuffer());

    // 7. Run Google Document AI OCR.
    const ocrText = await processDocument(
      fileBuffer,
      record.mimeType ?? "application/pdf"
    );

    if (!ocrText.trim()) {
      throw new Error("Document AI returned no text.");
    }

    // 8. Extract structured medical data.
    const extractedData = extractMedicalData(ocrText);

    // 9. Validate the extracted data.
    const validatedData = validateMedicalData(extractedData);

    // 10. Save the completed analysis.
    await db.orm.public.RecordAnalysis
      .where({ id: analysis.id })
      .update({
        status: "completed",
        extractedData: validatedData,
        modelVersion: "document-ai-ocr-v1",
        completedAt: new Date(),
      });

    return {
      analysisId: analysis.id,
      status: "completed",
      extractedData: validatedData,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown medical analysis error.";

    // 11. Save the failure state.
    await db.orm.public.RecordAnalysis
      .where({ id: analysis.id })
      .update({
        status: "failed",
        errorMessage: message,
      });

    throw error;
  }
}