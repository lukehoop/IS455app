import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCustomerById, getFriendlyErrorMessage, getOrdersForCustomer } from "@/lib/db";

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(value ?? 0);
}

export default async function OrdersPage({ searchParams }) {
  const cookieStore = await cookies();
  const selectedCustomerId = cookieStore.get("customer_id")?.value;

  if (!selectedCustomerId) {
    redirect("/select-customer");
  }

  const customer = getCustomerById(selectedCustomerId);

  if (!customer) {
    redirect("/select-customer");
  }

  let orders = [];
  let loadError = "";

  try {
    orders = getOrdersForCustomer(selectedCustomerId);
  } catch (error) {
    loadError = getFriendlyErrorMessage(error);
  }

  const params = await searchParams;
  const success = params?.success === "1";
  const orderId = typeof params?.orderId === "string" ? params.orderId : "";

  return (
    <section className="page-card stack">
      {success ? (
        <div className="success-banner">
          Order placed successfully{orderId ? ` (#${orderId})` : ""}.
        </div>
      ) : null}

      <div>
        <h2>Order History</h2>
        <p className="muted">All orders for {customer.full_name} from `shop.db`.</p>
      </div>

      {loadError ? <div className="error-banner">{loadError}</div> : null}

      <div className="table-block">
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
            {orders.length > 0 ? (
              orders.map((order) => (
                <tr key={order.order_id}>
                  <td>
                    <Link className="text-link" href={`/orders/${order.order_id}`}>
                      #{order.order_id}
                    </Link>
                  </td>
                  <td>{order.order_timestamp}</td>
                  <td>{order.fulfilled ? "Yes" : "No"}</td>
                  <td>{formatCurrency(order.total_value)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="muted">
                  {loadError ? "Orders are unavailable." : "No orders found for this customer."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="row">
        <Link className="button secondary" href="/place-order">
          Place Another Order
        </Link>
      </div>
    </section>
  );
}
