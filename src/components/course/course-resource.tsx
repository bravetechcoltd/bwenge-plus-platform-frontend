"use client"

import * as React from "react"
import type { Course } from "@/types"

import { useSession } from "@/lib/auth/session"
import { useCourses } from "@/hooks/use-courses"
import { toErrorKind } from "@/lib/api/api-error"
import { ErrorState, ResolvingState } from "@/components/system/error-state"

/**
 * One course, loaded honestly (AXM-CONS-001 F16 — findings C-03, C-04, C-05).
 *
 * Nine pages carried this shape:
 *
 *     if (loading) return <Skeleton/>
 *     if (!course) return <h1>Course not found</h1>
 *
 * `useCourse` builds its SWR key as `token && id ? url : null`, and `token`
 * came from a context that restored in an effect — so on the first render
 * after every refresh the key was `null`. SWR does not fetch a `null` key and
 * reports `isLoading: false`, which meant the page evaluated `loading === false`
 * and `course === undefined` and announced that the course did not exist
 * **before it had asked**.
 *
 * The audit confirmed both courses named in the request are present and
 * `PUBLISHED`, and that the backend returns them. Nothing was ever missing.
 *
 * The second half of the same defect: `fetcher` threw a bare `Error` with the
 * status discarded, and none of the nine pages read the `error` value at all.
 * So a 403, a 500, a timeout and an offline browser were all rendered as
 * "Course not found" too. Every one of those now has its own state, and the
 * not-found sentence is reachable only when the server actually says 404.
 */

export interface CourseResourceHelpers {
  /** Revalidate the course. Same `mutate` the page already had. */
  refresh: () => void
}

export interface CourseResourceProps {
  id: string
  children: (course: Course, helpers: CourseResourceHelpers) => React.ReactNode
  /** Replaces the default loading state. */
  fallback?: React.ReactNode
  /** Rendered instead of `children` when the course genuinely is not there. */
  notFound?: React.ReactNode
  variant?: "page" | "card"
}

export function CourseResource({
  id,
  children,
  fallback,
  notFound,
  variant = "page",
}: CourseResourceProps) {
  const { status } = useSession()
  const { useCourse } = useCourses()
  const { course, loading, error, mutate } = useCourse(id)

  // The session has not been read yet, so the request has not been made yet.
  // This is the frame that used to print "Course not found".
  if (status === "initializing") {
    return <>{fallback ?? <ResolvingState variant={variant} label="Loading course…" />}</>
  }

  if (status === "unauthenticated") {
    return <ErrorState variant={variant} kind="unauthorized" />
  }

  if (loading) {
    return <>{fallback ?? <ResolvingState variant={variant} label="Loading course…" />}</>
  }

  if (error) {
    const kind = toErrorKind(error)

    // A 404 from the server is the one case where "not found" is the truth.
    if (kind === "not-found") {
      return <>{notFound ?? <ErrorState variant={variant} kind="not-found" />}</>
    }

    return (
      <ErrorState
        variant={variant}
        error={error}
        onRetry={() => {
          void mutate()
        }}
      />
    )
  }

  if (!course) {
    // No error and no course: the request completed and the payload was empty.
    // Genuinely absent, and only now is the sentence honest.
    return <>{notFound ?? <ErrorState variant={variant} kind="not-found" />}</>
  }

  return (
    <>
      {children(course, {
        refresh: () => {
          void mutate()
        },
      })}
    </>
  )
}
