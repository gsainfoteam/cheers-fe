import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      tanstackRouter({ target: "react", autoCodeSplitting: true }),
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: { "@": path.resolve(import.meta.dirname, "src") },
    },
    /**
     * 개발 중에는 `/api` 를 백엔드로 넘긴다.
     *
     * 백엔드가 CORS 를 열어두지 않아서(preflight OPTIONS 가 404) 브라우저에서
     * 직접 부르면 Authorization 이 붙는 모든 요청이 차단된다. 프록시를 타면
     * 브라우저 입장에서는 같은 출처라 CORS 자체가 성립하지 않는다.
     *
     * 배포 환경에는 이 프록시가 없다. 백엔드가 CORS 를 열어주거나, 프론트와
     * 같은 도메인 뒤에 놓여야 한다.
     */
    server: {
      /**
       * 백엔드 CORS allowlist 에 `http://localhost:5173` 이 정확히 그 문자열로
       * 올라가 있다. 포트가 밀리면 출처가 달라져 모든 요청이 차단되므로,
       * 조용히 5174 로 넘어가는 대신 시끄럽게 실패시킨다.
       */
      port: 5173,
      strictPort: true,
      // 대상이 없으면 프록시를 아예 걸지 않는다. 기본값을 dev 서버 자신으로
      // 두면 /api 요청이 스스로에게 되돌아와 무한 루프가 된다.
      proxy: env.VITE_API_PROXY_TARGET
        ? {
            "/api": {
              target: env.VITE_API_PROXY_TARGET,
              changeOrigin: true,
            },
          }
        : undefined,
    },
  };
});
