import { useEffect, useRef, useState } from "react";
import { useLogin } from "@/api";
import { isApiError } from "@/api";
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
 * 구글 로그인 버튼.
 *
 * 구글이 직접 그리는 버튼이다. `accounts.id` 에는 계정 선택창을 코드로 여는
 * API 가 없어서, 커스텀 버튼으로 대체하려면 이 버튼을 투명하게 덮는 방식밖에
 * 없다. 디자인이 확정되면 그때 씌우면 된다.
 */
export function GoogleSignInButton({ role, switchAccount, onSuccess }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const login = useLogin();
  const [loadError, setLoadError] = useState<Error | null>(null);

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
        });
      } catch (error) {
        if (!cancelled) setLoadError(error as Error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mutate, switchAccount]);

  return (
    <div>
      <div ref={container} />
      {(configError ?? loadError) ? (
        <p role="alert">{configError ?? loadError?.message}</p>
      ) : null}
      {login.isPending ? <p>로그인 중…</p> : null}
      {login.error ? <p role="alert">{describe(login.error)}</p> : null}
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
