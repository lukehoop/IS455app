import Link from "next/link";

export default function HomePage() {
  return (
    <section className="page-card stack">
      <div>
        <h2>Operational Shop App</h2>
        <p className="muted">
          This app uses Supabase through environment variables and is ready for customer selection,
          ordering, history, warehouse queue, and scoring-related features.
        </p>
      </div>

      <div className="stack">
        <Link href="/select-customer">Start by selecting a customer</Link>
        <Link href="/warehouse-priority-queue">Open the warehouse priority queue</Link>
      </div>
    </section>
  );
}
