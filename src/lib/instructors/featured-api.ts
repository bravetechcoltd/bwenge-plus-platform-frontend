import api from "@/lib/api";

/**
 * Featured instructors (FI-001) — the client side of the homepage instructor
 * section and the system-admin screen that curates it.
 *
 * One module so the admin page and the homepage cannot drift apart on field
 * names, which is how two sides of a contract usually come to disagree.
 */

export interface FeaturedInstructorAccount {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  profile_picture_url: string | null;
}

export interface FeaturedInstructorEntry {
  id: string;
  user_id: string | null;
  /** What the homepage prints: the override when set, else the account name. */
  name: string;
  /** The override itself, empty when the account name is used. */
  display_name: string;
  headline: string;
  avatar_url: string | null;
  bio: string | null;
  expertise: string[];
  is_active: boolean;
  is_featured: boolean;
  display_order: number;
  course_count: number;
  student_count: number;
  rating: number;
  /** "live" when counted from published courses, "manual" when typed in. */
  stats_source: "live" | "manual" | "none";
  manual_course_count: number | null;
  manual_student_count: number | null;
  manual_rating: number | null;
  account: FeaturedInstructorAccount | null;
  created_at: string;
  updated_at: string;
}

export interface InstructorCandidate {
  id: string;
  name: string;
  email: string;
  profile_picture_url: string | null;
  is_active: boolean;
  already_featured: boolean;
  course_count: number;
  student_count: number;
  rating: number;
}

export interface FeaturedInstructorInput {
  user_id?: string | null;
  display_name?: string;
  headline?: string;
  avatar_url?: string | null;
  bio?: string | null;
  expertise?: string[];
  is_active?: boolean;
  is_featured?: boolean;
  display_order?: number;
  manual_course_count?: number | null;
  manual_student_count?: number | null;
  manual_rating?: number | null;
}

/**
 * The server's own message, when it sent one.
 *
 * A thrown axios error carries the useful sentence in `response.data.message`
 * and a useless one in `error.message` ("Request failed with status code 409").
 * Showing the second is how a clear backend validation message turns into
 * nonsense on screen.
 */
export function serverMessage(error: any, fallback: string): string {
  return error?.response?.data?.message || error?.message || fallback;
}

export async function listFeaturedInstructors(): Promise<FeaturedInstructorEntry[]> {
  const res = await api.get("/featured-instructors/admin");
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

export async function listInstructorCandidates(
  search?: string
): Promise<InstructorCandidate[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  const res = await api.get(`/featured-instructors/admin/candidates${query}`);
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

export async function createFeaturedInstructor(input: FeaturedInstructorInput) {
  const res = await api.post("/featured-instructors/admin", input);
  return res.data;
}

export async function updateFeaturedInstructor(
  id: string,
  input: FeaturedInstructorInput
) {
  const res = await api.put(`/featured-instructors/admin/${id}`, input);
  return res.data;
}

export async function setFeaturedInstructorActive(id: string, isActive: boolean) {
  const res = await api.patch(`/featured-instructors/admin/${id}/active`, {
    is_active: isActive,
  });
  return res.data;
}

export async function deleteFeaturedInstructor(id: string) {
  const res = await api.delete(`/featured-instructors/admin/${id}`);
  return res.data;
}

export async function reorderFeaturedInstructors(ids: string[]) {
  const res = await api.put("/featured-instructors/admin/reorder", { ids });
  return res.data;
}

/**
 * The photograph.
 *
 * Its own call rather than a field on the update, because a file needs
 * multipart and the rest of the form does not — and because replacing a
 * picture must not mean resending the headline and the tags, which is how one
 * admin's edit quietly overwrites another's.
 */
export async function uploadFeaturedInstructorAvatar(id: string, file: File) {
  const form = new FormData();
  form.append("avatar", file);
  const res = await api.post(`/featured-instructors/admin/${id}/avatar`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

/** Clears the override, falling back to the account picture, then initials. */
export async function clearFeaturedInstructorAvatar(id: string) {
  const res = await api.delete(`/featured-instructors/admin/${id}/avatar`);
  return res.data;
}
