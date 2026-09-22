"use client";

import { useEffect, useRef, useCallback } from "react";
import { getSocket } from "@/lib/socket";
import type { Socket } from "socket.io-client";

type EventHandler = (data: any) => void;

/**
 * Hook to subscribe to one or more socket events.
 * Automatically connects, subscribes, and cleans up on unmount.
 *
 * Usage:
 *   useRealtimeEvent("new-notification", (data) => { ... })
 *   useRealtimeEvents({ "enrollment-approved": handler1, "grade-released": handler2 })
 */

// ─── Single event ───────────────────────────────────────────────────────────
export function useRealtimeEvent(event: string, handler: EventHandler) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    let socket: Socket | null = null;
    let mounted = true;

    const setup = async () => {
      socket = await getSocket();
      if (!socket || !mounted) return;

      const wrappedHandler = (data: any) => {
        if (mounted) handlerRef.current(data);
      };

      socket.on(event, wrappedHandler);

      // Store for cleanup
      (socket as any).__rtCleanup = (socket as any).__rtCleanup || [];
      (socket as any).__rtCleanup.push({ event, handler: wrappedHandler });
    };

    setup();

    return () => {
      mounted = false;
      if (socket) {
        const cleanups: { event: string; handler: EventHandler }[] =
          (socket as any).__rtCleanup || [];
        const idx = cleanups.findIndex((c) => c.event === event);
        if (idx !== -1) {
          socket.off(event, cleanups[idx].handler);
          cleanups.splice(idx, 1);
        }
      }
    };
  }, [event]);
}

// ─── Multiple events ────────────────────────────────────────────────────────
export function useRealtimeEvents(events: Record<string, EventHandler>) {
  const eventsRef = useRef(events);
  eventsRef.current = events;

  useEffect(() => {
    let socket: Socket | null = null;
    let mounted = true;
    const registrations: { event: string; handler: EventHandler }[] = [];

    const setup = async () => {
      socket = await getSocket();
      if (!socket || !mounted) return;

      for (const [event, _handler] of Object.entries(eventsRef.current)) {
        const wrappedHandler = (data: any) => {
          if (mounted) eventsRef.current[event]?.(data);
        };
        socket.on(event, wrappedHandler);
        registrations.push({ event, handler: wrappedHandler });
      }
    };

    setup();

    return () => {
      mounted = false;
      if (socket) {
        for (const { event, handler } of registrations) {
          socket.off(event, handler);
        }
      }
    };
    // Re-subscribe when event keys change
  }, [Object.keys(events).join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
}

// ─── Join a course room (for course-level events) ───────────────────────────
export function useJoinCourseRoom(courseId: string | null | undefined) {
  useEffect(() => {
    if (!courseId) return;
    let socket: Socket | null = null;

    const join = async () => {
      socket = await getSocket();
      if (socket) {
        socket.emit("join-course", { courseId });
      }
    };

    join();

    return () => {
      if (socket) {
        socket.emit("leave-course", { courseId });
      }
    };
  }, [courseId]);
}

// ─── Emit a socket event ────────────────────────────────────────────────────
export function useSocketEmit() {
  return useCallback(async (event: string, data: any) => {
    const socket = await getSocket();
    if (socket) {
      socket.emit(event, data);
    }
  }, []);
}
