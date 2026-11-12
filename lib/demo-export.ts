import { zipSync, strToU8 } from "fflate";
import type { Rec } from "./client";
const xml = (value: unknown) =>
  String(value ?? "").replace(
    /[<>&"']/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
export function exportDemo(report: Rec, format: string) {
  const rows = [
    ["Дата", "Вызовы", "Принято", "Просрочено"],
    ...report.series.map((x: Rec) => [
      x.date || x.start,
      x.metrics.calls_total,
      x.metrics.calls_arrived,
      x.metrics.calls_expired,
    ]),
  ];
  let body: BodyInit, type: string;
  if (format === "xlsx") {
    const files: Record<string, string> = {
      "[Content_Types].xml":
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
      "_rels/.rels":
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
      "xl/workbook.xml":
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Q1 Demo" sheetId="1" r:id="rId1"/></sheets></workbook>',
      "xl/_rels/workbook.xml.rels":
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
      "xl/worksheets/sheet1.xml": `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.map((row: unknown[], r: number) => `<row r="${r + 1}">${row.map((v, c) => `<c r="${String.fromCharCode(65 + c)}${r + 1}" t="${typeof v === "number" ? "n" : "inlineStr"}">${typeof v === "number" ? `<v>${v}</v>` : `<is><t>${xml(v)}</t></is>`}</c>`).join("")}</row>`).join("")}</sheetData></worksheet>`,
    };
    body = new Uint8Array(
      zipSync(
        Object.fromEntries(
          Object.entries(files).map(([k, v]) => [k, strToU8(v)]),
        ),
      ),
    );
    type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  } else if (format === "csv") {
    body =
      "\uFEFF" +
      rows
        .map((row: unknown[]) =>
          row
            .map(
              (v) =>
                '"' +
                String(v ?? "")
                  .replace(/^[=+@-]/, "'$&")
                  .replaceAll('"', '""') +
                '"',
            )
            .join(","),
        )
        .join("\r\n");
    type = "text/csv; charset=utf-8";
  } else {
    body = JSON.stringify(report, null, 2);
    type = "application/json";
    format = "json";
  }
  return new Response(body, {
    headers: {
      "Content-Type": type,
      "Content-Disposition": `attachment; filename="q1-demo.${format}"`,
    },
  });
}
