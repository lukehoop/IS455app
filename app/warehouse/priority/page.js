import { getFriendlyErrorMessage, getWarehousePriorityQueue } from "@/lib/db";

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(value ?? 0);
}

function formatProbability(value) {
  if (value === null || value === undefined) {
    return "-";
  }

  return `${(Number(value) * 100).toFixed(1)}%`;
}

export default function WarehousePriorityPage() {
  let queue = { available: false, rows: [] };
  let loadError = "";

  try {
    queue = getWarehousePriorityQueue();
  } catch (error) {
    loadError = getFriendlyErrorMessage(error);
  }

  return (
    <section className="page-card stack">
      <div>
        <h2>Late Delivery Priority Queue</h2>
        <p className="muted">
          This queue helps warehouse staff focus first on open orders that the model believes are
          most likely to be delivered late, so they can prioritize intervention where it may matter
          most.
        </p>
      </div>

      {loadError ? <div className="error-banner">{loadError}</div> : null}

      {!loadError && !queue.available ? (
        <div className="table-block">
          <p className="muted">
            The <span className="code-inline">order_predictions</span> table is not available in the
            current <span className="code-inline">shop.db</span>, so the priority queue cannot be
            displayed yet.
          </p>
        </div>
      ) : !loadError ? (
        <div className="table-block">
          <table className="schema-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Order Timestamp</th>
                <th>Total Value</th>
                <th>Fulfilled</th>
                <th>Customer ID</th>
                <th>Customer Name</th>
                <th>Late Delivery Probability</th>
                <th>Predicted Late Delivery</th>
                <th>Prediction Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {queue.rows.length > 0 ? (
                queue.rows.map((row) => (
                  <tr key={row.order_id}>
                    <td>
                      <span className="code-inline">{row.order_id}</span>
                    </td>
                    <td>{row.order_timestamp}</td>
                    <td>{formatCurrency(row.total_value)}</td>
                    <td>{row.fulfilled ? "Yes" : "No"}</td>
                    <td>{row.customer_id}</td>
                    <td>{row.customer_name}</td>
                    <td>{formatProbability(row.late_delivery_probability)}</td>
                    <td>{row.predicted_late_delivery ? "Yes" : "No"}</td>
                    <td>{row.prediction_timestamp}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="muted">
                    No priority queue rows are available yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
