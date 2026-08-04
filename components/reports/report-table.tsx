import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface ReportColumn<Row> {
  key: string;
  label: string;
  render: (row: Row) => ReactNode;
  align?: "left" | "right";
}

interface ReportTableProps<Row> {
  columns: ReportColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row, index: number) => string;
  emptyMessage?: string;
}

export function ReportTable<Row>({
  columns,
  rows,
  rowKey,
  emptyMessage = "No data found for this period.",
}: ReportTableProps<Row>) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={column.align === "right" ? "text-right" : undefined}
                >
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row, index) => (
                <TableRow key={rowKey(row, index)}>
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={column.align === "right" ? "text-right" : undefined}
                    >
                      {column.render(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-28 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
