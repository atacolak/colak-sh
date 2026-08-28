import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { site } from "./src/site";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "node:zlib": new URL("./src/shims/node-zlib.ts", import.meta.url)
        .pathname,
    },
  },
  server: {
    allowedHosts: [site.host],
    proxy: {
      "/ws": {
        target: "ws://127.0.0.1:8790",
        ws: true,
      },
      "/healthz": "http://127.0.0.1:8790",
      "/catalog": "http://127.0.0.1:8790",
    },
  },
});
