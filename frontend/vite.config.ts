import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:3001';
console.log(`[vite] proxy target: ${backendUrl}`);

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: backendUrl,
        changeOrigin: true,
      },
      '/socket.io': {
        target: backendUrl,
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
