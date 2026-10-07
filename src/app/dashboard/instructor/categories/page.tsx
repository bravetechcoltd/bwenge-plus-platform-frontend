import GlobalCategoriesPage from "@/components/categories/GlobalCategoriesPage";

/**
 * CAT-001. The instructor's view.
 *
 * Readable, not editable. An instructor needs to know what they are choosing
 * from when they file a course, but a global category is shared by every
 * institution-less course on the platform — renaming one re-labels other
 * people's courses and deleting one strands them. The server enforces the same
 * rule regardless of what is rendered here.
 */
export default function Page() {
  return <GlobalCategoriesPage />;
}

export const metadata = {
  title: "Course Categories | Instructor",
  description: "The platform's course categories",
};
