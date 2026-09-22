// frontend/lib/socket.ts (enhanced version with token validation)

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let isConnecting = false;

// Derive the socket server origin from NEXT_PUBLIC_API_URL
const getSocketOrigin = (): string => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3003";
  return apiUrl.replace(/\/api\/?$/, "");
};

/**
 * Validate JWT token before attempting socket connection
 * This helps debug token issues
 */
export const validateToken = async (token: string): Promise<{ valid: boolean; userId?: string; error?: string }> => {
  try {
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/debug/jwt-check`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (data.valid) {
      return { 
        valid: true, 
        userId: data.extracted_info?.user_id 
      };
    } else {
      return { 
        valid: false, 
        error: data.verification_error?.message || data.error 
      };
    }
  } catch (error: any) {
    return { valid: false, error: error.message };
  }
};

export const getSocket = async () => {
  // If socket exists and is connected, return it
  if (socket && socket.connected) {
    return socket;
  }
  
  // Prevent multiple simultaneous connection attempts
  if (isConnecting) {
    // Wait for the existing connection attempt
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (socket && socket.connected) {
      return socket;
    }
  }
  
  isConnecting = true;
  
  try {
    const token = localStorage.getItem("bwengeplus_token");
    const origin = getSocketOrigin();

    
    if (!token) {
      isConnecting = false;
      return null;
    }
    
    
    // Validate token before connecting
    const validation = await validateToken(token);
    
    if (!validation.valid) {
      
      // If token is expired or invalid, clear it and redirect
      if (validation.error?.includes("expired") || validation.error?.includes("signature")) {
        localStorage.removeItem("bwengeplus_token");
        localStorage.removeItem("user");
        if (typeof window !== 'undefined') {
          window.location.href = "/login";
        }
      }
      
      isConnecting = false;
      return null;
    }
    
    
    // Create new socket connection
    socket = io(origin, {
      auth: {
        token: token,
      },
      path: "/socket.io/",
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      extraHeaders: {
        Authorization: `Bearer ${token}`
      },
    });

    socket.on("connect", () => {
      isConnecting = false;

      const userStr = localStorage.getItem("user");
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user?.id) {
            socket?.emit("join", { userId: user.id });
          }
        } catch (e) {
        }
      }
    });

    socket.on("disconnect", (reason) => {
      if (reason === "io server disconnect") {
        // the disconnection was initiated by the server, reconnect manually
        socket?.connect();
      }
    });

    socket.on("connect_error", (error) => {
      isConnecting = false;
      
      if (error.message === "Invalid token") {
        
        // Re-validate token
        const currentToken = localStorage.getItem("bwengeplus_token");
        if (currentToken) {
          validateToken(currentToken).then(result => {
            if (!result.valid) {
              localStorage.removeItem("bwengeplus_token");
              localStorage.removeItem("user");
              if (typeof window !== 'undefined') {
                window.location.href = "/login";
              }
            }
          });
        }
      }
    });

    socket.on("reconnect", (attemptNumber) => {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user?.id) {
            socket?.emit("join", { userId: user.id });
          }
        } catch (e) {
        }
      }
    });
    
    socket.on("reconnect_attempt", async (attemptNumber) => {
      // Refresh token on reconnect attempt
      const newToken = localStorage.getItem("bwengeplus_token");
      if (newToken && socket) {
        // Re-validate token before reconnecting
        const validation = await validateToken(newToken);
        if (validation.valid) {
          socket.auth = { token: newToken };
          if (socket.io) {
            socket.io.opts.extraHeaders = {
              Authorization: `Bearer ${newToken}`
            };
          }
        } else {
        }
      }
    });
    
    socket.on("user-room-joined", ({ userId }) => {
    });
    
    socket.on("space-joined", ({ spaceId }) => {
    });

    return socket;
    
  } catch (error: any) {
    isConnecting = false;
    return null;
  }
};

// ── Enhancement #2: Typing indicators ────────────────────────────────────────

export const emitTypingStart = async (conversationId: string, receiverId: string) => {
  const s = await getSocket();
  s?.emit("typing-start", { conversationId, receiverId });
};

export const emitTypingStop = async (conversationId: string, receiverId: string) => {
  const s = await getSocket();
  s?.emit("typing-stop", { conversationId, receiverId });
};

// ── Enhancement #10: Browser notifications & sound ───────────────────────────

let notificationListenerSetUp = false;

/**
 * Call once from the app root (or message-inbox) to register notification
 * logic directly on the socket — fires when document is hidden / window
 * is not focused, exactly as the guide specifies.
 */
export const setupNotificationListener = async () => {
  if (notificationListenerSetUp) return;
  notificationListenerSetUp = true;

  const s = await getSocket();
  if (!s) return;

  const fireNotification = (title: string, body: string) => {
    if (typeof document === "undefined" || !document.hidden) return;

    // Sound
    try {
      new Audio("/notification.mp3").play().catch(() => {/* no audio file – silent */});
    } catch { /* ignore */ }

    // Browser notification
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(title, { body, icon: "/favicon.ico" });
    }
  };

  s.on("new-message", (msg: any) => {
    const sender = msg.sender;
    const name = sender
      ? `${sender.first_name || ""} ${sender.last_name || ""}`.trim() || "New message"
      : "New message";
    fireNotification(name, msg.content || "📎 Attachment");
  });

  s.on("new-space-message", (msg: any) => {
    const sender = msg.sender;
    const name = sender
      ? `${sender.first_name || ""} ${sender.last_name || ""}`.trim() || "Space message"
      : "Space message";
    fireNotification(name, msg.content || "📎 Attachment");
  });
};

export const joinSpaceRoom = async (spaceId: string) => {
  const s = await getSocket();
  if (!s) {
    return;
  }
  if (!s.connected) {
    s.connect();
  }
  s.emit("join", { spaceId });
};

// ── Space typing indicators ──────────────────────────────────────────────────

export const emitSpaceTypingStart = async (spaceId: string) => {
  const s = await getSocket();
  s?.emit("space-typing-start", { spaceId });
};

export const emitSpaceTypingStop = async (spaceId: string) => {
  const s = await getSocket();
  s?.emit("space-typing-stop", { spaceId });
};

// ── Join/leave course rooms ──────────────────────────────────────────────────

export const joinCourseRoom = async (courseId: string) => {
  const s = await getSocket();
  s?.emit("join-course", { courseId });
};

export const leaveCourseRoom = async (courseId: string) => {
  const s = await getSocket();
  s?.emit("leave-course", { courseId });
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  isConnecting = false;
};