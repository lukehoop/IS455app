import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCustomerDashboard, getFriendlyErrorMessage } from "@/lib/db";

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(value ?? 0);
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const selectedCustomerId = cookieStore.get("customer_id")?.value;

  if (!selectedCustomerId) {
    redirect("/select-customer");
  }

  let dashboard;
  let loadError = "";

  try {
    dashboard = await getCustomerDashboard(selectedCustomerId);
  } catch (error) {
    loadError = getFriendlyErrorMessage(error);
  }

  if (loadError) {
    return (
      <section className="page-card stack">
        <h2>Customer Dashboard</h2>
        <div className="error-banner">{loadError}</div>
      </section>
    );
  }

  if (!dashboard) {
    redirect("/select-customer");
  }

  const { customer, stats, recentOrders } = dashboard;

  return (
    <section className="page-card stack">
      <div>
        <h2>Customer Dashboard</h2>
        <p className="muted">Summary for the currently selected customer from Supabase.</p>
      </div>

      <div className="table-block">
        <h3>
          {customer.first_name} {customer.last_name}
        </h3>
        <p className="muted">{customer.email}</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Orders</h3>
          <div className="stat-value">{stats.total_orders}</div>
        </div>
        <div className="stat-card">
          <h3>Total Spend</h3>
          <div className="stat-value">{formatCurrency(stats.total_spend)}</div>
        </div>
      </div>

      <div className="table-block">
        <h3>5 Most Recent Orders</h3>
        <table className="schema-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Order Timestamp</th>
              <th>Fulfilled</th>
              <th>Total Value</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.length > 0 ? (
              recentOrders.map((order) => (
                <tr key={order.order_id}>
                  <td>
                    <span className="code-inline">{order.order_id}</span>
                  </td>
                  <td>{order.order_timestamp}</td>
                  <td>{order.fulfilled ? "Yes" : "No"}</td>
                  <td>{formatCurrency(order.total_value)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="muted">
                  No orders found for this customer.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
