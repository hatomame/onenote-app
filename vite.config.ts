import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // ←これを追加

// https://vite.dev/config/
export default defineConfig({
  base: '/onenote-app/', // ← これを追加！
  plugins: [
    react(),
    tailwindcss(),
  ],
})