import api from "@/lib/api";

/**
 * SPOC access codes (AC-001).
 *
 * The codes that let a learner into a private course. Minting them already
 * existed; listing and withdrawing them did not, so an admin generated a batch,
 * copied it out of a one-time response and had no way back to it.
 */

export interface AccessCodeCourse {
  id: string;
  title: string;
  status: string;
  enrollment_count: number;
  code_count: number;
}

export interface AccessCode {
  code: string;
  is_used: boolean;
  used_by: { id: string; name: string; email: string } | null;
}

export interface AccessCodeList {
  course: { id: string; title: string; course_type: string; institution_id: string | null };
  codes: AccessCode[];
  total: number;
  used: number;
  available: number;
}

export function serverMessage(error: any, fallback: string): string {
  return error?.response?.data?.message || error?.message || fallback;
}

/** Every SPOC in the institution, with how many codes each holds. */
export async function listCodeCourses(institutionId: string): Promise<AccessCodeCourse[]> {
  const res = await api.get(`/courses/institution/${institutionId}/access-codes/summary`);
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

export async function listAccessCodes(courseId: string): Promise<AccessCodeList | null> {
  const res = await api.get(`/courses/${courseId}/access-codes`);
  return res.data?.data ?? null;
}

/** Mints a batch. The server returns the new codes; the list is reloaded after. */
export async function generateAccessCodes(courseId: string, count: number) {
  const res = await api.post(`/courses/${courseId}/access-codes`, { count });
  return res.data;
}

/** Withdraws an unused code. A redeemed one is refused by the server. */
export async function revokeAccessCode(courseId: string, code: string) {
  const res = await api.delete(`/courses/${courseId}/access-codes/${encodeURIComponent(code)}`);
  return res.data;
}
