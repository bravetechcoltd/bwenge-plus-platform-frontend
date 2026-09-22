"use client"

/**
 * ============================================================================
 * /dashboard/profile/sessions — the learner's own sessions
 * ============================================================================
 *
 * LS-SEC-002 §13.2, finding LS-19.
 *
 * The live database held 99 active sessions across 13 accounts, one holding 20.
 * Sessions were created on every login and never surfaced to anyone — including
 * the person they belonged to.
 *
 * This page exists as a security feature **for** the learner, not only against
 * them. Someone whose credentials have been shared or stolen can see it here
 * and end it themselves, without waiting for an administrator.
 */

import { useCallback, useState } from "react"
import useSWR from "swr"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Loader2, LogOut, Monitor, ShieldCheck } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { LearningApiError } from "@/lib/learning/api"
import { learningSecurityApi, type LearnerSession } from "@/lib/learning/security-api"

function formatWhen(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"

  const minutes = Math.round((Date.now() - date.getTime()) / 60000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes} min ago`
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h ago`
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export default function SessionsPage() {
  const { toast } = useToast()
  const [revoking, setRevoking] = useState<string | null>(null)

  const { data, error, isLoading, mutate } = useSWR(
    ["my-sessions"],
    () => learningSecurityApi.getMySessions(),
    { revalidateOnFocus: false, shouldRetryOnError: false }
  )

  const revoke = useCallback(
    async (session: LearnerSession) => {
      setRevoking(session.id)
      try {
        await learningSecurityApi.revokeSession(session.id)
        toast({
          title: "Session signed out",
          description: "That device will need to sign in again.",
        })
        await mutate()
      } catch (err) {
        toast({
          title: "Couldn't sign that session out",
          description: (err as LearningApiError)?.message || "Please try again.",
          variant: "destructive",
        })
      } finally {
        setRevoking(null)
      }
    },
    [toast, mutate]
  )

  const sessions = data?.sessions ?? []

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Signed-in devices
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Every device currently signed in to your account. If you don&apos;t
          recognise one, sign it out — and change your password.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      ) : error ? (
        <Card className="shadow-none">
          <CardContent className="flex items-center gap-2.5 p-5 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {(error as LearningApiError)?.message ||
              "We couldn't load your sessions."}
          </CardContent>
        </Card>
      ) : sessions.length === 0 ? (
        <Card className="shadow-none">
          <CardContent className="p-5 text-sm text-muted-foreground">
            No active sessions found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <Card key={session.id} className="shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                  {session.device_info || "Unknown device"}
                  {session.is_current ? (
                    <Badge className="bg-success/15 text-success hover:bg-success/20">
                      This device
                    </Badge>
                  ) : null}
                </CardTitle>
                <CardDescription className="text-xs">
                  Last active {formatWhen(session.last_activity)}
                  {session.ip_address ? ` · ${session.ip_address}` : ""}
                  {session.system ? ` · ${session.system}` : ""}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={revoking === session.id || session.is_current}
                  onClick={() => void revoke(session)}
                >
                  {revoking === session.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <LogOut className="h-3.5 w-3.5" />
                  )}
                  {/* Signing out the current session from here would look like
                      a crash rather than a deliberate action — the header's
                      Sign out is the right affordance for that. */}
                  {session.is_current ? "Use Sign out to end this one" : "Sign out"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
