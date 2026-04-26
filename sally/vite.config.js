import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Dev via ngrok: host changes each session; ".ngrok-free.app" allows all subdomains.
    allowedHosts: ['.ngrok-free.app', '.ngrok.io'],
  },
})
