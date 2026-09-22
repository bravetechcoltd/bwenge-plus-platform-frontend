/**
 * ============================================================================
 * Which navigation item is the current one
 * ============================================================================
 *
 * Exactly one, which is the whole point.
 *
 * The sidebar decided this per item with `pathname.startsWith(item.href)`, and
 * a nested route satisfies that for its parent as well as for itself. On
 * /dashboard/institution-admin/courses/categories both "Course Categories" and
 * "All Courses" lit up, because the second is a prefix of the first. Two items
 * highlighted is not a cosmetic problem: the highlight is the answer to "where
 * am I", and two answers is none.
 *
 * The other sidebar in this folder went the other way and matched only on
 * equality, which leaves nothing highlighted the moment a learner opens a
 * detail route — /courses/<id> is not equal to /courses. Both behaviours come
 * from deciding item by item, with no item able to see that a better match
 * exists.
 *
 * So the decision is made once, across the whole tree: every item that could
 * match is collected, and the longest href wins. A parent stays highlighted on
 * its own detail routes and yields to a child that matches more of the path.
 */

export interface NavCandidate {
  href?: string
  /** When set, only an exact path match counts — for a section root. */
  exact?: boolean
}

/**
 * One shape for both levels.
 *
 * A sub-item is an item that happens to have no children, which is what the
 * menus in this app actually contain — and typing the two levels separately
 * only forces every caller to name both.
 */
export interface NavNode extends NavCandidate {
  subItems?: NavNode[]
}

/**
 * Whether `href` covers `pathname`.
 *
 * The trailing slash is load-bearing. Without it "/dashboard/x/courses" also
 * covers "/dashboard/x/courses-archive", which is a different section that
 * happens to start with the same letters.
 */
export function pathCovers(pathname: string, href: string): boolean {
  if (!href) return false
  if (pathname === href) return true
  return pathname.startsWith(href.endsWith("/") ? href : `${href}/`)
}

/**
 * The single item the path belongs to, with its parent when it is a sub-item.
 *
 * Returns null when nothing matches, which is a real answer — an unlisted
 * route should highlight nothing rather than the nearest thing to it.
 */
export function findActiveNavItem<T extends NavNode>(
  items: readonly T[],
  pathname: string
): { item: T; parent: T | null } | null {
  let best: { item: T; parent: T | null } | null = null
  let bestLength = -1

  const consider = (candidate: T, parent: T | null) => {
    const href = candidate.href
    if (!href) return

    const matches = candidate.exact ? pathname === href : pathCovers(pathname, href)
    if (!matches) return

    // Ties cannot happen between different hrefs of the same length that both
    // cover the path, so first-wins on equal length is only reached by a
    // duplicate href, where either answer is the same answer.
    if (href.length > bestLength) {
      best = { item: candidate, parent }
      bestLength = href.length
    }
  }

  for (const item of items) {
    // A group's own href is considered too: a section root with children of
    // its own should still highlight when the path is exactly it.
    consider(item, null)
    for (const subItem of (item.subItems ?? []) as T[]) consider(subItem, item)
  }

  return best
}
