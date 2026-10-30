import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The dev server proxies the API to a running runtime: `ceis serve` on its
// default port, or wherever CEIS_API points (e.g. CEIS_API=127.0.0.1:8799).
const api = (process.env.CEIS_API ?? "127.0.0.1:8787").replace(/^https?:\/\//, "");

// The production build is written straight into the Python package so that
// `pip install ceis` ships the app and `ceis serve` can serve it.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "../ceis/server/static",
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
