"use client"

import { useCallback, useState } from "react"
import useSWR from "swr"
import Cookies from "js-cookie"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Loader2, MessageSquare, Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

/**
 * Course rating (unchanged behaviour, self-contained data).
 *
 * Previously the parent page fetched reviews and owned the submit handler,
 * which meant the Learning Space orchestrator carried review state it never
 * used for anything else. The component now owns its own fetch/submit, and
 * the hard-coded `#0158B7` was replaced with the theme's `--primary` token
 * (audit defect D2).
 */

const API = process.env.NEXT_PUBLIC_API_URL

interface Review {
  id: string
  user: {
    first_name: string
    last_name: string
    profile_picture_url?: string
  }
  rating: number
  comment: string
  created_at: string
}

async function fetchJson(url: string) {
  const token = Cookies.get("bwenge_token")
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
  })
  if (!res.ok) throw new Error("Request failed")
  return res.json()
}

export default function CourseRating({ courseId }: { courseId: string }) {
  const { toast } = useToast()

  const { data: myReview, mutate: refreshMine } = useSWR(
    courseId ? `${API}/courses/${courseId}/reviews/user` : null,
    fetchJson,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  )

  const {
    data: reviewsResponse,
    isLoading: reviewsLoading,
    mutate: refreshReviews,
  } = useSWR(
    courseId ? `${API}/courses/${courseId}/reviews` : null,
    fetchJson,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  )

  const existing = myReview?.data ?? null
  const reviews: Review[] = reviewsResponse?.data ?? []

  const [rating, setRating] = useState<number>(0)
  const [review, setReview] = useState<string>("")
  const [hovered, setHovered] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [touched, setTouched] = useState(false)

  // Seed the form from the learner's existing review, but never overwrite an
  // edit in progress.
  const effectiveRating = touched ? rating : (existing?.rating ?? 0)
  const effectiveReview = touched ? review : (existing?.comment ?? "")

  const handleSubmit = useCallback(async () => {
    if (effectiveRating === 0) return

    setSubmitting(true)
    try {
      const token = Cookies.get("bwenge_token")
      const res = await fetch(`${API}/courses/${courseId}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ rating: effectiveRating, comment: effectiveReview }),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.message || "Couldn't save your review.")
      }

      setTouched(false)
      await Promise.all([refreshMine(), refreshReviews()])
      toast({
        title: existing ? "Review updated" : "Thanks for your review",
        description: "Your feedback helps other learners choose this course.",
      })
    } catch (err: any) {
      toast({
        title: "Couldn't submit",
        description: err?.message || "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }, [
    courseId,
    effectiveRating,
    effectiveReview,
    existing,
    refreshMine,
    refreshReviews,
    toast,
  ])

  return (
    <section className="space-y-4">
      {/* Rating form */}
      <Card className="shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Star className="h-4 w-4 text-warning" />
            Rate this course
          </CardTitle>
          <CardDescription className="text-sm">
            Share your experience to help other learners.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-foreground">Your rating</legend>
            <div className="flex items-center gap-1" role="radiogroup" aria-label="Course rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  role="radio"
                  aria-checked={star === effectiveRating}
                  aria-label={`${star} ${star === 1 ? "star" : "stars"}`}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  onFocus={() => setHovered(star)}
                  onBlur={() => setHovered(0)}
                  onClick={() => {
                    setTouched(true)
                    setRating(star)
                    setReview(effectiveReview)
                  }}
                  className="rounded p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Star
                    className={cn(
                      "h-7 w-7",
                      star <= (hovered || effectiveRating)
                        ? "fill-warning text-warning"
                        : "text-muted-foreground/50"
                    )}
                  />
                </button>
              ))}
              {effectiveRating > 0 && (
                <span className="ml-2 text-sm tabular-nums text-muted-foreground">
                  {effectiveRating} of 5
                </span>
              )}
            </div>
          </fieldset>

          <div className="space-y-2">
            <label htmlFor="course-review" className="text-sm font-medium text-foreground">
              Your review <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Textarea
              id="course-review"
              value={effectiveReview}
              onChange={(e) => {
                setTouched(true)
                setRating(effectiveRating)
                setReview(e.target.value)
              }}
              placeholder="What worked well? What could be better?"
              rows={4}
              className="resize-none text-sm"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={effectiveRating === 0 || submitting}
            className="gap-2"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {existing ? "Update review" : "Submit review"}
          </Button>
        </CardContent>
      </Card>

      {/* Reviews */}
      {reviewsLoading ? (
        <Card className="shadow-none">
          <CardContent className="space-y-4 p-5">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : reviews.length > 0 ? (
        <Card className="shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4 text-primary" />
              Learner reviews
              <span className="text-sm font-normal tabular-nums text-muted-foreground">
                ({reviews.length})
              </span>
            </CardTitle>
          </CardHeader>

          <CardContent>
            <ul className="divide-y divide-border">
              {reviews.map((item) => (
                <li key={item.id} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={item.user?.profile_picture_url} alt="" />
                    <AvatarFallback className="text-xs">
                      {(item.user?.first_name?.[0] ?? "") + (item.user?.last_name?.[0] ?? "")}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {item.user?.first_name} {item.user?.last_name}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="flex items-center gap-0.5" aria-label={`${item.rating} of 5`}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={cn(
                              "h-3 w-3",
                              star <= item.rating
                                ? "fill-warning text-warning"
                                : "text-muted-foreground/40"
                            )}
                          />
                        ))}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    {item.comment && (
                      <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                        {item.comment}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </section>
  )
}
