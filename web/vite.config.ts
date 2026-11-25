import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    // npm run dev のとき、/api へのリクエストを Go サーバーに転送する
    proxy: { '/api': 'http://localhost:8080' },
  },
})
