/**
 * API 서버 주소.
 *
 * 비워두면 같은 출처(`/api/v1/...`)로 나간다. 개발 중에는 vite.config 의
 * `server.proxy` 로 백엔드에 넘기는 쪽이 편하다 — CORS 도, preflight 도 없다.
 * 배포 환경처럼 출처가 다르면 `.env` 에 `VITE_API_BASE_URL` 을 넣는다.
 */
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "";
