export default function RunScoringPage() {
  return (
    <section className="page-card stack">
      <div>
        <h2>Run Scoring</h2>
        <p className="muted">
          This app is ready for a scoring step, but the current workspace does not yet include the
          inference trigger or the <span className="code-inline">fraud_predictions</span> table
          needed to populate the warehouse queue.
        </p>
      </div>

      <div className="table-block">
        <p className="muted">
          After your ML pipeline writes predictions back into{" "}
          <span className="code-inline">fraud_predictions</span>
          , this page can be upgraded to run the scoring job and then redirect to{" "}
          <span className="code-inline">/warehouse/priority</span>.
        </p>
      </div>
    </section>
  );
}
