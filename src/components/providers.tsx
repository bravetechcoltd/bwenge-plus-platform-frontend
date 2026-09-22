"use client";

import React, { useEffect, useState } from "react";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "@/lib/store";
import { ThemeProvider } from "./theme-provider";
import { AuthProvider } from "@/hooks/use-auth";
import { CoursesProvider } from "@/hooks/use-courses";
import { OfflineGate } from "@/components/system/offline-gate";
import { Toaster } from "sonner";

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
  const [, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
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
              <OfflineGate>{children}</OfflineGate>
              <Toaster richColors position="top-right" />
            </ThemeProvider>
          </CoursesProvider>
        </AuthProvider>
      </PersistGate>
    </Provider>
  );
}
