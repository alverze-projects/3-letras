import { io, Socket } from 'socket.io-client';
import { WS_EVENTS } from '@3letras/events/websocket.events';

const SOCKET_URL = process.env.EXPO_PUBLIC_WS_URL ?? 'http://localhost:3000/api';

let socket: Socket | null = null;

export function connectSocket(token: string): Socket {
  if (socket?.connected) socket.disconnect();

  const url = new URL(SOCKET_URL);

  socket = io(url.origin, {
    path: `${url.pathname === '/' ? '' : url.pathname}/socket.io/`,
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
