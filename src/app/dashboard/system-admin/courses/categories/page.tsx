import GlobalCategoriesPage from "@/components/categories/GlobalCategoriesPage";

/**
 * CAT-001. The system admin's view: the full taxonomy, including the actions
 * that reach into courses already filed — hiding, deleting, reordering.
 */
export default function Page() {
  return <GlobalCategoriesPage canAuthor canAdminister />;
}

export const metadata = {
  title: "Global Categories | System Admin",
  description: "Create and manage the platform's course categories",
};
