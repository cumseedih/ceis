import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The dev server proxies the API to a running runtime: `wevvy serve` on its
// default port, or wherever WEVVY_API points (e.g. WEVVY_API=127.0.0.1:8799).
const api = (process.env.WEVVY_API ?? "127.0.0.1:8787").replace(/^https?:\/\//, "");

// The production build is written straight into the Python package so that
// `pip install wevvy` ships the app and `wevvy serve` can serve it.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "../wevvy/server/static",
    emptyOutDir: true,
    sourcemap: false,
  },
  server: {
    port: 5173,
    proxy: {
      "/api": `http://${api}`,
      "/ws": { target: `ws://${api}`, ws: true },
    },
  },
});
