import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": {
          target: "https://api.jotform.com",
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              const apiKey = env.JOTFORM_API_KEY;

              if (apiKey) {
                proxyReq.setHeader("APIKEY", apiKey);
              }
            });
          },
        },
      },
    },
  };
});