"use client";

import React from "react";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "@/lib/store";
import { ThemeProvider } from "./theme-provider";
import { AuthProvider } from "@/hooks/use-auth";
import { CoursesProvider } from "@/hooks/use-courses";
import { OfflineGate } from "@/components/system/offline-gate";
import { Toaster } from "sonner";
import { ConfirmProvider } from "@/components/ui/confirm-provider";

/**
 * Application providers.
 *
 * `LearningProgressProvider` was removed here. It wrapped the whole app but
 * was always mounted without a `courseId`, so it only ever supplied a stub —
 * no component consumed `useLearningProgressContext()`. Learning state now
 * comes from `useLearningPath` inside the Learning Space route, which keeps
 * one progress source rather than a global context plus a route-level hook.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  /*
   * SEO-004. `PersistGate loading={null}` made the whole site invisible to
   * crawlers.
   *
   * PersistGate renders its `loading` prop until redux-persist has
   * rehydrated, and rehydration only happens in the browser. On the server it
   * is never bootstrapped, so with `loading={null}` every page below this
   * point server-rendered as nothing at all. Measured against production:
   * `/` and `/courses` each returned about 20KB of HTML containing roughly
   * one character of visible text, no <h1>, and not one link to a course.
   * No amount of metadata fixes that — there was no content to index.
   *
   * The whole subtree is built once and used for both `loading` and
   * `children`, so the same markup renders on the server, on the client
   * before rehydration, and after it. Identical output at every stage means
   * no hydration mismatch and no blank frame.
   *
   * Passing `children` directly as `loading` does NOT work and was the first
   * attempt: `loading` replaces the entire subtree, providers included, so
   * the app rendered without AuthProvider and the build failed with
   * "useAuth must be used within an AuthProvider". The providers have to be
   * inside whatever `loading` renders, which is why this is one shared tree.
   *
   * What is given up is the reason PersistGate exists: for one frame the UI
   * shows default state rather than persisted state. The session is
   * unaffected — `useSession()` reports "initializing" until it resolves, and
   * nothing renders a negative outcome during it (AXM-CONS-001).
   */
  const tree = (
    <AuthProvider>
      <CoursesProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          storageKey="bwengeplus-theme"
        >
          {/* Connection state is said once, here, at full size, and it
              persists while it lasts — unlike the toast that used to carry
              this news and vanish four seconds later (E-07, E-10). The
              gate overlays rather than replaces, so the tree underneath
              keeps its state and its route (§7). */}
          {/*
            CONF-001. One confirmation dialog for the whole application,
            so the fourteen native confirm() calls become an awaited
            question rather than per-page dialog state.
          */}
          <ConfirmProvider>
            <OfflineGate>{children}</OfflineGate>
          </ConfirmProvider>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </CoursesProvider>
    </AuthProvider>
  );

  return (
    <Provider store={store}>
      <PersistGate loading={tree} persistor={persistor}>
        {tree}
      </PersistGate>
    </Provider>
  );
}
