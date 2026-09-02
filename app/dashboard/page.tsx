import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase-server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [
    profileResult,
    recordsResult,
    medicationsResult,
    conditionsResult,
    metricsResult,
    goalsResult,
    activitiesResult,
  ] = await Promise.all([
    supabase
      .from("users")
      .select("firstName, lastName, email")
      .eq("id", user.id)
      .single(),

    supabase
      .from("medical_records")
      .select("id", { count: "exact", head: true })
      .eq("userId", user.id),

    supabase
      .from("medications")
      .select("id", { count: "exact", head: true })
      .eq("userId", user.id)
      .eq("status", "active"),

    supabase
      .from("conditions")
      .select("id", { count: "exact", head: true })
      .eq("userId", user.id)
      .eq("status", "active"),

    supabase
      .from("health_metrics")
      .select(
        "id, metricType, value, unit, measuredAt"
      )
      .eq("userId", user.id)
      .order("measuredAt", { ascending: false })
      .limit(5),

    supabase
      .from("goals")
      .select("id, title, status, startDate, endDate")
      .eq("userId", user.id)
      .eq("status", "active")
      .order("createdAt", { ascending: false })
      .limit(5),

    supabase
      .from("activities")
      .select(
        "id, activityType, durationMinutes, distanceKm, caloriesBurned, completedAt"
      )
      .eq("userId", user.id)
      .order("completedAt", { ascending: false })
      .limit(5),
  ]);

  const profile = profileResult.data;

  const fullName =
    [profile?.firstName, profile?.lastName]
      .filter(Boolean)
      .join(" ") || "MediVault User";

  const recordCount = recordsResult.count ?? 0;
  const activeMedicationCount = medicationsResult.count ?? 0;
  const activeConditionCount = conditionsResult.count ?? 0;

  const healthMetrics = metricsResult.data ?? [];
  const activeGoals = goalsResult.data ?? [];
  const recentActivities = activitiesResult.data ?? [];

  return (
    <main>
      <h1>Welcome to MediVault</h1>

      <p>Logged in as: {user.email}</p>

      <hr />

      <h2>Hello, {fullName} 👋</h2>

      <p>
        Here is your current health overview.
      </p>

      <hr />

      <h2>Health Overview</h2>

      <section>
        <h3>Medical Records</h3>
        <p>
          <strong>{recordCount}</strong> records
        </p>
        <Link href="/records">View Medical Records</Link>
      </section>

      <section>
        <h3>Active Medications</h3>
        <p>
          <strong>{activeMedicationCount}</strong> active medications
        </p>
        <Link href="/medications">View Medications</Link>
      </section>

      <section>
        <h3>Active Conditions</h3>
        <p>
          <strong>{activeConditionCount}</strong> active conditions
        </p>
        <Link href="/conditions">View Conditions</Link>
      </section>

      <section>
        <h3>Health Metrics</h3>
        <p>
          <strong>{healthMetrics.length}</strong> recent measurements
        </p>
        <Link href="/health-metrics">View Health Metrics</Link>
      </section>

      <section>
        <h3>Active Goals</h3>
        <p>
          <strong>{activeGoals.length}</strong> active goals
        </p>
        <Link href="/goals">View Goals</Link>
      </section>

      <section>
        <h3>Recent Activities</h3>
        <p>
          <strong>{recentActivities.length}</strong> recent activities
        </p>
        <Link href="/activities">View Activities</Link>
      </section>

      <hr />

      <h2>Recent Health Metrics</h2>

      {healthMetrics.length > 0 ? (
        healthMetrics.map((metric) => (
          <section key={metric.id}>
            <h3>{metric.metricType}</h3>

            <p>
              <strong>Value:</strong> {metric.value} {metric.unit}
            </p>

            <p>
              <strong>Measured:</strong>{" "}
              {new Date(metric.measuredAt).toLocaleString()}
            </p>

            <hr />
          </section>
        ))
      ) : (
        <p>No health metrics recorded yet.</p>
      )}

      <h2>Active Goals</h2>

      {activeGoals.length > 0 ? (
        activeGoals.map((goal) => (
          <section key={goal.id}>
            <h3>{goal.title}</h3>

            <p>
              <strong>Status:</strong> {goal.status}
            </p>

            <p>
              <strong>Started:</strong>{" "}
              {new Date(goal.startDate).toLocaleDateString()}
            </p>

            {goal.endDate && (
              <p>
                <strong>Ends:</strong>{" "}
                {new Date(goal.endDate).toLocaleDateString()}
              </p>
            )}

            <hr />
          </section>
        ))
      ) : (
        <p>No active goals yet.</p>
      )}

      <h2>Recent Activities</h2>

      {recentActivities.length > 0 ? (
        recentActivities.map((activity) => (
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
                <strong>Calories:</strong>{" "}
                {activity.caloriesBurned}
              </p>
            )}

            <p>
              <strong>Completed:</strong>{" "}
              {new Date(activity.completedAt).toLocaleString()}
            </p>

            <hr />
          </section>
        ))
      ) : (
        <p>No activities recorded yet.</p>
      )}

      <hr />

      <h2>AI Health Assistant</h2>

      <p>
        Your AI health assistant will be connected during Phase 2.
      </p>

      <hr />

      <Link href="/profile">Manage Profile</Link>

      <br />
      <br />

      <form
        action={async () => {
          "use server";

          const supabase = await createClient();
          await supabase.auth.signOut();

          redirect("/login");
        }}
      >
        <button type="submit">Logout</button>
      </form>
    </main>
  );
}