import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createOrderForCustomer,
  getCustomerById,
  getFriendlyErrorMessage,
  getProducts
} from "@/lib/db";

async function placeOrder(formData) {
  "use server";

  const cookieStore = await cookies();
  const customerId = cookieStore.get("customer_id")?.value;

  if (!customerId) {
    redirect("/select-customer");
  }

  const productIds = formData.getAll("product_id");
  const quantities = formData.getAll("quantity");
  const items = productIds
    .map((productId, index) => ({
      productId: String(productId).trim(),
      quantity: Number.parseInt(String(quantities[index] ?? "0"), 10)
    }))
    .filter((item) => item.productId);

  if (items.some((item) => !Number.isInteger(item.quantity) || item.quantity <= 0)) {
    redirect("/place-order?error=Each selected line item must have a whole-number quantity.");
  }

  let result;

  try {
    result = await createOrderForCustomer(customerId, items);
  } catch (error) {
    const message = getFriendlyErrorMessage(error);
    redirect(`/place-order?error=${encodeURIComponent(message)}`);
  }

  redirect(`/orders?success=1&orderId=${result.orderId}`);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(value ?? 0);
}

export default async function PlaceOrderPage({ searchParams }) {
  const cookieStore = await cookies();
  const selectedCustomerId = cookieStore.get("customer_id")?.value;

  if (!selectedCustomerId) {
    redirect("/select-customer");
  }

  const customer = await getCustomerById(selectedCustomerId);

  if (!customer) {
    redirect("/select-customer");
  }

  const params = await searchParams;
  const error = typeof params?.error === "string" ? params.error : "";
  let products = [];
  let loadError = "";

  try {
    products = await getProducts();
  } catch (dbError) {
    loadError = getFriendlyErrorMessage(dbError);
  }

  return (
    <section className="page-card stack">
      <div>
        <h2>Place Order</h2>
        <p className="muted">
          Create a new order for <strong>{customer.full_name}</strong>.
        </p>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}
      {loadError ? <div className="error-banner">{loadError}</div> : null}

      <form action={placeOrder} className="stack">
        <div className="table-block">
          <h3>Line Items</h3>
          <p className="muted">Choose one or more products and enter quantities.</p>

          {products.length > 0 ? (
            <div className="line-items-grid">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="line-item-row">
                  <select
                    className="select-input"
                    name="product_id"
                    defaultValue=""
                    required={index === 0}
                  >
                    <option value="">Select a product</option>
                    {products.map((product) => (
                      <option key={product.product_id} value={product.product_id}>
                        {product.product_name} ({formatCurrency(product.price)})
                      </option>
                    ))}
                  </select>

                  <input
                    className="number-input"
                    type="number"
                    name="quantity"
                    min="1"
                    max="99"
                    step="1"
                    defaultValue="1"
                    required={index === 0}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">No active products are available for ordering.</p>
          )}
        </div>

        <div className="row">
          <button className="button" type="submit" disabled={products.length === 0}>
            Place Order
          </button>
        </div>
      </form>
    </section>
  );
}
