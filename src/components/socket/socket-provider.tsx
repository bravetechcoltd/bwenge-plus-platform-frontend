"use client"

import { useEffect } from "react"
import { getSocket } from "@/lib/socket"

export function SocketProvider() {
  useEffect(() => {
    let cleanup: (() => void) | null = null

    const initSocket = async () => {
      const socket = await getSocket()
      if (!socket) return

      if (!socket.connected) socket.connect()

      cleanup = () => {
        socket.disconnect()
      }
    }

    initSocket()

    return () => {
      cleanup?.()
    }
  }, [])

  return null
}