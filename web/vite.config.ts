import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// O front chama /api/... e o Vite repassa para a API em localhost:3000,
// tirando o prefixo. Como o navegador só fala com o próprio Vite, não
// precisa liberar CORS na API.
const API_URL = process.env.API_URL ?? 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: API_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
