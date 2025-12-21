import { io, Socket } from "socket.io-client"

let socket: Socket | null = null

export const getSocket = () => {
  if (!socket) {
    socket = io(
      process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
      {
        withCredentials: true,
        autoConnect: false,
      }
    )
  }
  return socket
}
