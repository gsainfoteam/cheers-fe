import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLogin } from "@/api";
import { isApiError } from "@/api";
import googleLogo from "@/assets/brand/google-logo.svg";
import { GOOGLE_CLIENT_ID, loadGoogleIdentity } from "@/lib/google-identity";
import { createNonce } from "@/lib/nonce";
import { toApiType } from "@/lib/role";
import type { Role } from "@/lib/session";

type Props = {
  /** 로그인 시 서버에 보낼 유형. 가입 중인 유저에게는 이 값이 진짜로 작용한다 */
  role: Role;
  /** "다른 계정으로 로그인" — 자동 선택을 끈다 */
  switchAccount?: boolean;
  onSuccess?: () => void;
};

/**
 * 구글 로그인 버튼. 피그마 `Cheers / Social`(332:6152)의 Provider=Google.
 *
 * **시안 버튼 위에 구글 버튼을 투명하게 덮는다.** `accounts.id` 에는 계정
 * 선택창을 코드로 여는 API 가 없어서(One Tap 의 `prompt()` 는 다른 물건이다),
 * 커스텀 버튼을 쓰려면 구글이 그린 버튼을 그대로 두고 그 위에 그림만 얹는
 * 방법밖에 없다. 구글 버튼은 iframe 이라 바깥에서 클릭을 흉내 낼 수도 없다.
 *
 * 그래서 보이는 건 시안 버튼이고, 실제로 눌리는 건 그 위에 깔린 투명한
 * 구글 버튼이다. 포커스도 구글 버튼이 받으므로 보조기술에는 구글의 라벨이
 * 읽힌다 — 시안 쪽은 `aria-hidden` 으로 빼서 같은 말이 두 번 들리지 않게 했다.
 *
 * 투명해서 포커스 링이 안 보이는 건 바깥 상자의 `focus-within` 으로 되살린다.
 */

/**
 * 구글 버튼을 **고정 폭**으로 그려두고 CSS 로 늘린다.
 *
 * `renderButton` 의 `width` 는 400px 이 상한이라 데스크톱 시안(440)을 그대로
 * 줄 수 없다. 폭에 맞춰 다시 그리는 방법도 있지만 창을 줄일 때마다 구글
 * 버튼이 새로 그려진다. 한 번만 그리고 `transform` 으로 덮개를 늘리면
 * 클릭 영역도 같이 늘어난다.
 */
const GIS_WIDTH = 400;
/** `size: "large"` 구글 버튼의 높이. 시안 버튼은 56 이라 세로로도 늘린다 */
const GIS_HEIGHT = 40;

export function GoogleSignInButton({ role, switchAccount, onSuccess }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const login = useLogin();
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [boxWidth, setBoxWidth] = useState(0);

  // 설정 누락은 렌더 중에 알 수 있다. effect 로 state 를 세울 이유가 없다
  const configError = GOOGLE_CLIENT_ID
    ? null
    : "VITE_GOOGLE_CLIENT_ID 가 비어 있습니다. .env 를 확인해 주세요";

  const roleRef = useRef(role);
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    roleRef.current = role;
  }, [role]);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  // 덮개를 얼마나 늘릴지 정하려면 실제 폭을 알아야 한다. 폭은 lg 경계에서도
  // 바뀌고 모바일 가로/세로 전환에서도 바뀌므로 관찰해 둔다
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    setBoxWidth(el.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) => {
      setBoxWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { mutate } = login;

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    let cancelled = false;

    void (async () => {
      try {
        const accounts = await loadGoogleIdentity();
        // nonce 는 버튼 한 벌에 하나. 콜백이 원문을 그대로 들고 쓴다
        const nonce = await createNonce();
        const parent = container.current;
        if (cancelled || !parent) return;

        accounts.initialize({
          client_id: GOOGLE_CLIENT_ID,
          nonce: nonce.hashed,
          auto_select: false,
          cancel_on_tap_outside: true,
          callback: ({ credential }) => {
            mutate(
              {
                provider: "google",
                type: toApiType(roleRef.current),
                token: credential,
                nonce: nonce.raw,
              },
              { onSuccess: () => onSuccessRef.current?.() }
            );
          },
        });

        if (switchAccount) accounts.disableAutoSelect();

        // StrictMode 는 효과를 두 번 실행한다. 비우지 않으면 버튼이 두 개 생긴다
        parent.replaceChildren();
        accounts.renderButton(parent, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "signin_with",
          shape: "pill",
          locale: "ko",
          width: GIS_WIDTH,
        });
      } catch (error) {
        if (!cancelled) setLoadError(error as Error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mutate, switchAccount]);

  const message = configError ?? loadError?.message;

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={box}
        className="ring-focus/50 relative h-14 w-full rounded-lg focus-within:ring-3"
      >
        {/* 피그마 `Cheers / Social` — 보이기만 하는 껍데기 */}
        <div
          aria-hidden
          className="border-line bg-surface text-ink text-label-lg pointer-events-none flex size-full items-center gap-3 rounded-lg border p-4"
        >
          <img
            src={googleLogo}
            alt=""
            width={24}
            height={24}
            className="size-6 shrink-0"
          />
          <span>Google로 계속하기</span>
        </div>

        {/* 진짜 눌리는 구글 버튼. 상자 전체를 덮도록 늘린다 */}
        <div className="absolute inset-0 overflow-hidden rounded-lg opacity-0">
          <div
            ref={container}
            className="origin-top-left"
            style={
              boxWidth
                ? {
                    transform: `scale(${boxWidth / GIS_WIDTH}, ${56 / GIS_HEIGHT})`,
                  }
                : undefined
            }
          />
        </div>
      </div>

      {message ? (
        <p role="alert" className="text-body-sm text-danger">
          {message}
        </p>
      ) : null}
      {login.isPending ? (
        <p className="text-body-sm text-ink-soft">로그인 중…</p>
      ) : null}
      {login.error ? (
        <p role="alert" className="text-body-sm text-danger">
          {describe(login.error)}
        </p>
      ) : null}
    </div>
  );
}

function describe(error: unknown): string {
  if (!isApiError(error)) {
    return error instanceof Error ? error.message : "로그인에 실패했습니다";
  }
  // 백엔드는 구글 토큰 검증 실패도 401 로 준다 ("Invalid OAuth token").
  // 세션 만료가 아니므로 로그인 화면에 그대로 머물러야 한다
  if (error.status === 401)
    return "구글 인증에 실패했습니다. 다시 시도해 주세요";
  if (error.status === 400) return "로그인 요청이 올바르지 않습니다";
  return `로그인에 실패했습니다 (${error.status})`;
}
