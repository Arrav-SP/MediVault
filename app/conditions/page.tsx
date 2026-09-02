"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";

type Condition = {
  id: string;
  name: string;
  diagnosisDate: string | null;
  notes: string | null;
  status: string;
};

type ConditionForm = {
  name: string;
  diagnosisDate: string;
  notes: string;
  status: string;
};

const emptyForm: ConditionForm = {
  name: "",
  diagnosisDate: "",
  notes: "",
  status: "active",
};

const allowedStatuses = [
  "active",
  "resolved",
  "chronic",
  "under_observation",
];

export default function ConditionsPage() {
  const router = useRouter();

  const [conditions, setConditions] = useState<Condition[]>([]);
  const [form, setForm] = useState<ConditionForm>(emptyForm);
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

  async function loadConditions() {
    const user = await getCurrentUser();

    if (!user) {
      return;
    }

    const { data, error } = await supabase
      .from("conditions")
      .select("id, name, diagnosisDate, notes, status")
      .eq("userId", user.id)
      .order("createdAt", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setConditions(data ?? []);
  }

  useEffect(() => {
    loadConditions();
  }, []);

  function updateField(field: keyof ConditionForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function startEditing(condition: Condition) {
    setEditingId(condition.id);

    setForm({
      name: condition.name,
      diagnosisDate: condition.diagnosisDate
        ? condition.diagnosisDate.slice(0, 10)
        : "",
      notes: condition.notes ?? "",
      status: condition.status,
    });

    setMessage("");
  }

  function convertDateToISO(value: string) {
    if (!value) {
      return null;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return `${value}T00:00:00.000Z`;
    }

    const parts = value.split("/");

    if (parts.length === 3) {
      const [month, day, year] = parts;

      if (
        /^\d{1,2}$/.test(month) &&
        /^\d{1,2}$/.test(day) &&
        /^\d{4}$/.test(year)
      ) {
        return `${year}-${month.padStart(2, "0")}-${day.padStart(
          2,
          "0"
        )}T00:00:00.000Z`;
      }
    }

    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) {
      setMessage("Condition name is required.");
      return;
    }

    if (!allowedStatuses.includes(form.status)) {
      setMessage("Invalid condition status.");
      return;
    }

    const diagnosisDate = convertDateToISO(form.diagnosisDate);

    if (form.diagnosisDate && !diagnosisDate) {
      setMessage("Please enter a valid diagnosis date.");
      return;
    }

    setLoading(true);
    setMessage(editingId ? "Updating condition..." : "Adding condition...");

    const user = await getCurrentUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const conditionData = {
      name: form.name.trim(),
      diagnosisDate,
      notes: form.notes.trim() || null,
      status: form.status,
    };

    if (editingId) {
      const { error } = await supabase
        .from("conditions")
        .update(conditionData)
        .eq("id", editingId)
        .eq("userId", user.id);

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      setMessage("Condition updated successfully!");
    } else {
      const { error } = await supabase.from("conditions").insert({
        id: crypto.randomUUID(),
        userId: user.id,
        ...conditionData,
      });

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      setMessage("Condition added successfully!");
    }

    resetForm();
    await loadConditions();
    setLoading(false);
  }

  async function handleDelete(condition: Condition) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${condition.name}"?`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(condition.id);
    setMessage("Deleting condition...");

    const user = await getCurrentUser();

    if (!user) {
      setDeletingId(null);
      return;
    }

    const { error } = await supabase
      .from("conditions")
      .delete()
      .eq("id", condition.id)
      .eq("userId", user.id);

    if (error) {
      setMessage(error.message);
      setDeletingId(null);
      return;
    }

    setConditions((current) =>
      current.filter((item) => item.id !== condition.id)
    );

    if (editingId === condition.id) {
      resetForm();
    }

    setMessage("Condition deleted successfully!");
    setDeletingId(null);
  }

  return (
    <main>
      <h1>Conditions</h1>

      <hr />

      <h2>{editingId ? "Edit Condition" : "Add Condition"}</h2>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="name">Condition Name</label>
          <br />
          <input
            id="name"
            type="text"
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="e.g. Asthma"
            required
          />
        </div>

        <br />

        <div>
          <label htmlFor="diagnosisDate">Diagnosis Date</label>
          <br />
          <input
            id="diagnosisDate"
            type="date"
            value={form.diagnosisDate}
            onChange={(event) =>
              updateField("diagnosisDate", event.target.value)
            }
          />
        </div>

        <br />

        <div>
          <label htmlFor="notes">Notes</label>
          <br />
          <textarea
            id="notes"
            value={form.notes}
            onChange={(event) => updateField("notes", event.target.value)}
            placeholder="Additional information"
            rows={4}
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
            <option value="resolved">Resolved</option>
            <option value="chronic">Chronic</option>
            <option value="under_observation">Under Observation</option>
          </select>
        </div>

        <br />

        <button type="submit" disabled={loading}>
          {loading
            ? editingId
              ? "Updating..."
              : "Adding..."
            : editingId
              ? "Update Condition"
              : "Add Condition"}
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

      <h2>Your Conditions</h2>

      {conditions.length > 0 ? (
        conditions.map((condition) => (
          <section key={condition.id}>
            <h3>{condition.name}</h3>

            <p>
              <strong>Status:</strong> {condition.status}
            </p>

            {condition.diagnosisDate && (
              <p>
                <strong>Diagnosis Date:</strong>{" "}
                {new Date(condition.diagnosisDate).toLocaleDateString()}
              </p>
            )}

            {condition.notes && (
              <p>
                <strong>Notes:</strong> {condition.notes}
              </p>
            )}

            <button
              type="button"
              onClick={() => startEditing(condition)}
              disabled={deletingId === condition.id}
            >
              Edit
            </button>

            {" "}

            <button
              type="button"
              onClick={() => handleDelete(condition)}
              disabled={deletingId === condition.id}
            >
              {deletingId === condition.id ? "Deleting..." : "Delete"}
            </button>

            <hr />
          </section>
        ))
      ) : (
        <p>No conditions yet.</p>
      )}
    </main>
  );
}