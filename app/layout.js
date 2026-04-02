import Link from "next/link";
import { cookies } from "next/headers";
import { getCustomerById } from "@/lib/db";
import "./globals.css";

export const metadata = {
  title: "Shop Operations App",
  description: "Simple Next.js app for ordering, history, and warehouse scoring."
};

const navItems = [
  { href: "/select-customer", label: "Select Customer" },
  { href: "/dashboard", label: "Customer Dashboard" },
  { href: "/place-order", label: "Place Order" },
  { href: "/orders", label: "Order History" },
  { href: "/warehouse/priority", label: "Warehouse Priority Queue" },
  { href: "/run-scoring", label: "Run Scoring" }
];

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const selectedCustomerId = cookieStore.get("customer_id")?.value;
  const selectedCustomer = await getCustomerById(selectedCustomerId);

  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <aside className="sidebar">
            <h1>Shop Ops</h1>
            <nav className="nav-links">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>
          <main className="content">
            {selectedCustomer ? (
              <div className="customer-banner">
                Acting as{" "}
                <strong>
                  {selectedCustomer.first_name} {selectedCustomer.last_name}
                </strong>{" "}
                <span className="muted">({selectedCustomer.email})</span>
              </div>
            ) : (
              <div className="customer-banner">
                <span className="muted">No customer selected.</span>
              </div>
            )}
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
