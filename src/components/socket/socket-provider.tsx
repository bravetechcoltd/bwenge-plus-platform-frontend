"use client"

import { useEffect } from "react"
import { getSocket } from "@/lib/socket"

export function SocketProvider() {
  useEffect(() => {
    const socket = getSocket()
    if (!socket.connected) socket.connect()

    return () => {
      socket.disconnect()
    }
  }, [])

  return null
}
