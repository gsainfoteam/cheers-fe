/**
 * 토큰 저장소.
 *
 * refresh token 이 응답 본문(opaque 문자열)으로 오기 때문에 httpOnly 쿠키에
 * 담을 방법이 없다. 결국 JS 가 읽을 수 있는 곳에 둘 수밖에 없고, 그중
 * localStorage 를 골랐다 — sessionStorage 는 새 탭마다 로그인이 풀려서
 * 알림톡 딥링크(새 탭으로 열림)와 상극이다.
 *
 * 대신 저장소 접근을 이 파일 하나로 좁혀뒀다. 나중에 백엔드가 쿠키 방식으로
 * 바꾸면 여기만 고치면 된다.
 */

export type Tokens = {
  accessToken: string;
  refreshToken: string;
};

const STORAGE_KEY = "cheers.auth";

let cache: Tokens | null = null;
let loaded = false;

const listeners = new Set<(tokens: Tokens | null) => void>();

function parse(raw: string | null): Tokens | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;
    const { accessToken, refreshToken } = value as Partial<Tokens>;
    if (typeof accessToken !== "string" || typeof refreshToken !== "string") {
      return null;
    }
    return { accessToken, refreshToken };
  } catch {
    return null;
  }
}

/** localStorage 를 직접 읽는다. 다른 탭이 바꿔놨을 수 있는 자리에서 쓴다 */
function readStorage(): Tokens | null {
  try {
    return parse(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    // 사파리 프라이빗 모드 등에서 접근 자체가 막힐 수 있다. 메모리로만 동작한다
    return null;
  }
}

function writeStorage(tokens: Tokens | null) {
  try {
    if (tokens) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // 무시 — 이번 세션 동안은 메모리 캐시로 버틴다
  }
}

export function getTokens(): Tokens | null {
  if (!loaded) {
    cache = readStorage();
    loaded = true;
  }
  return cache;
}

/**
 * 캐시를 건너뛰고 저장소에서 다시 읽는다.
 * refresh 직전에 "다른 탭이 이미 갱신했는지" 확인할 때 쓴다.
 */
export function getTokensFresh(): Tokens | null {
  cache = readStorage();
  loaded = true;
  return cache;
}

export function getAccessToken(): string | null {
  return getTokens()?.accessToken ?? null;
}

export function setTokens(tokens: Tokens) {
  cache = tokens;
  loaded = true;
  writeStorage(tokens);
  emit(tokens);
}

export function clearTokens() {
  cache = null;
  loaded = true;
  writeStorage(null);
  emit(null);
}

function emit(tokens: Tokens | null) {
  for (const listener of listeners) listener(tokens);
}

/** 토큰이 바뀔 때 알림을 받는다. 반환값을 호출하면 구독이 해제된다 */
export function subscribeTokens(
  listener: (tokens: Tokens | null) => void
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * 다른 탭의 로그인 · 로그아웃을 이 탭에도 반영한다.
 *
 * refresh token 이 1회용이라 탭마다 따로 놀면 서로의 토큰을 무효화한다.
 * storage 이벤트로 캐시를 맞춰두면 그 사고의 대부분이 사라진다.
 */
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== null && event.key !== STORAGE_KEY) return;
    const next = readStorage();
    cache = next;
    loaded = true;
    emit(next);
  });
}
