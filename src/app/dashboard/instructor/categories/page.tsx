import GlobalCategoriesPage from "@/components/categories/GlobalCategoriesPage";

/**
 * CAT-001. The instructor's view.
 *
 * They can add a category and correct its wording: the people filing courses
 * are the ones who find one missing or misnamed, and routing every such fix
 * through an administrator is how a taxonomy stops matching what is taught.
 *
 * Hiding and deleting are not offered. Those reach backwards into courses
 * other people have already filed under the category, where adding one only
 * changes what the list offers next. The server enforces the same split.
 */
export default function Page() {
  return <GlobalCategoriesPage canAuthor />;
}

export const metadata = {
  title: "Global Categories | Instructor",
  description: "The platform's course categories",
};
