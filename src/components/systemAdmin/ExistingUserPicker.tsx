"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Building2, Check, Loader2, Search, UserPlus } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";

/**
 * ============================================================================
 * Existing-user picker (UL-001)
 * ============================================================================
 *
 * Searches the accounts that already exist, so an admin adding someone can
 * reuse the person rather than creating a second account for the same human
 * being.
 *
 * ── Eligibility ───────────────────────────────────────────────────────────
 *
 * The caller asks for unaffiliated accounts — what this platform calls global
 * or public users: no primary institution, nothing in institution_ids, and no
 * membership row. They are the ones free to be used here, because an account
 * that already belongs somewhere carries that institution's access with it.
 *
 * Accounts that are *not* eligible are still reported, as a count rather than
 * as rows. Showing nothing when the typed address plainly exists is how an
 * admin concludes the search is broken and creates the duplicate anyway.
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
  /** Only accounts belonging to no institution. Default true. */
  unaffiliatedOnly?: boolean;
  selected: LookupUser | null;
  onSelect: (user: LookupUser | null) => void;
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

export function ExistingUserPicker({
  role = null,
  unaffiliatedOnly = true,
  selected,
  onSelect,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LookupUser[]>([]);
  const [hiddenAffiliated, setHiddenAffiliated] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  /*
   * Every reply carries the query that produced it. Without that check a slow
   * answer for "ja" can land after a fast one for "jane@" and overwrite it, so
   * the list shows matches for something the admin has already finished typing.
   */
  const latestQuery = useRef("");

  useEffect(() => {
    const term = query.trim();
    latestQuery.current = term;

    if (term.length < 2) {
      setResults([]);
      setHiddenAffiliated(0);
      setSearched(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    // Debounced: one request per pause, not one per keystroke.
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: term });
        if (unaffiliatedOnly) params.append("unaffiliated_only", "true");
        if (role) params.append("role", role);

        const res = await api.get(`/system-admin/users/lookup?${params.toString()}`);
        if (latestQuery.current !== term) return;

        setResults(Array.isArray(res.data?.data) ? res.data.data : []);
        setHiddenAffiliated(Number(res.data?.hidden_affiliated) || 0);
        setSearched(true);
      } catch {
        if (latestQuery.current !== term) return;
        setResults([]);
        setHiddenAffiliated(0);
        setSearched(true);
      } finally {
        if (latestQuery.current === term) setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query, role, unaffiliatedOnly]);

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
      <Label htmlFor="existing-user-search">Find an existing account</Label>
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
        {unaffiliatedOnly
          ? "Searches accounts that belong to no institution — the global users free to be added here."
          : "Searches every account on the platform."}
      </p>

      {query.trim().length >= 2 && (
        <div className="max-h-56 overflow-y-auto rounded-md border border-border">
          {isSearching && results.length === 0 ? (
            <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching…
            </div>
          ) : results.length === 0 ? (
            <div className="space-y-2 p-4">
              <p className="text-sm text-muted-foreground">
                {searched ? "No eligible account matched." : "Searching…"}
              </p>
              {/*
                The count matters. Returning nothing while the typed address
                plainly exists is how an admin decides the search is broken and
                creates a duplicate account for someone who already has one.
              */}
              {hiddenAffiliated > 0 && (
                <div className="flex items-start gap-2 rounded-md bg-warning/10 p-2.5">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                  <p className="text-xs text-warning">
                    {hiddenAffiliated} matching {hiddenAffiliated === 1 ? "account" : "accounts"}{" "}
                    already {hiddenAffiliated === 1 ? "belongs" : "belong"} to an institution, so
                    {hiddenAffiliated === 1 ? " it is" : " they are"} not listed here.
                  </p>
                </div>
              )}
            </div>
          ) : (
            results.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => onSelect(user)}
                className="flex w-full items-center gap-3 border-b border-border p-2.5 text-left last:border-b-0 hover:bg-accent"
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
                    {!user.is_active && (
                      <Badge variant="outline" className="text-[10px] text-destructive">
                        Deactivated
                      </Badge>
                    )}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {user.email}
                    {user.bwenge_role ? ` · ${user.bwenge_role.replace(/_/g, " ")}` : ""}
                  </span>
                </span>

                <Check className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))
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
