import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({mode}) => {
  const target = loadEnv(mode, process.cwd(), 'RENTIQUE_').RENTIQUE_API_TARGET || 'http://localhost:8000'
  const proxy = { '/api': target }
  return { plugins: [react(), tailwindcss()], server: {proxy}, preview: {proxy} }
})
