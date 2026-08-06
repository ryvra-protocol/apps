import type { ReactNode } from "react";

export interface DataTableColumn<Row extends object, Key extends keyof Row = keyof Row> {
  key: Key;
  header: string;
  render?: (value: Row[Key], row: Row) => ReactNode;
}

export interface DataTableProps<Row extends object> {
  columns: Array<DataTableColumn<Row>>;
  rows: Row[];
  emptyMessage?: string;
}

export function DataTable<Row extends object>({
  columns,
  rows,
  emptyMessage = "No data available",
}: DataTableProps<Row>) {
  if (rows.length === 0) {
    return <p>{emptyMessage}</p>;
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          {columns.map((column) => (
            <th
              key={String(column.key)}
              style={{ textAlign: "left", borderBottom: "1px solid #334155", paddingBottom: "0.5rem" }}
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {columns.map((column) => {
              const value = row[column.key];
              return (
                <td key={String(column.key)} style={{ padding: "0.5rem 0" }}>
                  {column.render ? column.render(value as Row[keyof Row], row) : String(value)}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
