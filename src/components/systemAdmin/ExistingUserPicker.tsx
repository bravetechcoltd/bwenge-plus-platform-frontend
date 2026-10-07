"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, Check, Loader2, Lock, Search, UserPlus } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";

/**
 * ============================================================================
 * Existing-user picker (UL-001)
 * ============================================================================
 *
 * Searches the accounts that already exist, so an admin adding someone reuses
 * the person rather than creating a second account for the same human being.
 *
 * ── Why ineligible people are shown, not hidden ───────────────────────────
 *
 * The first version filtered them out on the server and reported a count. That
 * is better than silence, but it still leaves the admin typing a colleague's
 * address, seeing an empty list, and having no idea whether the account exists
 * at all — so they create a duplicate.
 *
 * Every match is listed now. The ones that cannot be used are greyed, not
 * clickable, and carry the reason: already at an institution, already an
 * instructor here, deactivated. The admin learns the thing they actually needed
 * to know, which is that the person exists and why this screen will not take
 * them.
 *
 * Each caller supplies its own rule through `ineligible`, because what
 * disqualifies someone depends on what they are being added to.
 */

export interface LookupUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  name: string;
  profile_picture_url: string | null;
  bwenge_role: string | null;
  is_active: boolean;
  is_verified: boolean;
  is_unaffiliated: boolean;
  institutions: { id: string; name: string; role: string }[];
}

interface Props {
  /** Restricts results to one platform role, e.g. "INSTRUCTOR". */
  role?: string | null;
  /**
   * The reason this account cannot be used, or null when it can.
   *
   * Defaults to the institution rule: an account that already belongs
   * somewhere carries that institution's access with it.
   */
  ineligible?: (user: LookupUser) => string | null;
  selected: LookupUser | null;
  onSelect: (user: LookupUser | null) => void;
  label?: string;
  hint?: string;
}

function initialsOf(name: string): string {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase() || "?"
  );
}

/** The default rule: belonging to an institution disqualifies an account. */
export function institutionIneligibility(user: LookupUser): string | null {
  if (!user.is_unaffiliated) {
    const where = user.institutions[0]?.name;
    return where ? `Already at ${where}` : "Already in an institution";
  }
  return null;
}

export function ExistingUserPicker({
  role = null,
  ineligible = institutionIneligibility,
  selected,
  onSelect,
  label = "Find an existing account",
  hint,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LookupUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  /*
   * Every reply carries the query that produced it. Without the check a slow
   * answer for "ja" can land after a fast one for "jane@" and overwrite it, so
   * the list shows matches for text the admin has already finished typing.
   */
  const latestQuery = useRef("");

  useEffect(() => {
    const term = query.trim();
    latestQuery.current = term;

    if (term.length < 2) {
      setResults([]);
      setSearched(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    // Debounced: one request per pause, not one per keystroke.
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: term });
        // Deliberately unfiltered: ineligible accounts are shown with a reason
        // rather than withheld, so the admin learns the person exists.
        if (role) params.append("role", role);

        const res = await api.get(`/system-admin/users/lookup?${params.toString()}`);
        if (latestQuery.current !== term) return;

        setResults(Array.isArray(res.data?.data) ? res.data.data : []);
        setSearched(true);
      } catch {
        if (latestQuery.current !== term) return;
        setResults([]);
        setSearched(true);
      } finally {
        if (latestQuery.current === term) setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query, role]);

  /* ── the chosen person ─────────────────────────────────────────────── */

  if (selected) {
    return (
      <div className="space-y-2">
        <Label>Selected account</Label>
        <div className="flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 p-3">
          {selected.profile_picture_url ? (
            <img
              src={selected.profile_picture_url}
              alt=""
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {initialsOf(selected.name)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{selected.name}</p>
            <p className="truncate text-xs text-muted-foreground">{selected.email}</p>
          </div>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="shrink-0 text-xs font-medium text-primary hover:underline"
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  /* ── the search ────────────────────────────────────────────────────── */

  return (
    <div className="space-y-2">
      <Label htmlFor="existing-user-search">{label}</Label>
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          id="existing-user-search"
          className="pl-8"
          placeholder="Type an email address or a name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
        {isSearching && (
          <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {hint ??
          "Accounts that cannot be used are listed too, with the reason, so you can tell an ineligible person from one who has no account at all."}
      </p>

      {query.trim().length >= 2 && (
        <div className="max-h-64 overflow-y-auto rounded-md border border-border">
          {isSearching && results.length === 0 ? (
            <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching…
            </div>
          ) : results.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              {searched
                ? "No account matched. Create a new one instead."
                : "Searching…"}
            </p>
          ) : (
            results.map((user) => {
              const reason = ineligible(user);
              const blocked = !!reason;

              return (
                <button
                  key={user.id}
                  type="button"
                  disabled={blocked}
                  onClick={() => !blocked && onSelect(user)}
                  className={`flex w-full items-center gap-3 border-b border-border p-2.5 text-left last:border-b-0 ${
                    blocked ? "cursor-not-allowed opacity-60" : "hover:bg-accent"
                  }`}
                >
                  {user.profile_picture_url ? (
                    <img
                      src={user.profile_picture_url}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {initialsOf(user.name)}
                    </div>
                  )}

                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-foreground">
                        {user.name}
                      </span>
                      {user.is_unaffiliated ? (
                        <Badge variant="outline" className="text-[10px]">
                          Global
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-warning">
                          <Building2 className="mr-1 h-2.5 w-2.5" />
                          {user.institutions[0]?.name ?? "In an institution"}
                        </Badge>
                      )}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {user.email}
                      {user.bwenge_role ? ` · ${user.bwenge_role.replace(/_/g, " ")}` : ""}
                    </span>
                    {/* The reason, on the row it belongs to. */}
                    {blocked && (
                      <span className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-warning">
                        <Lock className="h-2.5 w-2.5" />
                        {reason}
                      </span>
                    )}
                  </span>

                  {!blocked && <Check className="h-4 w-4 shrink-0 text-muted-foreground" />}
                </button>
              );
            })
          )}
        </div>
      )}

      {query.trim().length > 0 && query.trim().length < 2 && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <UserPlus className="h-3 w-3" />
          Keep typing — two characters at least.
        </p>
      )}
    </div>
  );
}
