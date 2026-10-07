import api from "@/lib/api";

/**
 * Public instructors (PI-001) — instructors who belong to the platform rather
 * than to any institution.
 *
 * One module, so the management screen and the course wizard cannot drift apart
 * on field names.
 */

export interface PublicInstructor {
  id: string;
  first_name: string | null;
  last_name: string | null;
  /** Full name, falling back to the email when no name is recorded. */
  name: string;
  email: string;
  profile_picture_url: string | null;
  is_active: boolean;
  date_joined: string;
  course_count: number;
  published_count: number;
  student_count: number;
}

/** The wizard's list: public instructors, plus the admin themselves. */
export interface AssignableInstructor extends PublicInstructor {
  /** True for the system admin making the request — the fallback choice. */
  is_self: boolean;
}

export interface PublicInstructorInput {
  /**
   * An account that already exists, promoted rather than duplicated.
   *
   * When present the server updates that user instead of inserting one, and
   * generates no password — they already have theirs.
   */
  existing_user_id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
}

/**
 * The server's own sentence, when it sent one.
 *
 * A thrown axios error carries the useful message in `response.data.message`
 * and a useless one in `error.message` ("Request failed with status code 409").
 */
export function serverMessage(error: any, fallback: string): string {
  return error?.response?.data?.message || error?.message || fallback;
}

export async function listPublicInstructors(search?: string): Promise<PublicInstructor[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  const res = await api.get(`/public-instructors${query}`);
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

export async function listAssignableInstructors(): Promise<AssignableInstructor[]> {
  const res = await api.get("/public-instructors/assignable");
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

export async function createPublicInstructor(input: PublicInstructorInput) {
  const res = await api.post("/public-instructors", input);
  return res.data;
}

export async function updatePublicInstructor(id: string, input: PublicInstructorInput) {
  const res = await api.put(`/public-instructors/${id}`, input);
  return res.data;
}

export async function setPublicInstructorActive(id: string, isActive: boolean) {
  const res = await api.patch(`/public-instructors/${id}/active`, { is_active: isActive });
  return res.data;
}
