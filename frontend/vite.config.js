import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Only for `npm run dev` on the Mac (hot reload while editing UI). /api goes to a
    // running stack's nginx, which forwards it to the backend — e.g.
    //   API_TARGET=http://192.168.56.13:8080 npm run dev
    // The production build never uses this: there nginx serves the page itself.
    proxy: {
      '/api': process.env.API_TARGET ?? 'http://localhost:8080',
    },
  },
});
