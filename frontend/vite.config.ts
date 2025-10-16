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
    proxy: {
      "/api": {
        target: `http://localhost:${process.env.FLASK_PORT || 5000}`,
        changeOrigin: true,
      },
    },
  },
});
