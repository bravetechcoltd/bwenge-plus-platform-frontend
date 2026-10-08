import AdminHeroSlidesPage from "@/components/systemAdmin/AdminHeroSlidesPage";

/**
 * HS-001. The homepage banner, managed.
 *
 * The slides it edits were five objects in src/app/page.tsx, so changing the
 * front page meant a code change and a deploy.
 */
export default function Page() {
  return <AdminHeroSlidesPage />;
}

export const metadata = {
  title: "Hero Slides | System Admin",
  description: "Manage the homepage banner slides",
};
