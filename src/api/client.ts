import createClient from "openapi-fetch";
import { refreshAccessToken } from "./auth";
import { API_BASE_URL } from "./env";
import type { paths } from "./schema";
import { getAccessToken } from "./tokens";

/**
 * Authorization 을 붙이지 않는 엔드포인트.
 *
 * 로그인은 아직 토큰이 없고, refresh 는 만료된 access token 으로 호출해도
 * 되는 API 다. 여기에 401 재시도를 걸면 refresh 실패 → refresh 재시도로
 * 무한 루프가 된다.
 */
const PUBLIC_PATHS = ["/api/v1/user/oauth/login", "/api/v1/user/refresh"];

function isPublic(url: string): boolean {
  const { pathname } = new URL(url);
  return PUBLIC_PATHS.some((path) => pathname.endsWith(path));
}

function withAuth(request: Request, token: string): Request {
  const headers = new Headers(request.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return new Request(request, { headers });
}

/**
 * 토큰을 붙이고, 401 이면 한 번만 갱신해서 다시 보낸다.
 *
 * 핵심은 `clone()` 의 위치다. `new Request(request, ...)` 는 원본 요청의 body
 * 스트림을 소비해 버리기 때문에, 보내기 전에 복제해두지 않으면 재시도할 때
 * body 가 빈 요청이 나간다. POST 가 대부분인 이 API 에서는 치명적이다.
 */
async function authFetch(request: Request): Promise<Response> {
  if (isPublic(request.url)) {
    return fetch(request);
  }

  const retrySource = request.clone();
  const token = getAccessToken();
  const response = await fetch(token ? withAuth(request, token) : request);

  if (response.status !== 401) {
    return response;
  }

  const refreshed = await refreshAccessToken();
  if (!refreshed) {
    // 갱신 실패 — 원래의 401 을 그대로 올려보내 화면이 판단하게 한다
    return response;
  }
  return fetch(withAuth(retrySource, refreshed));
}

/**
 * 타입이 붙은 API 클라이언트.
 *
 * 경로 · 쿼리 · 요청 본문 · 응답이 모두 `schema.d.ts` 에서 추론된다.
 * S3 presigned URL 업로드는 이 클라이언트를 쓰지 않는다 — Authorization 이
 * 붙으면 S3 가 403 으로 거절한다. `file.ts` 참고.
 */
export const api = createClient<paths>({
  baseUrl: API_BASE_URL,
  fetch: authFetch,
});
