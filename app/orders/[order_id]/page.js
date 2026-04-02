import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import {
  getCustomerById,
  getFriendlyErrorMessage,
  getOrderDetailsForCustomer
} from "@/lib/db";

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(value ?? 0);
}

export default async function OrderDetailPage({ params }) {
  const cookieStore = await cookies();
  const selectedCustomerId = cookieStore.get("customer_id")?.value;

  if (!selectedCustomerId) {
    redirect("/select-customer");
  }

  const customer = getCustomerById(selectedCustomerId);

  if (!customer) {
    redirect("/select-customer");
  }

  const resolvedParams = await params;
  const orderId = resolvedParams?.order_id;
  let orderDetails;
  let loadError = "";

  try {
    orderDetails = getOrderDetailsForCustomer(selectedCustomerId, orderId);
  } catch (error) {
    loadError = getFriendlyErrorMessage(error);
  }

  if (loadError) {
    return (
      <section className="page-card stack">
        <div className="row">
          <Link className="button secondary" href="/orders">
            Back to Orders
          </Link>
        </div>
        <h2>Order Details</h2>
        <div className="error-banner">{loadError}</div>
      </section>
    );
  }

  if (!orderDetails) {
    notFound();
  }

  const { order, lineItems } = orderDetails;

  return (
    <section className="page-card stack">
      <div className="row">
        <Link className="button secondary" href="/orders">
          Back to Orders
        </Link>
      </div>

      <div>
        <h2>Order #{order.order_id}</h2>
        <p className="muted">
          {customer.full_name} | {order.order_timestamp} | Fulfilled:{" "}
          {order.fulfilled ? "Yes" : "No"}
        </p>
      </div>

      <div className="stat-card">
        <h3>Total Value</h3>
        <div className="stat-value">{formatCurrency(order.total_value)}</div>
      </div>

      <div className="table-block">
        <h3>Line Items</h3>
        <table className="schema-table">
          <thead>
            <tr>
              <th>Product Name</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Line Total</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, index) => (
              <tr key={`${item.product_name}-${index}`}>
                <td>{item.product_name}</td>
                <td>{item.quantity}</td>
                <td>{formatCurrency(item.unit_price)}</td>
                <td>{formatCurrency(item.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
