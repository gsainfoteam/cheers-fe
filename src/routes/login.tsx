import {
  createFileRoute,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { userInfoQuery } from "@/api";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { toInternalPath } from "@/lib/redirect";
import { lastRole } from "@/lib/role";

const searchSchema = z.object({
  redirect: z.string().optional(),
  reason: z.enum(["application", "wrong-account"]).optional(),
  switchAccount: z.coerce.boolean().optional(),
});

/**
 * 이미 가입한 사용자의 재로그인. 랜딩(`/`)과 달리 role 을 고르지 않는다.
 *
 * 알림톡을 받은 멘토는 이미 온보딩을 마친 사용자라서 "학생으로 시작 /
 * 선배로 시작" 화면을 보여줄 이유가 없다. 딥링크로 들어온 비로그인 사용자는
 * 모두 여기로 모인다.
 */
export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => {
    const parsed = searchSchema.safeParse(search);
    const value = parsed.success ? parsed.data : {};
    return {
      redirect: toInternalPath(value.redirect),
      reason: value.reason,
      switchAccount: value.switchAccount === true,
    };
  },
  component: RouteComponent,
});

const MESSAGE = {
  application: "신청 내용을 보려면 로그인을 해주세요.",
  "wrong-account": "다른 계정으로 로그인해 주세요.",
} as const;

function RouteComponent() {
  const { reason, redirect, switchAccount } = Route.useSearch();
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();

  /**
   * 유형을 묻지 않지만 API 는 `type` 을 필수로 받는다. 가입을 마친 유저에게는
   * 서버가 무시하는 값이고, 가입 중인 유저를 위해 마지막에 고른 유형을 쓴다.
   * 저장소가 비어 있으면 학생으로 떨어진다 — lib/role.ts 주석 참고.
   */
  const role = lastRole() ?? "student";

  const afterLogin = async () => {
    if (redirect) {
      // 딥링크 복귀. 타입이 붙은 `to` 로는 임의 경로를 표현할 수 없어 history 를 쓴다
      router.history.push(redirect);
      return;
    }
    const me = await queryClient.fetchQuery(userInfoQuery());
    if (me.next_step) navigate({ to: "/onboarding" });
    else navigate({ to: "/home" });
  };

  return (
    <div>
      {reason ? <p>{MESSAGE[reason]}</p> : null}
      <GoogleSignInButton
        role={role}
        // GIS 에는 prompt=select_account 가 없다. 자동 선택을 꺼서 계정 선택
        // 화면이 뜨게 한다 — 없으면 구글이 기존 세션으로 즉시 돌려보내서
        // 사용자가 "다른 계정으로 로그인" 과 "확인할 수 없어요" 사이를 맴돈다
        switchAccount={switchAccount}
        onSuccess={() => void afterLogin()}
      />
    </div>
  );
}
