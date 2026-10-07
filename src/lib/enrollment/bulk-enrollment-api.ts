import api from "@/lib/api";

/**
 * Bulk enrolment (BE-001) — the real student roster, and validation against it.
 *
 * One module so the selector, the template builder and the preview cannot drift
 * apart on field names. The whole point of this workflow is that the same
 * student record travels from the database through the spreadsheet and back,
 * and that only holds if one shape describes it everywhere.
 */

export interface RosterStudent {
  id: string;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  /**
   * What this schema actually has.
   *
   * There is no registration_number column on users; `username` is the
   * identifier the institution assigns, so it is reported as such rather than
   * inventing a number that matches nothing.
   */
  registration_number: string;
  phone_number: string;
  department: string;
  programme: string;
  is_active: boolean;
}

export type RowStatus =
  | "VALID"
  | "WARNING"
  | "ERROR"
  | "DUPLICATE"
  | "ALREADY_ENROLLED"
  | "NOT_FOUND"
  | "WRONG_INSTITUTION";

export interface ValidatedRow {
  row_number: number;
  name: string;
  email: string;
  registration_number: string;
  status: RowStatus;
  reason: string | null;
  user_id: string | null;
  resolved_email?: string;
  resolved_name?: string;
}

export interface ValidationResult {
  course: { id: string; title: string; course_type: string };
  rows: ValidatedRow[];
  summary: Record<string, number>;
  /** The addresses the confirm step will send on. */
  enrollable: string[];
  /** How many rows cannot proceed. Non-zero blocks the confirm button. */
  blocking: number;
}

export function serverMessage(error: any, fallback: string): string {
  return error?.response?.data?.message || error?.message || fallback;
}

/** This institution's students, as the database holds them. */
export async function fetchRoster(
  institutionId: string
): Promise<{ students: RosterStudent[]; capped: boolean }> {
  const res = await api.get(`/enrollments/bulk/roster/${institutionId}`);
  return {
    students: Array.isArray(res.data?.data) ? res.data.data : [],
    capped: res.data?.capped === true,
  };
}

/** Checks parsed rows against the database. Writes nothing. */
export async function validateRows(payload: {
  institution_id: string;
  course_id: string;
  rows: Array<{
    row_number: number;
    name?: string;
    email?: string;
    registration_number?: string;
  }>;
}): Promise<ValidationResult | null> {
  const res = await api.post("/enrollments/bulk/validate", payload);
  return res.data?.data ?? null;
}

/**
 * The final enrolment, through the existing bulk endpoint.
 *
 * Deliberately not a new write path: every enrolment rule, notification and
 * audit entry lives behind this one, and importing from a spreadsheet is not a
 * reason to bypass them.
 */
export async function confirmBulkEnrollment(courseId: string, emails: string[]) {
  const res = await api.post("/enrollments/bulk", {
    course_id: courseId,
    student_emails: emails,
  });
  return res.data;
}

/* ── the one column set, shared by the template and the parser ────────── */

/**
 * The spreadsheet's columns, in order.
 *
 * Declared once and used by both the writer and the reader, so a column cannot
 * be added to the template that the parser does not know how to read — which
 * is how an import silently drops a field.
 *
 * `key` is the roster field it comes from; `locked` marks the identifiers an
 * admin should not be editing in the file, because changing them makes the row
 * point at a different person or at nobody.
 */
export const TEMPLATE_COLUMNS: Array<{
  header: string;
  key: keyof RosterStudent | "notes";
  width: number;
  locked?: boolean;
  required?: boolean;
}> = [
  { header: "Student Name", key: "name", width: 28, required: true },
  { header: "Registration Number", key: "registration_number", width: 22, locked: true },
  { header: "Email", key: "email", width: 30, locked: true, required: true },
  { header: "Department", key: "department", width: 24 },
  { header: "Programme / Class", key: "programme", width: 20 },
  { header: "Phone Number", key: "phone_number", width: 18 },
  { header: "Notes", key: "notes", width: 26 },
];
