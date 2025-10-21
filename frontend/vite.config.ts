import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
  ],
  server: {
    host: "0.0.0.0", // Listen on all network interfaces (required for devcontainer)
    port: parseInt(process.env.VITE_PORT || "5173"),
    watch: {
      usePolling: true, // Enable polling for file changes (required for Docker/WSL2)
      interval: 100, // Check for changes every 100ms
    },
    hmr: {
      // Remove host or set to undefined to auto-detect in Codespaces
      clientPort: 443, // Use HTTPS port for Codespaces
      protocol: "wss", // Use secure WebSocket (wss://)
    },
    proxy: {
      "/api": {
        target: `http://localhost:${process.env.FLASK_PORT || 5000}`,
        changeOrigin: true,
      },
    },
  },
});
