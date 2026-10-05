import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || "http://127.0.0.1:8001";

  return {
    plugins: [react()],
    envPrefix: ["VITE_", "NEXT_PUBLIC_"],
    server: {
      host: "127.0.0.1",
      fs: {
        allow: [".."],
      },
      proxy: {
        "/chat": {
          target: apiProxyTarget,
          changeOrigin: true,
        },
        "/resume": {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});