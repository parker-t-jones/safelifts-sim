/**
 * Vite config for the dev server, production build, and Vitest.
 * Tests live in tests/ (mirroring src/), not next to components.
 */
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    include: ['tests/**/*.test.ts'],
  },
})
