import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Full-page skeleton for /courses/[id].
 *
 * Mirrors the real course-detail layout 1:1 — back button, hero card (badges,
 * title, description, 4 stat tiles, instructor strip), the 4-tab bar, the
 * Overview cards, and the sticky enrollment sidebar (image, price, actions) —
 * so the page keeps its shape while data loads instead of collapsing to a
 * centred spinner. Caller supplies the page chrome (<Navigation />), exactly
 * like the loaded page does.
 */
export function CourseDetailSkeleton() {
  return (
    <div className="container mx-auto px-4 pt-20 pb-8 max-w-7xl">
      {/* Back button */}
      <Skeleton className="h-8 w-40 mb-4 rounded-md" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Left column ───────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6 max-w-full">
          {/* Hero card */}
          <Card className="border-2 shadow-lg">
            <CardContent className="p-6">
              {/* Badge row */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-32 rounded-full" />
              </div>

              {/* Title */}
              <div className="space-y-2 mb-3">
                <Skeleton className="h-8 w-11/12" />
                <Skeleton className="h-8 w-2/3" />
              </div>

              {/* Short description */}
              <div className="space-y-2 mb-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>

              {/* Stat tiles */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-muted/40 rounded-lg">
                    <Skeleton className="w-4 h-4 rounded" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-3.5 w-10" />
                      <Skeleton className="h-2.5 w-14" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Instructor strip */}
              <div className="flex items-center gap-3 mt-4 p-3 bg-muted/40 rounded-lg border">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tab bar */}
          <div className="grid w-full grid-cols-4 gap-1 bg-card p-1 rounded-lg border shadow-sm">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 rounded-md" />
            ))}
          </div>

          {/* Overview tab content — three sectioned cards */}
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="border shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-5 h-5 rounded" />
                    <Skeleton className="h-5 w-44" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="flex items-start gap-3">
                      <Skeleton className="w-4 h-4 rounded-full mt-0.5 flex-shrink-0" />
                      <Skeleton className={j % 3 === 2 ? "h-4 w-2/3" : "h-4 w-full"} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* ── Right column — enrollment sidebar ─────────────────────────── */}
        <div className="lg:col-span-1 max-w-full">
          <Card className="sticky top-20 border-2 shadow-xl py-0 overflow-hidden">
            {/* Course thumbnail */}
            <Skeleton className="h-44 md:h-48 w-full rounded-none rounded-t-lg" />
            <CardContent className="p-4">
              {/* Price row */}
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-8 w-28" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>

              {/* Primary action + secondary action */}
              <div className="space-y-3 mb-4">
                <Skeleton className="h-9 w-full rounded-md" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>

              {/* Included-with-course list */}
              <div className="space-y-2.5 pt-3 border-t">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Skeleton className="w-4 h-4 rounded" />
                    <Skeleton className="h-3.5 w-32" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
