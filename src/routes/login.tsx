import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { toInternalPath } from "@/lib/redirect";

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

  const signIn = () => {
    // TODO: 구글 OAuth 시작. redirect 는 sessionStorage 가 아니라 state 에 실어야 한다
    // (카카오 인앱 브라우저에서 외부 브라우저로 넘어가면 sessionStorage 가 날아간다).
    //
    // switchAccount 일 때 prompt=select_account 를 반드시 붙일 것. 없으면 구글이
    // 기존 세션으로 즉시 돌려보내서 같은 계정으로 다시 로그인되고, 사용자가
    // "다른 계정으로 로그인" 과 "확인할 수 없어요" 사이를 무한히 오간다.
    void { redirect, switchAccount };
  };

  return (
    <div>
      {reason ? <p>{MESSAGE[reason]}</p> : null}
      <Button onClick={signIn}>구글로 로그인</Button>
    </div>
  );
}
