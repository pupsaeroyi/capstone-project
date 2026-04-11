import { io, Socket } from "socket.io-client";
import { API_BASE } from "@/lib/api";
import { getSavedToken } from "@/lib/auth";

let socket: Socket | null = null;
let currentToken: string | null = null;

export async function getSocket(): Promise<Socket> {
  const token = await getSavedToken();

  if (socket && socket.connected && token === currentToken) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  currentToken = token;
  socket = io(API_BASE, {
    auth: { token },
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentToken = null;
  }
}