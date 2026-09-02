"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";

type HealthMetric = {
  id: string;
  metricType: string;
  value: number;
  unit: string;
  measuredAt: string;
  source: string | null;
};

type MetricForm = {
  metricType: string;
  value: string;
  unit: string;
  measuredDate: string;
  measuredTime: string;
  source: string;
};

const emptyForm: MetricForm = {
  metricType: "weight",
  value: "",
  unit: "kg",
  measuredDate: new Date().toISOString().slice(0, 10),
  measuredTime: new Date().toTimeString().slice(0, 5),
  source: "",
};

const metricTypes = [
  {
    value: "weight",
    label: "Weight",
    unit: "kg",
  },
  {
    value: "height",
    label: "Height",
    unit: "cm",
  },
  {
    value: "blood_glucose",
    label: "Blood Glucose",
    unit: "mg/dL",
  },
  {
    value: "heart_rate",
    label: "Heart Rate",
    unit: "bpm",
  },
  {
    value: "oxygen_saturation",
    label: "Oxygen Saturation",
    unit: "%",
  },
  {
    value: "temperature",
    label: "Temperature",
    unit: "°C",
  },
  {
    value: "systolic_blood_pressure",
    label: "Systolic Blood Pressure",
    unit: "mmHg",
  },
  {
    value: "diastolic_blood_pressure",
    label: "Diastolic Blood Pressure",
    unit: "mmHg",
  },
];

