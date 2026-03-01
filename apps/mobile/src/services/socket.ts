import { io, Socket } from 'socket.io-client';
import { WS_EVENTS } from '@3letras/events/websocket.events';

const SOCKET_URL = process.env.EXPO_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:3000';

let socket: Socket | null = null;

export function connectSocket(token: string): Socket {
  if (socket?.connected) socket.disconnect();

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function getSocket(): Socket | null {
  return socket;
}

export { WS_EVENTS };
