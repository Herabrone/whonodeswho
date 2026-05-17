import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const API_TARGET = process.env.VITE_API_BASE_URL || "http://localhost:3000";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    proxy: {
      "/auth": { target: API_TARGET, changeOrigin: true },
      "/graph": { target: API_TARGET, changeOrigin: true },
      "/chat": { target: API_TARGET, changeOrigin: true },
      "/actions": { target: API_TARGET, changeOrigin: true },
      "/health": { target: API_TARGET, changeOrigin: true },
    },
  },
});
