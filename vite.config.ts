import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/Stock_Balancesheet_20251204_v2/',  // 👈 這一行決定了網頁能不能找到圖片和腳本
})