export default function HealthMetricsPage() {
  const router = useRouter();

  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [form, setForm] = useState<MetricForm>(emptyForm);
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

  async function loadMetrics() {
    const user = await getCurrentUser();

    if (!user) {
      return;
    }

    const { data, error } = await supabase
      .from("health_metrics")
      .select("id, metricType, value, unit, measuredAt, source")
      .eq("userId", user.id)
      .order("measuredAt", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMetrics(data ?? []);
  }

  useEffect(() => {
    loadMetrics();
  }, []);

  function updateField(field: keyof MetricForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleMetricTypeChange(value: string) {
    const selectedMetric = metricTypes.find(
      (metric) => metric.value === value
    );

    setForm((current) => ({
      ...current,
      metricType: value,
      unit: selectedMetric?.unit ?? "",
    }));
  }

  function resetForm() {
    setForm({
      ...emptyForm,
      measuredDate: new Date().toISOString().slice(0, 10),
      measuredTime: new Date().toTimeString().slice(0, 5),
    });
    setEditingId(null);
  }

  function startEditing(metric: HealthMetric) {
    const measuredDate = new Date(metric.measuredAt);

    setEditingId(metric.id);

    setForm({
      metricType: metric.metricType,
      value: String(metric.value),
      unit: metric.unit,
      measuredDate: measuredDate.toISOString().slice(0, 10),
      measuredTime: measuredDate.toTimeString().slice(0, 5),
      source: metric.source ?? "",
    });

    setMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.metricType) {
      setMessage("Metric type is required.");
      return;
    }

    const numericValue = Number(form.value);

    if (!form.value.trim() || !Number.isFinite(numericValue)) {
      setMessage("Please enter a valid numeric value.");
      return;
    }

    if (!form.unit.trim()) {
      setMessage("Unit is required.");
      return;
    }

    if (!form.measuredDate || !form.measuredTime) {
      setMessage("Measurement date and time are required.");
      return;
    }

    const measuredAt = new Date(
      `${form.measuredDate}T${form.measuredTime}`
    );

    if (Number.isNaN(measuredAt.getTime())) {
      setMessage("Please enter a valid measurement date and time.");
      return;
    }

    setLoading(true);
    setMessage(editingId ? "Updating metric..." : "Adding metric...");

    const user = await getCurrentUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const metricData = {
      metricType: form.metricType,
      value: numericValue,
      unit: form.unit.trim(),
      measuredAt: measuredAt.toISOString(),
      source: form.source.trim() || null,
    };

    if (editingId) {
      const { error } = await supabase
        .from("health_metrics")
        .update(metricData)
        .eq("id", editingId)
        .eq("userId", user.id);

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      setMessage("Health metric updated successfully!");
    } else {
      const { error } = await supabase.from("health_metrics").insert({
        id: crypto.randomUUID(),
        userId: user.id,
        ...metricData,
      });

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      setMessage("Health metric added successfully!");
    }

    resetForm();
    await loadMetrics();
    setLoading(false);
  }

  async function handleDelete(metric: HealthMetric) {
    const confirmed = window.confirm(
      `Are you sure you want to delete this ${metric.metricType} measurement?`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(metric.id);
    setMessage("Deleting metric...");

    const user = await getCurrentUser();

    if (!user) {
      setDeletingId(null);
      return;
    }

    const { error } = await supabase
      .from("health_metrics")
      .delete()
      .eq("id", metric.id)
      .eq("userId", user.id);

    if (error) {
      setMessage(error.message);
      setDeletingId(null);
      return;
    }

    setMetrics((current) =>
      current.filter((item) => item.id !== metric.id)
    );

    if (editingId === metric.id) {
      resetForm();
    }

    setMessage("Health metric deleted successfully!");
    setDeletingId(null);
  }

  return (
    <main>
      <h1>Health Metrics</h1>

      <hr />

      <h2>{editingId ? "Edit Health Metric" : "Add Health Metric"}</h2>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="metricType">Metric Type</label>
          <br />
          <select
            id="metricType"
            value={form.metricType}
            onChange={(event) =>
              handleMetricTypeChange(event.target.value)
            }
          >
            {metricTypes.map((metric) => (
              <option key={metric.value} value={metric.value}>
                {metric.label}
              </option>
            ))}
          </select>
        </div>

        <br />

        <div>
          <label htmlFor="value">Value</label>
          <br />
          <input
            id="value"
            type="number"
            step="any"
            value={form.value}
            onChange={(event) =>
              updateField("value", event.target.value)
            }
            placeholder="e.g. 72.5"
            required
          />
        </div>

        <br />

        <div>
          <label htmlFor="unit">Unit</label>
          <br />
          <input
            id="unit"
            type="text"
            value={form.unit}
            onChange={(event) =>
              updateField("unit", event.target.value)
            }
            required
          />
        </div>

        <br />

        <div>
          <label htmlFor="measuredDate">Measurement Date</label>
          <br />
          <input
            id="measuredDate"
            type="date"
            value={form.measuredDate}
            onChange={(event) =>
              updateField("measuredDate", event.target.value)
            }
            required
          />
        </div>

        <br />

        <div>
          <label htmlFor="measuredTime">Measurement Time</label>
          <br />
          <input
            id="measuredTime"
            type="time"
            value={form.measuredTime}
            onChange={(event) =>
              updateField("measuredTime", event.target.value)
            }
            required
          />
        </div>

        <br />

        <div>
          <label htmlFor="source">Source</label>
          <br />
          <input
            id="source"
            type="text"
            value={form.source}
            onChange={(event) =>
              updateField("source", event.target.value)
            }
            placeholder="e.g. Manual, Smartwatch, Lab"
          />
        </div>

        <br />

        <button type="submit" disabled={loading}>
          {loading
            ? editingId
              ? "Updating..."
              : "Adding..."
            : editingId
              ? "Update Metric"
              : "Add Metric"}
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

      <h2>Your Health Metrics</h2>

      {metrics.length > 0 ? (
        metrics.map((metric) => (
          <section key={metric.id}>
            <h3>{metric.metricType}</h3>

            <p>
              <strong>Value:</strong> {metric.value} {metric.unit}
            </p>

            <p>
              <strong>Measured At:</strong>{" "}
              {new Date(metric.measuredAt).toLocaleString()}
            </p>

            {metric.source && (
              <p>
                <strong>Source:</strong> {metric.source}
              </p>
            )}

            <button
              type="button"
              onClick={() => startEditing(metric)}
              disabled={deletingId === metric.id}
            >
              Edit
            </button>

            {" "}

            <button
              type="button"
              onClick={() => handleDelete(metric)}
              disabled={deletingId === metric.id}
            >
              {deletingId === metric.id ? "Deleting..." : "Delete"}
            </button>

            <hr />
          </section>
        ))
      ) : (
        <p>No health metrics yet.</p>
      )}
    </main>
  );
}