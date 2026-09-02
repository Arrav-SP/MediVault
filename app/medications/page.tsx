"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";

type Medication = {
  id: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  instructions: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
};

type MedicationForm = {
  name: string;
  dosage: string;
  frequency: string;
  instructions: string;
  startDate: string;
  endDate: string;
  status: string;
};

const emptyForm: MedicationForm = {
  name: "",
  dosage: "",
  frequency: "",
  instructions: "",
  startDate: "",
  endDate: "",
  status: "active",
};

export default function MedicationsPage() {
  const router = useRouter();

  const [medications, setMedications] = useState<Medication[]>([]);
  const [form, setForm] = useState<MedicationForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function getCurrentUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return null;
    }

    return user;
  }

  async function loadMedications() {
    const user = await getCurrentUser();

    if (!user) {
      return;
    }

    const { data, error } = await supabase
      .from("medications")
      .select(
        "id, name, dosage, frequency, instructions, startDate, endDate, status"
      )
      .eq("userId", user.id)
      .order("createdAt", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMedications(data ?? []);
  }

  useEffect(() => {
    loadMedications();
  }, []);

  function updateField(field: keyof MedicationForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function startEditing(medication: Medication) {
    setEditingId(medication.id);

    setForm({
      name: medication.name,
      dosage: medication.dosage ?? "",
      frequency: medication.frequency ?? "",
      instructions: medication.instructions ?? "",
      startDate: medication.startDate
        ? medication.startDate.slice(0, 10)
        : "",
      endDate: medication.endDate ? medication.endDate.slice(0, 10) : "",
      status: medication.status,
    });

    setMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) {
      setMessage("Medication name is required.");
      return;
    }

    if (!["active", "completed", "discontinued"].includes(form.status)) {
      setMessage("Invalid medication status.");
      return;
    }

    setLoading(true);
    setMessage(editingId ? "Updating medication..." : "Adding medication...");

    const user = await getCurrentUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const medicationData = {
      name: form.name.trim(),
      dosage: form.dosage.trim() || null,
      frequency: form.frequency.trim() || null,
      instructions: form.instructions.trim() || null,
      startDate: form.startDate
        ? new Date(`${form.startDate}T00:00:00`).toISOString()
        : null,
      endDate: form.endDate
        ? new Date(`${form.endDate}T00:00:00`).toISOString()
        : null,
      status: form.status,
    };

    if (editingId) {
      const { error } = await supabase
        .from("medications")
        .update(medicationData)
        .eq("id", editingId)
        .eq("userId", user.id);

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      setMessage("Medication updated successfully!");
    } else {
      const { error } = await supabase.from("medications").insert({
        id: crypto.randomUUID(),
        userId: user.id,
        ...medicationData,
      });

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      setMessage("Medication added successfully!");
    }

    resetForm();
    await loadMedications();
    setLoading(false);
  }

  async function handleDelete(medication: Medication) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${medication.name}"?`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(medication.id);
    setMessage("Deleting medication...");

    const user = await getCurrentUser();

    if (!user) {
      setDeletingId(null);
      return;
    }

    const { error } = await supabase
      .from("medications")
      .delete()
      .eq("id", medication.id)
      .eq("userId", user.id);

    if (error) {
      setMessage(error.message);
      setDeletingId(null);
      return;
    }

    setMedications((current) =>
      current.filter((item) => item.id !== medication.id)
    );

    if (editingId === medication.id) {
      resetForm();
    }

    setMessage("Medication deleted successfully!");
    setDeletingId(null);
  }

  return (
    <main>
      <h1>Medications</h1>

      <hr />

      <h2>{editingId ? "Edit Medication" : "Add Medication"}</h2>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="name">Medication Name</label>
          <br />
          <input
            id="name"
            type="text"
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="e.g. Paracetamol"
            required
          />
        </div>

        <br />

        <div>
          <label htmlFor="dosage">Dosage</label>
          <br />
          <input
            id="dosage"
            type="text"
            value={form.dosage}
            onChange={(event) => updateField("dosage", event.target.value)}
            placeholder="e.g. 500 mg"
          />
        </div>

        <br />

        <div>
          <label htmlFor="frequency">Frequency</label>
          <br />
          <input
            id="frequency"
            type="text"
            value={form.frequency}
            onChange={(event) => updateField("frequency", event.target.value)}
            placeholder="e.g. Twice daily"
          />
        </div>

        <br />

        <div>
          <label htmlFor="instructions">Instructions</label>
          <br />
          <textarea
            id="instructions"
            value={form.instructions}
            onChange={(event) =>
              updateField("instructions", event.target.value)
            }
            placeholder="e.g. Take after meals"
            rows={4}
          />
        </div>

        <br />

        <div>
          <label htmlFor="startDate">Start Date</label>
          <br />
          <input
            id="startDate"
            type="date"
            value={form.startDate}
            onChange={(event) => updateField("startDate", event.target.value)}
          />
        </div>

        <br />

        <div>
          <label htmlFor="endDate">End Date</label>
          <br />
          <input
            id="endDate"
            type="date"
            value={form.endDate}
            onChange={(event) => updateField("endDate", event.target.value)}
          />
        </div>

        <br />

        <div>
          <label htmlFor="status">Status</label>
          <br />
          <select
            id="status"
            value={form.status}
            onChange={(event) => updateField("status", event.target.value)}
          >
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="discontinued">Discontinued</option>
          </select>
        </div>

        <br />

        <button type="submit" disabled={loading}>
          {loading
            ? editingId
              ? "Updating..."
              : "Adding..."
            : editingId
              ? "Update Medication"
              : "Add Medication"}
        </button>

        {editingId && (
          <>
            {" "}
            <button type="button" onClick={resetForm} disabled={loading}>
              Cancel Edit
            </button>
          </>
        )}
      </form>

      {message && <p>{message}</p>}

      <hr />

      <h2>Your Medications</h2>

      {medications.length > 0 ? (
        medications.map((medication) => (
          <section key={medication.id}>
            <h3>{medication.name}</h3>

            <p>
              <strong>Status:</strong> {medication.status}
            </p>

            {medication.dosage && (
              <p>
                <strong>Dosage:</strong> {medication.dosage}
              </p>
            )}

            {medication.frequency && (
              <p>
                <strong>Frequency:</strong> {medication.frequency}
              </p>
            )}

            {medication.instructions && (
              <p>
                <strong>Instructions:</strong> {medication.instructions}
              </p>
            )}

            {medication.startDate && (
              <p>
                <strong>Start Date:</strong>{" "}
                {new Date(medication.startDate).toLocaleDateString()}
              </p>
            )}

            {medication.endDate && (
              <p>
                <strong>End Date:</strong>{" "}
                {new Date(medication.endDate).toLocaleDateString()}
              </p>
            )}

            <button
              type="button"
              onClick={() => startEditing(medication)}
              disabled={deletingId === medication.id}
            >
              Edit
            </button>

            {" "}

            <button
              type="button"
              onClick={() => handleDelete(medication)}
              disabled={deletingId === medication.id}
            >
              {deletingId === medication.id ? "Deleting..." : "Delete"}
            </button>

            <hr />
          </section>
        ))
      ) : (
        <p>No medications yet.</p>
      )}
    </main>
  );
}