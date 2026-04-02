import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCustomers, getFriendlyErrorMessage } from "@/lib/db";

async function selectCustomer(formData) {
  "use server";

  const customerId = formData.get("customer_id");

  if (!customerId) {
    return;
  }

  const cookieStore = await cookies();
  cookieStore.set("customer_id", String(customerId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/"
  });

  redirect("/dashboard");
}

export default async function SelectCustomerPage({ searchParams }) {
  const params = await searchParams;
  const search = typeof params?.search === "string" ? params.search : "";
  let customers = [];
  let loadError = "";

  try {
    customers = getCustomers(search);
  } catch (error) {
    loadError = getFriendlyErrorMessage(error);
  }

  return (
    <section className="page-card stack">
      <div>
        <h2>Select Customer</h2>
        <p className="muted">
          Search the operational database and choose an existing customer to act as for testing.
        </p>
      </div>

      <form action="/select-customer" className="row">
        <input
          className="search-input"
          type="search"
          name="search"
          placeholder="Search by name or email"
          defaultValue={search}
        />
        <button className="button secondary" type="submit">
          Search
        </button>
      </form>

      {loadError ? <div className="error-banner">{loadError}</div> : null}

      <div className="customer-list">
        {customers.length > 0 ? (
          customers.map((customer) => (
            <form key={customer.customer_id} action={selectCustomer} className="customer-item">
              <div>
                <strong>
                  {customer.first_name} {customer.last_name}
                </strong>
                <div className="muted">{customer.email}</div>
                <div className="muted">
                  Customer ID: <span className="code-inline">{customer.customer_id}</span>
                </div>
              </div>
              <input type="hidden" name="customer_id" value={customer.customer_id} />
              <button className="button" type="submit">
                Select
              </button>
            </form>
          ))
        ) : (
          <div className="table-block">
            <p className="muted">
              {loadError ? "Customer list unavailable." : "No customers matched your search."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
