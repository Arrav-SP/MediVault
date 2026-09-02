"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";

type RecordItem = {
  id: string;
  title: string;
  recordType: string;
  fileName: string;
  fileUrl: string;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
];

export default function RecordsPage() {
  const router = useRouter();

  const [records, setRecords] = useState<RecordItem[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function getCurrentUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      router.push("/login");
      return null;
    }

    return user;
  }

  async function loadRecords() {
    const user = await getCurrentUser();

    if (!user) {
      return;
    }

    const { data, error } = await supabase
      .from("medical_records")
      .select("id, title, recordType, fileName, fileUrl")
      .eq("userId", user.id)
      .order("uploadedAt", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setRecords(data ?? []);
  }

  useEffect(() => {
    loadRecords();
  }, []);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      setFile(null);
      setMessage("Only PDF, PNG, and JPEG files are allowed.");
      event.target.value = "";
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setFile(null);
      setMessage("File is too large. Maximum size is 10 MB.");
      event.target.value = "";
      return;
    }

    setMessage("");
    setFile(selectedFile);
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setMessage("Please select a file.");
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setMessage("Only PDF, PNG, and JPEG files are allowed.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setMessage("File is too large. Maximum size is 10 MB.");
      return;
    }

    setLoading(true);
    setMessage("Uploading...");

    const user = await getCurrentUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const recordId = crypto.randomUUID();

    const extension = file.name.includes(".")
      ? file.name.substring(file.name.lastIndexOf(".")).toLowerCase()
      : "";

    const filePath = `${user.id}/${recordId}${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("medical-records")
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      setMessage(uploadError.message);
      setLoading(false);
      return;
    }

    const { error: recordError } = await supabase
      .from("medical_records")
      .insert({
        id: recordId,
        userId: user.id,
        title: file.name,
        recordType: "lab_report",
        fileName: file.name,
        fileUrl: filePath,
        mimeType: file.type,
        fileSize: file.size,
      });

    if (recordError) {
      await supabase.storage
        .from("medical-records")
        .remove([filePath]);

      setMessage(recordError.message);
      setLoading(false);
      return;
    }

    setFile(null);
    setMessage("Medical record uploaded successfully!");

    await loadRecords();

    setLoading(false);
  }

  async function handleView(record: RecordItem) {
    setMessage("Opening record...");

    const user = await getCurrentUser();

    if (!user) {
      return;
    }

    if (!record.fileUrl.startsWith(`${user.id}/`)) {
      setMessage("You do not have permission to view this record.");
      return;
    }

    const { data, error } = await supabase.storage
      .from("medical-records")
      .createSignedUrl(record.fileUrl, 60);

    if (error) {
      setMessage(error.message);
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");

    setMessage("");
  }

  async function handleDelete(record: RecordItem) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${record.title}"?`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(record.id);
    setMessage("Deleting record...");

    const user = await getCurrentUser();

    if (!user) {
      setDeletingId(null);
      return;
    }

    if (!record.fileUrl.startsWith(`${user.id}/`)) {
      setMessage("You do not have permission to delete this record.");
      setDeletingId(null);
      return;
    }

    const { error: storageError } = await supabase.storage
      .from("medical-records")
      .remove([record.fileUrl]);

    if (storageError) {
      setMessage(storageError.message);
      setDeletingId(null);
      return;
    }

    const { error: recordError } = await supabase
      .from("medical_records")
      .delete()
      .eq("id", record.id)
      .eq("userId", user.id);

    if (recordError) {
      setMessage(recordError.message);
      setDeletingId(null);
      return;
    }

    setRecords((currentRecords) =>
      currentRecords.filter((item) => item.id !== record.id)
    );

    setMessage("Medical record deleted successfully!");
    setDeletingId(null);
  }

  return (
    <main>
      <h1>Medical Records</h1>

      <hr />

      <h2>Upload a Medical Record</h2>

      <form onSubmit={handleUpload}>
        <input
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
          onChange={handleFileChange}
          disabled={loading}
        />

        <br />
        <br />

        <button type="submit" disabled={loading || !file}>
          {loading ? "Uploading..." : "Upload Record"}
        </button>
      </form>

      <p>Allowed: PDF, PNG, JPEG. Maximum size: 10 MB.</p>

      {message && <p>{message}</p>}

      <hr />

      <h2>Your Records</h2>

      {records.length > 0 ? (
        records.map((record) => (
          <div key={record.id}>
            <h3>{record.title}</h3>

            <p>Type: {record.recordType}</p>

            <p>File: {record.fileName}</p>

            <button
              type="button"
              onClick={() => handleView(record)}
              disabled={deletingId === record.id}
            >
              View Record
            </button>

            {" "}

            <button
              type="button"
              onClick={() => handleDelete(record)}
              disabled={deletingId === record.id}
            >
              {deletingId === record.id ? "Deleting..." : "Delete Record"}
            </button>

            <hr />
          </div>
        ))
      ) : (
        <p>No medical records yet.</p>
      )}
    </main>
  );
}