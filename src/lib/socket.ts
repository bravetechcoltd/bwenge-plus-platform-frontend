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
    console.log("🔍 Validating token before socket connection...");
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/debug/jwt-check`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (data.valid) {
      console.log("✅ Token is valid for socket connection");
      console.log("📋 User ID from token:", data.extracted_info?.user_id);
      return { 
        valid: true, 
        userId: data.extracted_info?.user_id 
      };
    } else {
      console.error("❌ Token validation failed:", data.verification_error?.message || data.error);
      console.error("📋 Decoded payload:", data.decoded_payload);
      return { 
        valid: false, 
        error: data.verification_error?.message || data.error 
      };
    }
  } catch (error: any) {
    console.error("❌ Error validating token:", error.message);
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
    console.log("⏳ Socket connection already in progress, waiting...");
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

    console.log("🔌 Connecting socket to:", origin);
    console.log("🔌 Using path: /socket.io/");
    
    if (!token) {
      console.error("❌ No token found in localStorage");
      isConnecting = false;
      return null;
    }
    
    console.log("🔌 Token preview:", token.substring(0, 50) + "...");
    
    // Validate token before connecting
    const validation = await validateToken(token);
    
    if (!validation.valid) {
      console.error("❌ Token is invalid - cannot establish socket connection");
      console.error("📋 Validation error:", validation.error);
      
      // If token is expired or invalid, clear it and redirect
      if (validation.error?.includes("expired") || validation.error?.includes("signature")) {
        console.log("🔄 Token is invalid, clearing localStorage and redirecting to login...");
        localStorage.removeItem("bwengeplus_token");
        localStorage.removeItem("user");
        if (typeof window !== 'undefined') {
          window.location.href = "/login";
        }
      }
      
      isConnecting = false;
      return null;
    }
    
    console.log("✅ Token validated, userId:", validation.userId);
    
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
      console.log("✅ Socket connected successfully:", socket?.id);
      isConnecting = false;

      const userStr = localStorage.getItem("user");
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user?.id) {
            socket?.emit("join", { userId: user.id });
            console.log("✅ Emitted join for user room:", user.id);
          }
        } catch (e) {
          console.error("Error parsing user:", e);
        }
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("❌ Socket disconnected, reason:", reason);
      if (reason === "io server disconnect") {
        // the disconnection was initiated by the server, reconnect manually
        console.log("🔄 Server initiated disconnect, reconnecting...");
        socket?.connect();
      }
    });

    socket.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error.message);
      isConnecting = false;
      
      if (error.message === "Invalid token") {
        console.error("❌ Token rejected by server - checking token validity...");
        
        // Re-validate token
        const currentToken = localStorage.getItem("bwengeplus_token");
        if (currentToken) {
          validateToken(currentToken).then(result => {
            if (!result.valid) {
              console.error("❌ Token is invalid, clearing and redirecting...");
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
      console.log("🔄 Socket reconnected after", attemptNumber, "attempts");
      const userStr = localStorage.getItem("user");
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user?.id) {
            socket?.emit("join", { userId: user.id });
            console.log("✅ Rejoined user room after reconnect:", user.id);
          }
        } catch (e) {
          console.error("Error parsing user on reconnect:", e);
        }
      }
    });
    
    socket.on("reconnect_attempt", async (attemptNumber) => {
      console.log("🔄 Reconnection attempt:", attemptNumber);
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
          console.log("✅ Token refreshed for reconnection");
        } else {
          console.error("❌ Token invalid during reconnection attempt");
        }
      }
    });
    
    socket.on("user-room-joined", ({ userId }) => {
      console.log("✅ Server confirmed user room joined:", userId);
    });
    
    socket.on("space-joined", ({ spaceId }) => {
      console.log("✅ Server confirmed space room joined:", spaceId);
    });

    return socket;
    
  } catch (error: any) {
    console.error("❌ Error creating socket:", error.message);
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
    console.error("❌ Cannot join space room: socket not available");
    return;
  }
  if (!s.connected) {
    console.log("⚠️ Socket not connected, connecting first...");
    s.connect();
  }
  s.emit("join", { spaceId });
  console.log("✅ Emitted join for space room:", spaceId);
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  isConnecting = false;
};