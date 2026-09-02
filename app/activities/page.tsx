"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";

type Activity = {
  id: string;
  activityType: string;
  caloriesBurned: number | null;
  distanceKm: number | null;
  durationMinutes: number | null;
  goalId: string | null;
  completedAt: string;
  notes: string | null;
};

type Goal = {
  id: string;
  title: string;
  status: string;
};

type ActivityForm = {
  activityType: string;
  caloriesBurned: string;
  distanceKm: string;
  durationMinutes: string;
  goalId: string;
  completedDate: string;
  completedTime: string;
  notes: string;
};

const emptyForm: ActivityForm = {
  activityType: "walking",
  caloriesBurned: "",
  distanceKm: "",
  durationMinutes: "",
  goalId: "",
  completedDate: new Date().toISOString().slice(0, 10),
  completedTime: new Date().toTimeString().slice(0, 5),
  notes: "",
};

const activityTypes = [
  { value: "walking", label: "Walking" },
  { value: "running", label: "Running" },
  { value: "yoga", label: "Yoga" },
  { value: "cycling", label: "Cycling" },
  { value: "swimming", label: "Swimming" },
  { value: "strength_training", label: "Strength Training" },
  { value: "meditation", label: "Meditation" },
  { value: "breathing", label: "Breathing" },
  { value: "other", label: "Other" },
];

