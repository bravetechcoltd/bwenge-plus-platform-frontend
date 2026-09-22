import { describe, it, expect } from "vitest"
import { findActiveNavItem, pathCovers, type NavNode } from "./nav-active"

/**
 * Reported on /dashboard/institution-admin/courses/categories: "All Courses"
 * and "Course Categories" were both highlighted. The sidebar decided per item
 * with `pathname.startsWith(href)`, and a nested route satisfies that for its
 * parent as well as for itself.
 */

const IA = "/dashboard/institution-admin"

interface Item extends NavNode {
  title: string
  subItems?: Item[]
}

const menu: Item[] = [
  {
    title: "Course Management",
    subItems: [
      { title: "Create Course", href: `${IA}/courses/create` },
      { title: "Course Drafts", href: `${IA}/courses/drafts` },
      { title: "All Courses", href: `${IA}/courses` },
      { title: "Course Categories", href: `${IA}/courses/categories` },
      { title: "Course Analytics", href: `${IA}/courses/analytics` },
    ],
  },
  {
    title: "Enrollment Management",
    subItems: [{ title: "Requests", href: `${IA}/enrollment/requests` }],
  },
  { title: "Dashboard", href: IA, exact: true },
]

const activeTitle = (path: string) => findActiveNavItem(menu, path)?.item.title ?? null
const activeParent = (path: string) => findActiveNavItem(menu, path)?.parent?.title ?? null

describe("pathCovers", () => {
  it("covers itself and its descendants", () => {
    expect(pathCovers("/a/b", "/a/b")).toBe(true)
    expect(pathCovers("/a/b/c", "/a/b")).toBe(true)
  })

  it("does not cover a sibling that merely shares a prefix", () => {
    // "/a/b" must not claim "/a/b-archive", which is a different section.
    expect(pathCovers("/a/b-archive", "/a/b")).toBe(false)
    expect(pathCovers("/a/bc", "/a/b")).toBe(false)
  })
})

describe("findActiveNavItem", () => {
  it("picks the more specific sibling, not both", () => {
    expect(activeTitle(`${IA}/courses/categories`)).toBe("Course Categories")
  })

  it("still picks the section root on the section root", () => {
    expect(activeTitle(`${IA}/courses`)).toBe("All Courses")
  })

  it("keeps the section root highlighted on a detail route under it", () => {
    // Nothing is listed for a single course, so the section it belongs to is
    // the right answer — highlighting nothing would be worse.
    expect(activeTitle(`${IA}/courses/8ac1c94b-23f3-4594-a13a-efc8b42984d1`)).toBe(
      "All Courses"
    )
  })

  it("never returns two answers", () => {
    for (const path of [
      `${IA}/courses`,
      `${IA}/courses/create`,
      `${IA}/courses/drafts`,
      `${IA}/courses/categories`,
      `${IA}/courses/analytics`,
      `${IA}/enrollment/requests`,
      IA,
    ]) {
      const match = findActiveNavItem(menu, path)
      const all = menu
        .flatMap((m) => [m, ...(m.subItems ?? [])])
        .filter((i) => i === match?.item)
      expect(all).toHaveLength(1)
    }
  })

  it("reports the parent so the group can expand", () => {
    expect(activeParent(`${IA}/courses/drafts`)).toBe("Course Management")
    expect(activeParent(IA)).toBe(null)
  })

  it("honours exact, so a dashboard root does not claim every page under it", () => {
    // "/dashboard/learner" is a prefix of every learner page; that is why the
    // old code carried a hard-coded exclusion for exactly that href.
    expect(activeTitle(`${IA}/courses/create`)).toBe("Create Course")
    expect(activeTitle(IA)).toBe("Dashboard")
  })

  it("highlights nothing for a route the menu does not list", () => {
    expect(findActiveNavItem(menu, "/dashboard/institution-admin/settings/billing")).toBeNull()
  })

  it("ignores items with no href", () => {
    const unlinked: Item[] = [{ title: "Group", subItems: [{ title: "No link" }] }]
    expect(findActiveNavItem(unlinked, "/x")).toBeNull()
  })
})
