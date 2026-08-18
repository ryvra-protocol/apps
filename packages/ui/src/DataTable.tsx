import { Fragment, type KeyboardEvent, type ReactNode } from "react";
import { themeTokens } from "./theme";
import { translateRuntime } from "./i18n-runtime";

export interface DataTableColumn<Row extends object, Key extends keyof Row = keyof Row> {
  key: Key;
  header: string;
  render?: (value: Row[Key], row: Row) => ReactNode;
}

export interface DataTableProps<Row extends object> {
  columns: Array<DataTableColumn<Row>>;
  rows: Row[];
  emptyMessage?: string;
  caption?: string;
  getRowKey?: (row: Row, rowIndex: number) => string;
  onRowClick?: (row: Row) => void;
  rowLabel?: (row: Row) => string;
  isRowExpanded?: (row: Row) => boolean;
  renderExpandedRow?: (row: Row) => ReactNode;
}

function defaultRowKey<Row extends object>(_row: Row, rowIndex: number): string {
  return String(rowIndex);
}

export function DataTable<Row extends object>({
  columns,
  rows,
  emptyMessage = translateRuntime("table.noDataAvailable", "No data available"),
  caption,
  getRowKey = defaultRowKey,
  onRowClick,
  rowLabel,
  isRowExpanded,
  renderExpandedRow,
}: DataTableProps<Row>) {
  if (rows.length === 0) {
    return (
      <p
        role="status"
        aria-live="polite"
        style={{
          margin: 0,
          borderRadius: themeTokens.radius.md,
          border: `1px dashed ${themeTokens.color.borderStrong}`,
          padding: `${themeTokens.spacing.md} ${themeTokens.spacing.lg}`,
          color: themeTokens.color.textMuted,
          background: themeTokens.color.surfaceMuted,
        }}
      >
        {emptyMessage}
      </p>
    );
  }

  const interactiveRows = typeof onRowClick === "function";
  const expandableRows = typeof isRowExpanded === "function" && typeof renderExpandedRow === "function";

  const handleRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, row: Row) => {
    if (!interactiveRows) {
      return;
    }

    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    onRowClick(row);
  };

  return (
    <>
      <style>{`
        .ryvra-data-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          border: 1px solid ${themeTokens.color.border};
          border-radius: ${themeTokens.radius.md};
          overflow: hidden;
          background: ${themeTokens.color.surface};
        }

        .ryvra-data-table th,
        .ryvra-data-table td {
          text-align: start;
          padding: ${themeTokens.spacing.sm} ${themeTokens.spacing.md};
          border-bottom: 1px solid ${themeTokens.color.border};
          font-size: ${themeTokens.typography.size.sm};
          vertical-align: top;
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

        .ryvra-data-table-row-interactive {
          cursor: pointer;
        }

        .ryvra-data-table-row-interactive:hover {
          background: ${themeTokens.color.surfaceMuted};
        }

        .ryvra-data-table-row-interactive:focus-visible {
          outline: ${themeTokens.focusRing.width} solid ${themeTokens.color.focusRing};
          outline-offset: -2px;
          box-shadow: inset ${themeTokens.color.focusRingShadow};
        }

        .ryvra-data-table-row-expanded td {
          background: ${themeTokens.color.surfaceMuted};
        }
      `}</style>
      <table className="ryvra-data-table">
        {caption ? (
          <caption
            style={{
              textAlign: "start",
              padding: `${themeTokens.spacing.sm} ${themeTokens.spacing.md}`,
              color: themeTokens.color.textMuted,
              fontSize: themeTokens.typography.size.sm,
            }}
          >
            {caption}
          </caption>
        ) : null}
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={String(column.key)}>{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => {
            const rowKey = getRowKey(row, rowIndex);
            const expanded = expandableRows ? isRowExpanded(row) : false;

            return (
              <Fragment key={rowKey}>
                <tr
                  className={interactiveRows ? "ryvra-data-table-row-interactive" : undefined}
                  onClick={interactiveRows ? () => onRowClick(row) : undefined}
                  onKeyDown={interactiveRows ? (event) => handleRowKeyDown(event, row) : undefined}
                  tabIndex={interactiveRows ? 0 : undefined}
                  aria-label={interactiveRows ? rowLabel?.(row) : undefined}
                  aria-expanded={expandableRows ? expanded : undefined}
                >
                  {columns.map((column) => {
                    const value = row[column.key];
                    return <td key={String(column.key)}>{column.render ? column.render(value as Row[keyof Row], row) : String(value)}</td>;
                  })}
                </tr>
                {expandableRows && expanded ? (
                  <tr className="ryvra-data-table-row-expanded">
                    <td colSpan={columns.length}>{renderExpandedRow(row)}</td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
