/**
 * Google Identity Services (GIS) 연동.
 *
 * 리다이렉트 없이 같은 페이지의 콜백으로 id_token 이 들어온다. 그래서
 * `/auth/callback` 을 거치지 않고, nonce 원문이 페이지 이동 중에 사라질 걱정도
 * 없다 — 카카오 인앱 브라우저에서 sessionStorage 가 날아가는 문제를 피하려고
 * 이 방식을 골랐다.
 *
 * 타입은 필요한 만큼만 손으로 적었다. `@types/google.one-tap` 을 받을 수도
 * 있지만, 쓰는 API 가 네 개뿐이라 의존성을 늘릴 이유가 없다.
 */

export type GoogleCredentialResponse = {
  /** 구글이 발급한 id_token (JWT). 백엔드의 `token` 필드로 그대로 보낸다 */
  credential: string;
  select_by?: string;
};

type IdConfiguration = {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  /** nonce 의 SHA-256 hex. id_token 의 nonce 클레임에 들어간다 */
  nonce?: string;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
};

type ButtonConfiguration = {
  type?: "standard" | "icon";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  shape?: "rectangular" | "pill" | "circle" | "square";
  logo_alignment?: "left" | "center";
  /** px. 구글이 받는 범위는 200 ~ 400 이다 */
  width?: number;
  locale?: string;
};

export type GoogleAccountsId = {
  initialize(config: IdConfiguration): void;
  renderButton(parent: HTMLElement, config: ButtonConfiguration): void;
  prompt(): void;
  /** 다음 방문 때 자동 로그인되지 않게 한다. "다른 계정으로 로그인" 용 */
  disableAutoSelect(): void;
  cancel(): void;
};

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

export const GOOGLE_CLIENT_ID: string =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

const GSI_SRC = "https://accounts.google.com/gsi/client";

let loading: Promise<GoogleAccountsId> | null = null;

/**
 * GIS 스크립트를 한 번만 받아온다.
 *
 * 랜딩과 로그인 화면 양쪽에 버튼이 있고 라우팅으로 오갈 수 있어서, 매번
 * script 태그를 꽂으면 중복 로드가 된다.
 */
export function loadGoogleIdentity(): Promise<GoogleAccountsId> {
  loading ??= new Promise<GoogleAccountsId>((resolve, reject) => {
    const existing = window.google?.accounts?.id;
    if (existing) return resolve(existing);

    const script = document.createElement("script");
    script.src = GSI_SRC;
    script.async = true;
    script.onload = () => {
      const accounts = window.google?.accounts?.id;
      if (accounts) resolve(accounts);
      else
        reject(
          new Error("구글 로그인 스크립트를 읽었지만 초기화에 실패했습니다")
        );
    };
    script.onerror = () =>
      reject(new Error("구글 로그인 스크립트를 불러오지 못했습니다"));
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    // 실패를 캐시하면 새로고침 전까지 영영 복구되지 않는다
    loading = null;
    throw error;
  });

  return loading;
}
