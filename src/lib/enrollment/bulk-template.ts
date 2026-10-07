import ExcelJS from "exceljs";

import { TEMPLATE_COLUMNS, type RosterStudent } from "./bulk-enrollment-api";

/**
 * ============================================================================
 * The bulk-enrolment workbook (BE-001)
 * ============================================================================
 *
 * ── Why ExcelJS and not the xlsx already in the project ──────────────────
 *
 * The community build of `xlsx` reads cell styles but does not write them. A
 * template whose whole job is to make its structure obvious cannot be built
 * with a writer that drops every fill, border and width. `xlsx` keeps doing
 * what it already does elsewhere in this application; this file is the one
 * place that needs styling.
 *
 * ── Colour as structure ───────────────────────────────────────────────────
 *
 * Three groups, three tones, and nothing decorative:
 *
 *   identity    the fields that say which student this is, and which must not
 *               be edited — a changed email points the row at somebody else
 *   academic    department and programme, informative and editable
 *   contact     phone and notes, free text
 *
 * The locked identity columns are also actually locked, with the sheet
 * protected and every other cell explicitly unlocked, so "do not edit this"
 * is enforced by the file rather than written in a note nobody reads.
 */

const TONE = {
  identity: { fill: "FF4A3F80", font: "FFFFFFFF" },
  academic: { fill: "FF2F6BE0", font: "FFFFFFFF" },
  contact: { fill: "FF12916A", font: "FFFFFFFF" },
} as const;

/** Which group each column belongs to. */
function toneFor(key: string): keyof typeof TONE {
  if (["name", "registration_number", "email"].includes(key)) return "identity";
  if (["department", "programme"].includes(key)) return "academic";
  return "contact";
}

export interface TemplateOptions {
  institutionName?: string;
  courseTitle?: string;
  /** Real students to seed the sheet with. Never invented. */
  students: RosterStudent[];
}

/**
 * Builds the workbook and hands back a Blob for download.
 *
 * The caller supplies the students; this function never fabricates one. If the
 * roster is short the sheet is short, and the guidance sheet says so, because a
 * template padded with plausible-looking people is exactly how an admin ends up
 * submitting rows for students who do not exist.
 */
