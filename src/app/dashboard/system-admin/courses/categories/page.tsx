import GlobalCategoriesPage from "@/components/categories/GlobalCategoriesPage";

/**
 * CAT-001. The system admin's view: full management of the platform taxonomy.
 */
export default function Page() {
  return <GlobalCategoriesPage canManage />;
}

export const metadata = {
  title: "Global Categories | System Admin",
  description: "Create and manage the platform's course categories",
};
