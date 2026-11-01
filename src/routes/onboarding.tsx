import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { requireSession } from "@/lib/guards";
import { entryPath, isAllowed } from "@/lib/onboarding-steps";

/**
 * 온보딩 전 구간의 레이아웃. 단계 가드와 진행바가 여기에만 존재한다.
 *
 * 가드를 단계별 화면이 아니라 이 레이아웃에 두는 이유: 단계가 일곱 화면인데
 * 각자 가드를 달면 같은 판단이 일곱 벌이 되고, 하나만 빠뜨려도 그 화면으로
 * 딥링크해서 단계를 건너뛸 수 있다. 여기 하나면 그 구멍이 생기지 않는다.
 *
 * `/onboarding` 자체로 들어온 경우도 여기서 처리된다 — 어느 단계 경로도
 * 아니므로 현재 단계의 진입 지점으로 보내진다.
 */
export const Route = createFileRoute("/onboarding")({
  beforeLoad: async ({ context, location }) => {
    const me = await requireSession(context.queryClient, location);

    // 가입을 마친 사람이 뒤로가기로 돌아온 경우. 다시 동의시키면 안 된다
    if (!me.next_step) throw redirect({ to: "/home" });

    // 단계를 앞서갔거나, 유형이 다른 쪽 화면을 열었을 때
    if (!isAllowed(me.type, me.next_step, location.pathname)) {
      throw redirect({ to: entryPath(me.type, me.next_step) });
    }

    return { me, step: me.next_step };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { step } = Route.useRouteContext();

  return (
    <div>
      <div>Onboarding — {step}</div>
      <Outlet />
    </div>
  );
}
