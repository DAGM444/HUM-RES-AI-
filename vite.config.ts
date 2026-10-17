import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0', // Listen on all interfaces
    port: 5173,
    strictPort: true,
    hmr: {
      clientPort: 5173,
      host: 'localhost', // Force HMR to talk to localhost
    },
    watch: {
      usePolling: true, // Required for Docker + Windows
    },
    proxy: {
      '/api': {
        target: process.env.BACKEND_URL || 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});