import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "node:path"

/**
 * Component tests, alongside the app rather than instead of it.
 *
 * The build is still Next's — this config exists only so the performance
 * components' loading, empty, error and interaction states can be asserted
 * rather than eyeballed. It resolves the same `@/` alias as `tsconfig.json`
 * so components import exactly as they do in the app, and it touches nothing
 * Next reads.
 *
 *   npm test          run once
 *   npm run test:watch
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
