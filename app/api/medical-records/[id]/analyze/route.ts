import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase-server";
import {
  analyzeMedicalRecord,
  RecordNotFoundError,
} from "@/src/lib/medical-analysis-pipeline";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: "Invalid record ID." }, { status: 400 });
  }

  try {
    // The pipeline independently enforces that the record belongs to this user.
    const result = await analyzeMedicalRecord(id, user.id);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof RecordNotFoundError) {
      return NextResponse.json(
        { error: "Medical record not found." },
        { status: 404 }
      );
    }

    // Details are persisted on the RecordAnalysis row; never log OCR text or user IDs.
    console.error("Medical analysis failed for record", id);

    return NextResponse.json(
      { error: "Analysis failed. Please try again." },
      { status: 500 }
    );
  }
}
