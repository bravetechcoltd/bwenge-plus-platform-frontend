import api from "@/lib/api";

/**
 * Products (PR-001) — the client side of /our-products and the system-admin
 * screen behind it.
 *
 * One module so the public page and the admin screen cannot drift apart on
 * field names, which is how two sides of a contract usually come to disagree.
 */

export interface Product {
  id: string;
  name: string;
  tagline: string;
  description: string;
  url: string;
  action_label: string;
  highlights: string[];
  /** A lucide icon name; the page falls back when it does not know it. */
  icon: string;
  /** A design-system tint name, never a raw colour. */
  accent: string;
  /** The product the visitor is already inside — draws "You are here". */
  is_current: boolean;
  display_order: number;
}

export interface AdminProduct extends Product {
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductInput {
  name?: string;
  tagline?: string;
  description?: string;
  url?: string;
  action_label?: string;
  highlights?: string[];
  icon?: string;
  accent?: string;
  is_current?: boolean;
  is_active?: boolean;
  display_order?: number;
}

/**
 * The server's own message, when it sent one.
 *
 * A thrown axios error carries the useful sentence in `response.data.message`
 * and a useless one in `error.message` ("Request failed with status code 400").
 * Showing the second is how a clear validation message becomes nonsense.
 */
export function serverMessage(error: any, fallback: string): string {
  return error?.response?.data?.message || error?.message || fallback;
}

export async function listProducts(): Promise<Product[]> {
  const res = await api.get("/products");
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

export async function listAdminProducts(): Promise<AdminProduct[]> {
  const res = await api.get("/products/admin");
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

export async function createProduct(input: ProductInput) {
  const res = await api.post("/products/admin", input);
  return res.data;
}

export async function updateProduct(id: string, input: ProductInput) {
  const res = await api.put(`/products/admin/${id}`, input);
  return res.data;
}

export async function setProductActive(id: string, isActive: boolean) {
  const res = await api.patch(`/products/admin/${id}/active`, { is_active: isActive });
  return res.data;
}

export async function deleteProduct(id: string) {
  const res = await api.delete(`/products/admin/${id}`);
  return res.data;
}

export async function reorderProducts(ids: string[]) {
  const res = await api.put("/products/admin/reorder", { ids });
  return res.data;
}

/* ── the shared vocabulary of icons and tints ─────────────────────────── */

/**
 * Icons and tints are chosen from fixed lists, by name.
 *
 * The admin picks from these rather than typing a class or a hex value, so a
 * product cannot introduce a colour the design does not have or an icon that
 * does not exist — and the same list drives both the picker and the page, so
 * they cannot disagree about what a name means.
 */
export const PRODUCT_ICONS = [
  "GraduationCap",
  "BookOpen",
  "Building2",
  "Briefcase",
  "Layers",
  "Network",
  "Target",
  "Lightbulb",
  "BarChart3",
  "Users2",
] as const;

export const PRODUCT_ACCENTS = ["purple", "blue", "green", "amber", "cyan"] as const;

export const ACCENT_STYLE: Record<string, { bg: string; fg: string }> = {
  purple: { bg: "rgba(91,78,150,0.10)", fg: "#5B4E96" },
  blue: { bg: "rgba(47,107,224,0.10)", fg: "#2F6BE0" },
  green: { bg: "rgba(18,145,106,0.10)", fg: "#12916A" },
  amber: { bg: "rgba(201,122,20,0.12)", fg: "#C97A14" },
  cyan: { bg: "rgba(14,139,176,0.10)", fg: "#0E8BB0" },
};

export function accentStyle(accent: string) {
  return ACCENT_STYLE[accent] || ACCENT_STYLE.purple;
}
