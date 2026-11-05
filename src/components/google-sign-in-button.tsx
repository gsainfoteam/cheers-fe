import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLogin } from "@/api";
import { isApiError } from "@/api";
import {
  GOOGLE_CLIENT_ID,
  loadGoogleIdentity,
  type GoogleAccountsId,
} from "@/lib/google-identity";
import { createNonce } from "@/lib/nonce";
import { toApiType } from "@/lib/role";
import type { Role } from "@/lib/session";

type Props = {
  /** 로그인 시 서버에 보낼 유형. 가입 중인 유저에게는 이 값이 진짜로 작용한다 */
  role: Role;
  /** "다른 계정으로 로그인" — 자동 선택을 끈다 */
  switchAccount?: boolean;
  onSuccess?: () => void;
  /**
   * 구글 버튼의 문구. 평소 로그인은 `Google로 계속하기`(continue_with),
   * 알림톡 진입(343:9110)은 `Google로 로그인`(signin_with) 이다 — 이미 가입한
   * 선배에게 "계속" 은 맞지 않는다.
   *
   * 구글 계정에 로그인된 브라우저에서는 이 값과 상관없이 구글이
   * "○○○(으)로 로그인" 개인화 버튼을 그린다.
   */
  text?: "continue_with" | "signin_with";
};

/**
 * 구글 로그인 버튼. 구글(GIS)이 그린 버튼을 **그대로 보여준다.**
 *
 * 예전에는 피그마 `Cheers / Social`(332:6152) 시안 버튼 위에 구글 버튼을
 * `opacity: 0` 으로 덮고 `transform: scale()` 로 늘려 썼다. 처음 로그인할 때는
 * 됐지만, 한 번 로그인한 브라우저에서는 구글이 같은 자리에 **개인화 버튼**
 * ("○○○(으)로 로그인")을 그린다. 이 버튼은 팝업 없이 한 번에 토큰을 내주므로
 * 클릭재킹을 막으려고 iframe 이 실제로 보이는지 검사하고, 투명하거나 늘어난
 * iframe 의 클릭은 조용히 버린다. 그래서 재로그인 때 버튼을 눌러도 아무 일도
 * 일어나지 않았다(stg 에서 확인). localhost 에서는 개인화 버튼이 안 나와
 * 드러나지 않았다.
 *
 * 구글 버튼을 숨기거나 변형하면 같은 일이 다시 생긴다. 모양은
 * `renderButton` 옵션 안에서만 맞춘다.
 */

/** `renderButton` 의 `width` 상한. 데스크톱 시안(440)보다 좁아서 가운데 둔다 */
const GIS_MAX_WIDTH = 400;
/** `size: "large"` 구글 버튼의 높이. 그려지기 전에 자리를 잡아 둘 때 쓴다 */
const GIS_HEIGHT = 40;

export function GoogleSignInButton({
  role,
  switchAccount,
  onSuccess,
  text = "continue_with",
}: Props) {
  const box = useRef<HTMLDivElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const login = useLogin();
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [boxWidth, setBoxWidth] = useState(0);
  /**
   * `initialize` 를 마친 GIS. 초기화할 때마다 새 객체로 감싸서, 같은
   * `accounts` 라도 다시 초기화했으면 버튼을 새로 그리게 한다
   */
  const [gis, setGis] = useState<{ accounts: GoogleAccountsId } | null>(null);

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

  // 구글 버튼 폭은 숫자로만 줄 수 있다. 자리의 폭은 lg 경계에서도 바뀌고
  // 모바일 가로/세로 전환에서도 바뀌므로 관찰해 둔다
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
        // nonce 는 초기화 한 번에 하나. 콜백이 원문을 그대로 들고 쓴다
        const nonce = await createNonce();
        if (cancelled) return;

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
        setGis({ accounts });
      } catch (error) {
        if (!cancelled) setLoadError(error as Error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mutate, switchAccount]);

  // 폭이 바뀔 때만 다시 그린다. 데스크톱은 상한(400)에 걸려 창을 줄여도
  // 그대로이고, 모바일에서는 회전할 때 정도만 다시 그려진다
  const width = Math.min(GIS_MAX_WIDTH, Math.floor(boxWidth));

  useEffect(() => {
    const parent = container.current;
    if (!gis || !parent || width <= 0) return;

    // StrictMode 는 효과를 두 번 실행한다. 비우지 않으면 버튼이 두 개 생긴다
    parent.replaceChildren();
    gis.accounts.renderButton(parent, {
      type: "standard",
      theme: "outline",
      size: "large",
      text,
      // 시안의 rounded-lg 에 가장 가까운 모양
      shape: "rectangular",
      logo_alignment: "left",
      locale: "ko",
      width,
    });
  }, [gis, width, text]);

  const message = configError ?? loadError?.message;

  return (
    <div className="flex flex-col gap-3">
      <div ref={box} className="flex w-full justify-center">
        {/* 진짜 구글 버튼. 숨기거나 늘리지 않는다 — 위 주석 참고 */}
        <div ref={container} style={{ minHeight: GIS_HEIGHT }} />
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
