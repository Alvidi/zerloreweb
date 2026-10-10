import process from 'node:process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // La vista previa asigna un puerto libre por PORT; en terminal sigue siendo 5173.
  server: { port: Number(process.env.PORT) || 5173 },
})
