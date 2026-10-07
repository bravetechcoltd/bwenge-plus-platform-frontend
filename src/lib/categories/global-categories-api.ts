import api from "@/lib/api";

/**
 * Global categories (CAT-001) — the platform's own taxonomy, used by every
 * course that belongs to no institution.
 *
 * One module, so the management screen and anything else that lists them
 * cannot drift apart on field names.
 */

export interface GlobalCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  is_active: boolean;
  order_index: number;
  parent_category_id: string | null;
  /** How many courses are filed here — what decides whether deleting is safe. */
  course_count: number;
  created_at: string;
}

export interface GlobalCategoryInput {
  name?: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  is_active?: boolean;
  order_index?: number;
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

export async function listGlobalCategories(search?: string): Promise<GlobalCategory[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  const res = await api.get(`/categories/global${query}`);
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

export async function createGlobalCategory(input: GlobalCategoryInput) {
  const res = await api.post("/categories/global", input);
  return res.data;
}

export async function updateGlobalCategory(id: string, input: GlobalCategoryInput) {
  const res = await api.put(`/categories/global/${id}`, input);
  return res.data;
}

export async function deleteGlobalCategory(id: string) {
  const res = await api.delete(`/categories/global/${id}`);
  return res.data;
}

export async function setGlobalCategoryActive(id: string, isActive: boolean) {
  const res = await api.patch(`/categories/global/${id}/toggle-status`, {
    is_active: isActive,
  });
  return res.data;
}
