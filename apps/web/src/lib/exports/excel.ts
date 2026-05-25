import "server-only";

import ExcelJS from "exceljs";

export type SheetColumn = {
  header: string;
  key: string;
  width?: number;
  // Excel number format string. Examples: '#,##0', '#,##0.000 " M"', '0.00%'.
  numFmt?: string;
};

export type SheetSpec = {
  name: string;
  columns: SheetColumn[];
  rows: Record<string, unknown>[];
  // Optional rows rendered above the column header — used for titles and
  // metadata banners ("Pakistan Railways", "FY 2025-2026", export timestamp).
  preamble?: string[][];
};

export async function buildXlsx(sheets: SheetSpec[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "PR Freight Intelligence Platform";
  wb.created = new Date();

  for (const spec of sheets) {
    const ws = wb.addWorksheet(spec.name.slice(0, 31), {
      views: [{ state: "frozen", ySplit: (spec.preamble?.length ?? 0) + 1 }],
    });

    let cursor = 1;
    if (spec.preamble) {
      for (const line of spec.preamble) {
        const row = ws.getRow(cursor);
        row.values = line;
        if (cursor === 1) {
          row.font = { bold: true, size: 14, color: { argb: "FF0F172A" } };
        } else {
          row.font = { color: { argb: "FF475569" }, size: 10 };
        }
        cursor += 1;
      }
      cursor += 1;
    }

    ws.columns = spec.columns.map((c) => ({
      header: c.header,
      key: c.key,
      width: c.width ?? 16,
      style: c.numFmt ? { numFmt: c.numFmt } : undefined,
    }));

    // ExcelJS's `columns =` setter writes the header into row 1; if we used
    // a preamble we need to move it down.
    if (spec.preamble) {
      const desired = cursor;
      const headerRow = ws.getRow(1);
      headerRow.values = [];
      const target = ws.getRow(desired);
      target.values = spec.columns.map((c) => c.header);
      cursor = desired + 1;
    }

    const headerRowIdx = spec.preamble ? cursor - 1 : 1;
    const headerRow = ws.getRow(headerRowIdx);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F172A" },
    };
    headerRow.alignment = { vertical: "middle", horizontal: "left" };

    for (const r of spec.rows) {
      ws.addRow(r);
    }
  }

  const ab = await wb.xlsx.writeBuffer();
  return Buffer.from(ab);
}

export function xlsxResponse(buffer: Buffer, filename: string): Response {
  const safe = filename.replace(/[^\w\-. ]+/g, "_");
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${safe}"`,
      "Cache-Control": "no-store",
    },
  });
}
