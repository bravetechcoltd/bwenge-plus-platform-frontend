"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

/**
 * ============================================================================
 * Duplicate course titles (CI-001) — the advisory client check
 * ============================================================================
 *
 * Two courses are the same course when they carry the same title, of the same
 * type, in the same place. The rule is enforced on the server, in
 * `createCourse` and `updateCourse`, and again by a unique index that catches
 * the writes no controller sees. This hook exists for a different reason: so the
 * wizard can say "that title is taken" while the title is being typed, rather
 * than after fifteen minutes of work and a failed submit.
 *
 * It is advice, not enforcement. It can be wrong — a title can be claimed by
 * someone else in the seconds between the check and the submit — and nothing is
 * allowed to depend on it. That is why the submit path still handles the
 * server's 409: both have to exist, and only one of them is authoritative.
 */

export interface DuplicateState {
  /** True only when the server said so. Never assumed while in flight. */
  isDuplicate: boolean;
  message: string | null;
  existingCourseId: string | null;
  isChecking: boolean;
}

const IDLE: DuplicateState = {
  isDuplicate: false,
  message: null,
  existingCourseId: null,
  isChecking: false,
};

/**
 * Watches a title and reports whether it collides.
 *
 * Debounced, because the natural alternative — checking on every keystroke —
 * sends one request per character and answers out of order, so the message
 * shown is whichever reply happened to land last rather than the one for what
 * is currently in the box. A request in flight is also cancelled when the title
 * changes under it, for the same reason.
 */
export function useDuplicateTitleCheck(
  title: string | undefined,
  options: {
    courseType?: string | null;
    institutionId?: string | null;
    /** The course being edited, which is not its own duplicate. */
    excludeId?: string | null;
    /** Skip entirely, e.g. while the wizard is on another step. */
    enabled?: boolean;
    debounceMs?: number;
  } = {}
): DuplicateState {
  const {
    courseType = null,
    institutionId = null,
    excludeId = null,
    enabled = true,
    debounceMs = 450,
  } = options;

  const [state, setState] = useState<DuplicateState>(IDLE);

  useEffect(() => {
    const trimmed = (title || "").trim();

    /*
     * A title too short to be a real one is not reported as free or taken. A
     * single letter would match half the catalogue and the warning would be
     * noise on the way to a real title.
     */
    if (!enabled || trimmed.length < 3) {
      setState(IDLE);
      return;
    }

    let cancelled = false;
    setState((prev) => ({ ...prev, isChecking: true }));

    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ title: trimmed });
        if (courseType) params.append("course_type", courseType);
        if (institutionId) params.append("institution_id", institutionId);
        if (excludeId) params.append("exclude_id", excludeId);

        const res = await api.get(`/courses/check-duplicate?${params.toString()}`);
        if (cancelled) return;

        const data = res.data?.data || {};
        setState({
          isDuplicate: data.duplicate === true,
          message: data.duplicate === true ? data.message || "That title is already in use." : null,
          existingCourseId: data.existing_course_id || null,
          isChecking: false,
        });
      } catch {
        /*
         * A failed advisory check reports nothing. Showing an error here would
         * put a warning next to a title that may be perfectly fine, and the
         * authoritative check still runs on submit.
         */
        if (!cancelled) setState(IDLE);
      }
    }, debounceMs);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [title, courseType, institutionId, excludeId, enabled, debounceMs]);

  return state;
}

/**
 * The server's duplicate refusal, recognised.
 *
 * `createCourse` answers 409 with `code: "DUPLICATE_COURSE"`, and the thunk
 * rejects with the message. This tells a caller whether what it is holding is
 * that refusal, so the wizard can put the message on the title field instead of
 * raising a generic "failed to create course".
 */
export function isDuplicateCourseError(error: any): boolean {
  const code = error?.response?.data?.code;
  if (code === "DUPLICATE_COURSE") return true;

  const message = typeof error === "string" ? error : error?.response?.data?.message || "";
  return /already exists/i.test(message) && /course/i.test(message);
}
