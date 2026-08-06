import type { ReactNode } from "react";
import { themeTokens } from "./theme";

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
    <>
      <style>{`
        .ryvra-data-table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid ${themeTokens.color.border};
          border-radius: ${themeTokens.radius.md};
          overflow: hidden;
          background: ${themeTokens.color.surface};
        }

        .ryvra-data-table th,
        .ryvra-data-table td {
          text-align: left;
          padding: ${themeTokens.spacing.sm} ${themeTokens.spacing.md};
          border-bottom: 1px solid ${themeTokens.color.border};
          font-size: ${themeTokens.typography.size.sm};
        }

        .ryvra-data-table th {
          background: ${themeTokens.color.surfaceMuted};
          color: ${themeTokens.color.textMuted};
          text-transform: uppercase;
          letter-spacing: 0.04em;
          font-weight: ${themeTokens.typography.weight.semibold};
          font-size: ${themeTokens.typography.size.xs};
        }

        .ryvra-data-table tr:last-child td {
          border-bottom: none;
        }
      `}</style>
      <table className="ryvra-data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={String(column.key)}>{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column) => {
                const value = row[column.key];
                return <td key={String(column.key)}>{column.render ? column.render(value as Row[keyof Row], row) : String(value)}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
