import { io } from 'socket.io-client';

export function createSocket() {
  const token = localStorage.getItem('token');
  return io('http://localhost:3001', {
    auth: { token },
    autoConnect: false,
  });
}
