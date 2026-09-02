"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";

type Goal = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  startDate: string;
  endDate: string | null;
  targetValue: number | null;
  targetUnit: string | null;
  status: string;
};

type GoalForm = {
  title: string;
  description: string;
  category: string;
  startDate: string;
  endDate: string;
  targetValue: string;
  targetUnit: string;
  status: string;
};

const emptyForm: GoalForm = {
  title: "",
  description: "",
  category: "",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "",
  targetValue: "",
  targetUnit: "",
  status: "active",
};

const allowedStatuses = [
  "active",
  "completed",
  "paused",
  "cancelled",
];

export default function GoalsPage() {
  const router = useRouter();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [form, setForm] = useState<GoalForm>(emptyForm);
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

  async function loadGoals() {
    const user = await getCurrentUser();

    if (!user) {
      return;
    }

    const { data, error } = await supabase
      .from("goals")
      .select(
        "id, title, description, category, startDate, endDate, targetValue, targetUnit, status"
      )
      .eq("userId", user.id)
      .order("createdAt", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setGoals(data ?? []);
  }

  useEffect(() => {
    loadGoals();
  }, []);

  function updateField(field: keyof GoalForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm({
      ...emptyForm,
      startDate: new Date().toISOString().slice(0, 10),
    });
    setEditingId(null);
  }

  function startEditing(goal: Goal) {
    setEditingId(goal.id);

    setForm({
      title: goal.title,
      description: goal.description ?? "",
      category: goal.category ?? "",
      startDate: goal.startDate
        ? new Date(goal.startDate).toISOString().slice(0, 10)
        : "",
      endDate: goal.endDate
        ? new Date(goal.endDate).toISOString().slice(0, 10)
        : "",
      targetValue:
        goal.targetValue !== null ? String(goal.targetValue) : "",
      targetUnit: goal.targetUnit ?? "",
      status: goal.status,
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

    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.title.trim()) {
      setMessage("Goal title is required.");
      return;
    }

    if (!form.startDate) {
      setMessage("Start date is required.");
      return;
    }

    if (!allowedStatuses.includes(form.status)) {
      setMessage("Invalid goal status.");
      return;
    }

    const startDate = convertDateToISO(form.startDate);

    if (!startDate) {
      setMessage("Please enter a valid start date.");
      return;
    }

    const endDate = convertDateToISO(form.endDate);

    if (form.endDate && !endDate) {
      setMessage("Please enter a valid end date.");
      return;
    }

    if (
      form.endDate &&
      new Date(endDate!).getTime() < new Date(startDate).getTime()
    ) {
      setMessage("End date cannot be before the start date.");
      return;
    }

    let targetValue: number | null = null;

    if (form.targetValue.trim()) {
      const numericValue = Number(form.targetValue);

      if (!Number.isFinite(numericValue)) {
        setMessage("Please enter a valid target value.");
        return;
      }

      targetValue = numericValue;
    }

    setLoading(true);
    setMessage(editingId ? "Updating goal..." : "Adding goal...");

    const user = await getCurrentUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const goalData = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.category.trim() || null,
      startDate,
      endDate,
      targetValue,
      targetUnit: form.targetUnit.trim() || null,
      status: form.status,
    };

    if (editingId) {
      const { error } = await supabase
        .from("goals")
        .update(goalData)
        .eq("id", editingId)
        .eq("userId", user.id);

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      setMessage("Goal updated successfully!");
    } else {
      const { error } = await supabase.from("goals").insert({
        id: crypto.randomUUID(),
        userId: user.id,
        ...goalData,
      });

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      setMessage("Goal added successfully!");
    }

    resetForm();
    await loadGoals();
    setLoading(false);
  }

  async function handleDelete(goal: Goal) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${goal.title}"?`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(goal.id);
    setMessage("Deleting goal...");

    const user = await getCurrentUser();

    if (!user) {
      setDeletingId(null);
      return;
    }

    const { error } = await supabase
      .from("goals")
      .delete()
      .eq("id", goal.id)
      .eq("userId", user.id);

    if (error) {
      setMessage(error.message);
      setDeletingId(null);
      return;
    }

    setGoals((current) =>
      current.filter((item) => item.id !== goal.id)
    );

    if (editingId === goal.id) {
      resetForm();
    }

    setMessage("Goal deleted successfully!");
    setDeletingId(null);
  }

  return (
    <main>
      <h1>Goals</h1>

      <hr />

      <h2>{editingId ? "Edit Goal" : "Add Goal"}</h2>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="title">Goal Title</label>
          <br />
          <input
            id="title"
            type="text"
            value={form.title}
            onChange={(event) =>
              updateField("title", event.target.value)
            }
            placeholder="e.g. Walk 30 minutes daily"
            required
          />
        </div>

        <br />

        <div>
          <label htmlFor="description">Description</label>
          <br />
          <textarea
            id="description"
            value={form.description}
            onChange={(event) =>
              updateField("description", event.target.value)
            }
            placeholder="Describe your goal"
            rows={4}
          />
        </div>

        <br />

        <div>
          <label htmlFor="category">Category</label>
          <br />
          <input
            id="category"
            type="text"
            value={form.category}
            onChange={(event) =>
              updateField("category", event.target.value)
            }
            placeholder="e.g. Fitness, Nutrition, Sleep"
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
            onChange={(event) =>
              updateField("startDate", event.target.value)
            }
            required
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
            onChange={(event) =>
              updateField("endDate", event.target.value)
            }
          />
        </div>

        <br />

        <div>
          <label htmlFor="targetValue">Target Value</label>
          <br />
          <input
            id="targetValue"
            type="number"
            step="any"
            value={form.targetValue}
            onChange={(event) =>
              updateField("targetValue", event.target.value)
            }
            placeholder="e.g. 30"
          />
        </div>

        <br />

        <div>
          <label htmlFor="targetUnit">Target Unit</label>
          <br />
          <input
            id="targetUnit"
            type="text"
            value={form.targetUnit}
            onChange={(event) =>
              updateField("targetUnit", event.target.value)
            }
            placeholder="e.g. minutes, kg, steps"
          />
        </div>

        <br />

        <div>
          <label htmlFor="status">Status</label>
          <br />
          <select
            id="status"
            value={form.status}
            onChange={(event) =>
              updateField("status", event.target.value)
            }
          >
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="paused">Paused</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <br />

        <button type="submit" disabled={loading}>
          {loading
            ? editingId
              ? "Updating..."
              : "Adding..."
            : editingId
              ? "Update Goal"
              : "Add Goal"}
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

      <h2>Your Goals</h2>

      {goals.length > 0 ? (
        goals.map((goal) => (
          <section key={goal.id}>
            <h3>{goal.title}</h3>

            <p>
              <strong>Status:</strong> {goal.status}
            </p>

            {goal.description && (
              <p>
                <strong>Description:</strong> {goal.description}
              </p>
            )}

            {goal.category && (
              <p>
                <strong>Category:</strong> {goal.category}
              </p>
            )}

            <p>
              <strong>Start Date:</strong>{" "}
              {new Date(goal.startDate).toLocaleDateString()}
            </p>

            {goal.endDate && (
              <p>
                <strong>End Date:</strong>{" "}
                {new Date(goal.endDate).toLocaleDateString()}
              </p>
            )}

            {goal.targetValue !== null && (
              <p>
                <strong>Target:</strong> {goal.targetValue}{" "}
                {goal.targetUnit ?? ""}
              </p>
            )}

            <button
              type="button"
              onClick={() => startEditing(goal)}
              disabled={deletingId === goal.id}
            >
              Edit
            </button>

            {" "}

            <button
              type="button"
              onClick={() => handleDelete(goal)}
              disabled={deletingId === goal.id}
            >
              {deletingId === goal.id ? "Deleting..." : "Delete"}
            </button>

            <hr />
          </section>
        ))
      ) : (
        <p>No goals yet.</p>
      )}
    </main>
  );
}