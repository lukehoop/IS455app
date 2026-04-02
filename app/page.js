import Link from "next/link";

export default function HomePage() {
  return (
    <section className="page-card stack">
      <div>
        <h2>Operational Shop App</h2>
        <p className="muted">
          This scaffold uses the existing <span className="code-inline">shop.db</span> file at the
          project root and is ready for the customer selection, ordering, history, warehouse queue,
          and scoring features.
        </p>
      </div>

      <div className="stack">
        <Link href="/select-customer">Start by selecting a customer</Link>
        <Link href="/warehouse-priority-queue">Open the warehouse priority queue</Link>
      </div>
    </section>
  );
}
