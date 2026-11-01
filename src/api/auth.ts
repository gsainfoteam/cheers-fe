import { AccessTokenSchema } from "./dto";
import { API_BASE_URL } from "./env";
import {
  clearTokens,
  getTokens,
  getTokensFresh,
  setTokens,
  type Tokens,
} from "./tokens";

const REFRESH_URL = `${API_BASE_URL}/api/v1/user/refresh`;
const REFRESH_LOCK = "cheers.auth.refresh";

/**
 * 진행 중인 refresh. 같은 탭에서 401 이 여러 개 동시에 터져도
 * refresh 는 한 번만 나간다.
 *
 * 명세상 refresh token 은 1회용이 아니라 만료까지 계속 쓰는 값이라 중복
 * 호출이 세션을 깨뜨리지는 않는다. 그래도 합쳐두는 편이 낫다 — 화면 하나에서
 * 401 이 여러 개 터질 때마다 같은 요청을 서버에 n번 보낼 이유가 없다.
 */
let inFlight: Promise<string | null> | null = null;

const unauthenticatedListeners = new Set<() => void>();

/**
 * 세션이 완전히 끊겼을 때 알림을 받는다 (refresh 까지 실패한 경우).
 * 라우터가 구독해서 로그인 화면으로 보내는 용도.
 */
export function onUnauthenticated(listener: () => void): () => void {
  unauthenticatedListeners.add(listener);
  return () => unauthenticatedListeners.delete(listener);
}

function giveUp() {
  clearTokens();
  for (const listener of unauthenticatedListeners) listener();
}

/**
 * access token 을 갱신한다. 성공하면 새 access token, 실패하면 null.
 *
 * 동시 호출은 하나로 합쳐지고(같은 탭), 탭 사이에는 Web Locks 로 직렬화된다.
 */
export function refreshAccessToken(): Promise<string | null> {
  inFlight ??= runRefresh().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/**
 * 가입 완료 응답(`student/info`, `graduated/info`)에 새 토큰이 딸려 오면 교체한다.
 *
 * 명세상 이 시점에 기존 토큰은 즉시 무효가 된다. 교체를 빠뜨리면 가입을 마친
 * 직후 모든 요청이 401 로 떨어지고, refresh 마저 죽은 토큰이라 로그아웃된다.
 */
export function adoptIssuedTokens(data: {
  access_token?: string;
  refresh_token?: string;
}) {
  if (!data.access_token || !data.refresh_token) return;
  setTokens({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  });
}

async function runRefresh(): Promise<string | null> {
  const started = getTokens();
  if (!started) return null;

  // 탭 사이 직렬화. 같은 refresh token 으로 동시에 갱신해도 서버는 받아주지만,
  // 락을 잡아두면 늦게 온 탭이 앞선 탭의 결과를 그대로 쓰고 끝낼 수 있다.
  // Web Locks 가 없는 환경(구형 브라우저)에서는 그냥 진행한다.
  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request(REFRESH_LOCK, () => rotate(started));
  }
  return rotate(started);
}

async function rotate(started: Tokens): Promise<string | null> {
  // 락을 기다리는 동안 다른 탭이 이미 갱신했을 수 있다. 그랬다면 그 토큰을 쓴다.
  // refresh token 은 그대로이므로 access token 이 바뀌었는지로 판단한다
  const current = getTokensFresh();
  if (!current) return null;
  if (current.accessToken !== started.accessToken) {
    return current.accessToken;
  }

  let response: Response;
  try {
    response = await fetch(REFRESH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: current.refreshToken }),
    });
  } catch {
    // 네트워크 장애는 세션 만료가 아니다. 토큰을 지우지 않고 다음 기회를 노린다
    return null;
  }

  if (
    response.status === 400 ||
    response.status === 401 ||
    response.status === 403
  ) {
    giveUp();
    return null;
  }
  if (!response.ok) {
    return null;
  }

  // 응답에는 access token 만 들어 있다 — refresh token 은 재발급되지 않는다.
  // 여기서 refresh token 까지 기대하면 파싱이 실패해 멀쩡한 세션이 끊긴다
  let next: { access_token: string };
  try {
    next = AccessTokenSchema.parse(await response.json());
  } catch {
    return null;
  }
  setTokens({
    accessToken: next.access_token,
    refreshToken: current.refreshToken,
  });
  return next.access_token;
}