export async function buildEnrollmentTemplate(options: TemplateOptions): Promise<Blob> {
  const { students, institutionName, courseTitle } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "BWENGE+";
  workbook.created = new Date();

  /* ── the sheet people fill in ──────────────────────────────────────── */

  const sheet = workbook.addWorksheet("Students", {
    views: [{ state: "frozen", ySplit: 3 }],
    properties: { defaultRowHeight: 18 },
  });

  sheet.columns = TEMPLATE_COLUMNS.map((column) => ({
    key: String(column.key),
    width: column.width,
  }));

  // Row 1: what this file is for.
  const titleRow = sheet.addRow([
    `Bulk enrolment${courseTitle ? ` — ${courseTitle}` : ""}`,
  ]);
  sheet.mergeCells(1, 1, 1, TEMPLATE_COLUMNS.length);
  titleRow.height = 26;
  titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: "FF1F2544" } };
  titleRow.getCell(1).alignment = { vertical: "middle" };

  // Row 2: where the rows came from, and the one rule that matters.
  const subtitleRow = sheet.addRow([
    `${institutionName ? institutionName + " · " : ""}${students.length} existing ${
      students.length === 1 ? "student" : "students"
    } listed below. Keep the Email and Registration Number exactly as they are — they identify the student.`,
  ]);
  sheet.mergeCells(2, 1, 2, TEMPLATE_COLUMNS.length);
  subtitleRow.height = 20;
  subtitleRow.getCell(1).font = { size: 10, color: { argb: "FF6B7280" } };
  subtitleRow.getCell(1).alignment = { vertical: "middle" };

  // Row 3: the headers, coloured by group.
  const headerRow = sheet.addRow(TEMPLATE_COLUMNS.map((c) => c.header));
  headerRow.height = 22;
  headerRow.eachCell((cell, index) => {
    const column = TEMPLATE_COLUMNS[index - 1];
    const tone = TONE[toneFor(String(column.key))];
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: tone.fill } };
    cell.font = { bold: true, size: 11, color: { argb: tone.font } };
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.border = {
      top: { style: "thin", color: { argb: "FFE5E7EB" } },
      bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
      left: { style: "thin", color: { argb: "FFE5E7EB" } },
      right: { style: "thin", color: { argb: "FFE5E7EB" } },
    };
  });

  /* ── the real students ─────────────────────────────────────────────── */

  students.forEach((student, index) => {
    const row = sheet.addRow(
      TEMPLATE_COLUMNS.map((column) =>
        column.key === "notes" ? "" : ((student as any)[column.key] ?? "")
      )
    );

    // Banding, so a long list stays readable across the width of the sheet.
    const banded = index % 2 === 1;

    row.eachCell((cell, cellIndex) => {
      const column = TEMPLATE_COLUMNS[cellIndex - 1];
      cell.alignment = { vertical: "middle" };
      cell.border = {
        bottom: { style: "hair", color: { argb: "FFEDEBF6" } },
      };
      if (banded) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAFAFD" } };
      }
      /*
       * Phone numbers are text. Left as a number, a leading + or 0 is lost and
       * a long one turns into scientific notation — which is how a contact
       * number becomes unusable between download and upload.
       */
      if (column.key === "phone_number") {
        cell.numFmt = "@";
      }
      // Identity columns stay locked when the sheet is protected.
      cell.protection = { locked: !!column.locked };
    });
  });

  /*
   * Room to add more. The rows are empty but unlocked and bordered, so the
   * sheet reads as something to continue rather than something that ends.
   */
  for (let i = 0; i < 20; i++) {
    const row = sheet.addRow(TEMPLATE_COLUMNS.map(() => ""));
    row.eachCell({ includeEmpty: true }, (cell, cellIndex) => {
      const column = TEMPLATE_COLUMNS[cellIndex - 1];
      if (!column) return;
      cell.border = { bottom: { style: "hair", color: { argb: "FFEDEBF6" } } };
      // Unlocked everywhere: a new row is a new student, identifiers included.
      cell.protection = { locked: false };
      if (column.key === "phone_number") cell.numFmt = "@";
    });
  }

  sheet.autoFilter = {
    from: { row: 3, column: 1 },
    to: { row: 3, column: TEMPLATE_COLUMNS.length },
  };

  /*
   * Protected, but only to keep the identifiers intact. Everything else is
   * unlocked above, and no password is set — this is a guard rail, not a lock,
   * and a password nobody was given would make the file unusable.
   */
  await sheet.protect("", {
    selectLockedCells: true,
    selectUnlockedCells: true,
    autoFilter: true,
    sort: true,
  });

  /* ── a sheet that explains itself ──────────────────────────────────── */

  const guide = workbook.addWorksheet("How to use");
  guide.columns = [{ width: 24 }, { width: 76 }];

  const guideTitle = guide.addRow(["Bulk enrolment", ""]);
  guideTitle.getCell(1).font = { bold: true, size: 14, color: { argb: "FF1F2544" } };

  guide.addRow([]);
  const lines: Array<[string, string]> = [
    ["Students sheet", "Every row is one enrolment. The students listed are real records from this institution."],
    ["Email", "How a student is matched. Do not change it — a different address points the row at a different person, or at nobody."],
    ["Registration Number", "The identifier this institution assigns. Also used for matching when the email is missing."],
    ["Adding students", "Use the empty rows. An email address is enough; the rest is filled in from the database on upload."],
    ["Removing students", "Delete the whole row. Leaving it blank is fine too — blank rows are ignored."],
    ["After uploading", "Nothing is enrolled straight away. You will see every row with its status, and can correct or remove rows before confirming."],
  ];
  if (students.length === 0) {
    lines.unshift([
      "No students listed",
      "This institution has no student members yet, so the sheet is empty rather than filled with examples. Add students to the institution first.",
    ]);
  }

  for (const [term, text] of lines) {
    const row = guide.addRow([term, text]);
    row.getCell(1).font = { bold: true, size: 11, color: { argb: "FF4A3F80" } };
    row.getCell(2).font = { size: 11, color: { argb: "FF374151" } };
    row.getCell(2).alignment = { wrapText: true, vertical: "top" };
    row.height = 30;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/**
 * Reads a completed workbook back.
 *
 * Driven by the same TEMPLATE_COLUMNS the writer uses, matched on the header
 * text rather than on position, so a file whose columns have been reordered
 * still reads correctly — people do reorder them.
 */
export async function parseEnrollmentWorkbook(
  file: File
): Promise<Array<Record<string, string>>> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());

  const sheet = workbook.getWorksheet("Students") ?? workbook.worksheets[0];
  if (!sheet) return [];

  // Find the header row by looking for the one that contains our headers,
  // rather than assuming row 3 — a file that has been edited may have gained
  // or lost a row above the table.
  let headerRowNumber = -1;
  const wanted = TEMPLATE_COLUMNS.map((c) => c.header.toLowerCase());

  sheet.eachRow((row, rowNumber) => {
    if (headerRowNumber !== -1) return;
    const values = (row.values as any[]).slice(1).map((v) => String(v ?? "").trim().toLowerCase());
    const hits = values.filter((v) => wanted.includes(v)).length;
    if (hits >= 2) headerRowNumber = rowNumber;
  });

  if (headerRowNumber === -1) return [];

  const headerValues = (sheet.getRow(headerRowNumber).values as any[])
    .slice(1)
    .map((v) => String(v ?? "").trim().toLowerCase());

  const indexOf: Record<string, number> = {};
  TEMPLATE_COLUMNS.forEach((column) => {
    const position = headerValues.indexOf(column.header.toLowerCase());
    if (position !== -1) indexOf[String(column.key)] = position + 1;
  });

  const rows: Array<Record<string, string>> = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRowNumber) return;

    const record: Record<string, string> = {};
    for (const [key, column] of Object.entries(indexOf)) {
      const cell = row.getCell(column);
      /*
       * A cell can hold a hyperlink object or a rich-text run rather than a
       * string — an email typed into Excel becomes the former on its own. Both
       * are reduced to their text.
       */
      const raw: any = cell.value;
      let text = "";
      if (raw === null || raw === undefined) text = "";
      else if (typeof raw === "object" && "text" in raw) text = String((raw as any).text ?? "");
      else if (typeof raw === "object" && "richText" in raw) {
        text = (raw as any).richText.map((part: any) => part.text).join("");
      } else if (typeof raw === "object" && "result" in raw) {
        text = String((raw as any).result ?? "");
      } else text = String(raw);
      record[key] = text.trim();
    }

    // A row with nothing in it is not an error, it is an empty row.
    const hasContent = Object.values(record).some((v) => v !== "");
    if (!hasContent) return;

    record.row_number = String(rowNumber);
    rows.push(record);
  });

  return rows;
}