export default function ActivitiesPage() {
  const router = useRouter();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [form, setForm] = useState<ActivityForm>(emptyForm);
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

  async function loadActivities() {
    const user = await getCurrentUser();

    if (!user) {
      return;
    }

    const { data, error } = await supabase
      .from("activities")
      .select(
        "id, activityType, caloriesBurned, distanceKm, durationMinutes, goalId, completedAt, notes"
      )
      .eq("userId", user.id)
      .order("completedAt", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setActivities(data ?? []);
  }

  async function loadGoals() {
    const user = await getCurrentUser();

    if (!user) {
      return;
    }

    const { data, error } = await supabase
      .from("goals")
      .select("id, title, status")
      .eq("userId", user.id)
      .order("createdAt", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setGoals(data ?? []);
  }

  useEffect(() => {
    loadActivities();
    loadGoals();
  }, []);

  function updateField(field: keyof ActivityForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm({
      ...emptyForm,
      completedDate: new Date().toISOString().slice(0, 10),
      completedTime: new Date().toTimeString().slice(0, 5),
    });

    setEditingId(null);
  }

  function startEditing(activity: Activity) {
    const completedAt = new Date(activity.completedAt);

    setEditingId(activity.id);

    setForm({
      activityType: activity.activityType,
      caloriesBurned:
        activity.caloriesBurned !== null
          ? String(activity.caloriesBurned)
          : "",
      distanceKm:
        activity.distanceKm !== null ? String(activity.distanceKm) : "",
      durationMinutes:
        activity.durationMinutes !== null
          ? String(activity.durationMinutes)
          : "",
      goalId: activity.goalId ?? "",
      completedDate: completedAt.toISOString().slice(0, 10),
      completedTime: completedAt.toTimeString().slice(0, 5),
      notes: activity.notes ?? "",
    });

    setMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.activityType) {
      setMessage("Activity type is required.");
      return;
    }

    if (!form.completedDate || !form.completedTime) {
      setMessage("Completion date and time are required.");
      return;
    }

    const completedAt = new Date(
      `${form.completedDate}T${form.completedTime}`
    );

    if (Number.isNaN(completedAt.getTime())) {
      setMessage("Please enter a valid completion date and time.");
      return;
    }

    function parseOptionalNumber(value: string) {
      if (!value.trim()) {
        return null;
      }

      const number = Number(value);

      return Number.isFinite(number) ? number : null;
    }

    const caloriesBurned = parseOptionalNumber(form.caloriesBurned);
    const distanceKm = parseOptionalNumber(form.distanceKm);
    const durationMinutes = parseOptionalNumber(form.durationMinutes);

    if (
      (form.caloriesBurned.trim() && caloriesBurned === null) ||
      (form.distanceKm.trim() && distanceKm === null) ||
      (form.durationMinutes.trim() && durationMinutes === null)
    ) {
      setMessage("Please enter valid numeric activity values.");
      return;
    }

    if (
      durationMinutes !== null &&
      (!Number.isInteger(durationMinutes) || durationMinutes < 0)
    ) {
      setMessage("Duration must be a whole number of minutes.");
      return;
    }

    if (caloriesBurned !== null && caloriesBurned < 0) {
      setMessage("Calories burned cannot be negative.");
      return;
    }

    if (distanceKm !== null && distanceKm < 0) {
      setMessage("Distance cannot be negative.");
      return;
    }

    setLoading(true);
    setMessage(editingId ? "Updating activity..." : "Adding activity...");

    const user = await getCurrentUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const activityData = {
      activityType: form.activityType,
      caloriesBurned,
      distanceKm,
      durationMinutes:
        durationMinutes !== null ? Math.trunc(durationMinutes) : null,
      goalId: form.goalId || null,
      completedAt: completedAt.toISOString(),
      notes: form.notes.trim() || null,
    };

    if (editingId) {
      const { error } = await supabase
        .from("activities")
        .update(activityData)
        .eq("id", editingId)
        .eq("userId", user.id);

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      setMessage("Activity updated successfully!");
    } else {
      const { error } = await supabase.from("activities").insert({
        id: crypto.randomUUID(),
        userId: user.id,
        ...activityData,
      });

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      setMessage("Activity added successfully!");
    }

    resetForm();
    await loadActivities();
    setLoading(false);
  }

  async function handleDelete(activity: Activity) {
    const confirmed = window.confirm(
      `Are you sure you want to delete this ${activity.activityType} activity?`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(activity.id);
    setMessage("Deleting activity...");

    const user = await getCurrentUser();

    if (!user) {
      setDeletingId(null);
      return;
    }

    const { error } = await supabase
      .from("activities")
      .delete()
      .eq("id", activity.id)
      .eq("userId", user.id);

    if (error) {
      setMessage(error.message);
      setDeletingId(null);
      return;
    }

    setActivities((current) =>
      current.filter((item) => item.id !== activity.id)
    );

    if (editingId === activity.id) {
      resetForm();
    }

    setMessage("Activity deleted successfully!");
    setDeletingId(null);
  }

  function getGoalTitle(goalId: string | null) {
    if (!goalId) {
      return null;
    }

    return goals.find((goal) => goal.id === goalId)?.title ?? null;
  }

  return (
    <main>
      <h1>Activities</h1>

      <hr />

      <h2>{editingId ? "Edit Activity" : "Add Activity"}</h2>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="activityType">Activity Type</label>
          <br />
          <select
            id="activityType"
            value={form.activityType}
            onChange={(event) =>
              updateField("activityType", event.target.value)
            }
          >
            {activityTypes.map((activity) => (
              <option key={activity.value} value={activity.value}>
                {activity.label}
              </option>
            ))}
          </select>
        </div>

        <br />

        <div>
          <label htmlFor="durationMinutes">Duration (minutes)</label>
          <br />
          <input
            id="durationMinutes"
            type="number"
            min="0"
            step="1"
            value={form.durationMinutes}
            onChange={(event) =>
              updateField("durationMinutes", event.target.value)
            }
            placeholder="e.g. 30"
          />
        </div>

        <br />

        <div>
          <label htmlFor="distanceKm">Distance (km)</label>
          <br />
          <input
            id="distanceKm"
            type="number"
            min="0"
            step="any"
            value={form.distanceKm}
            onChange={(event) =>
              updateField("distanceKm", event.target.value)
            }
            placeholder="e.g. 3.5"
          />
        </div>

        <br />

        <div>
          <label htmlFor="caloriesBurned">Calories Burned</label>
          <br />
          <input
            id="caloriesBurned"
            type="number"
            min="0"
            step="any"
            value={form.caloriesBurned}
            onChange={(event) =>
              updateField("caloriesBurned", event.target.value)
            }
            placeholder="e.g. 220"
          />
        </div>

        <br />

        <div>
          <label htmlFor="goalId">Linked Goal</label>
          <br />
          <select
            id="goalId"
            value={form.goalId}
            onChange={(event) =>
              updateField("goalId", event.target.value)
            }
          >
            <option value="">No goal</option>

            {goals.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.title} ({goal.status})
              </option>
            ))}
          </select>
        </div>

        <br />

        <div>
          <label htmlFor="completedDate">Completion Date</label>
          <br />
          <input
            id="completedDate"
            type="date"
            value={form.completedDate}
            onChange={(event) =>
              updateField("completedDate", event.target.value)
            }
            required
          />
        </div>

        <br />

        <div>
          <label htmlFor="completedTime">Completion Time</label>
          <br />
          <input
            id="completedTime"
            type="time"
            value={form.completedTime}
            onChange={(event) =>
              updateField("completedTime", event.target.value)
            }
            required
          />
        </div>

        <br />

        <div>
          <label htmlFor="notes">Notes</label>
          <br />
          <textarea
            id="notes"
            value={form.notes}
            onChange={(event) =>
              updateField("notes", event.target.value)
            }
            placeholder="Additional information"
            rows={4}
          />
        </div>

        <br />

        <button type="submit" disabled={loading}>
          {loading
            ? editingId
              ? "Updating..."
              : "Adding..."
            : editingId
              ? "Update Activity"
              : "Add Activity"}
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

      <h2>Your Activities</h2>

      {activities.length > 0 ? (
        activities.map((activity) => {
          const goalTitle = getGoalTitle(activity.goalId);

          return (
            <section key={activity.id}>
              <h3>{activity.activityType}</h3>

              {activity.durationMinutes !== null && (
                <p>
                  <strong>Duration:</strong>{" "}
                  {activity.durationMinutes} minutes
                </p>
              )}

              {activity.distanceKm !== null && (
                <p>
                  <strong>Distance:</strong>{" "}
                  {activity.distanceKm} km
                </p>
              )}

              {activity.caloriesBurned !== null && (
                <p>
                  <strong>Calories Burned:</strong>{" "}
                  {activity.caloriesBurned}
                </p>
              )}

              <p>
                <strong>Completed At:</strong>{" "}
                {new Date(activity.completedAt).toLocaleString()}
              </p>

              {goalTitle && (
                <p>
                  <strong>Goal:</strong> {goalTitle}
                </p>
              )}

              {activity.notes && (
                <p>
                  <strong>Notes:</strong> {activity.notes}
                </p>
              )}

              <button
                type="button"
                onClick={() => startEditing(activity)}
                disabled={deletingId === activity.id}
              >
                Edit
              </button>

              {" "}

              <button
                type="button"
                onClick={() => handleDelete(activity)}
                disabled={deletingId === activity.id}
              >
                {deletingId === activity.id
                  ? "Deleting..."
                  : "Delete"}
              </button>

              <hr />
            </section>
          );
        })
      ) : (
        <p>No activities yet.</p>
      )}
    </main>
  );
}