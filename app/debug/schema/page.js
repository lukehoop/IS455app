import { getSchemaDetails } from "@/lib/db";

export const metadata = {
  title: "Debug Schema"
};

export default async function DebugSchemaPage() {
  const schema = await getSchemaDetails();

  return (
    <section className="page-card stack">
      <div>
        <h2>Database Schema Debug View</h2>
        <p className="muted">
          Developer-only page for inspecting the expected Supabase schema used by this app.
        </p>
      </div>

      <div className="table-block">
        <h3>Tables</h3>
        <p>{schema.map((table) => table.name).join(", ") || "No tables found."}</p>
      </div>

      {schema.map((table) => (
        <div key={table.name} className="table-block">
          <h3>{table.name}</h3>
          <table className="schema-table">
            <thead>
              <tr>
                <th>Column</th>
                <th>Type</th>
                <th>Nullable</th>
                <th>Default</th>
                <th>Primary Key</th>
              </tr>
            </thead>
            <tbody>
              {table.columns.map((column) => (
                <tr key={`${table.name}-${column.name}`}>
                  <td>
                    <span className="code-inline">{column.name}</span>
                  </td>
                  <td>{column.type || "UNKNOWN"}</td>
                  <td>{column.notnull ? "No" : "Yes"}</td>
                  <td>{column.dflt_value ?? "-"}</td>
                  <td>{column.pk ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </section>
  );
}
