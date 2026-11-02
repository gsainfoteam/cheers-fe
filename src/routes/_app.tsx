import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { PageShell } from "@/components/layout/page-shell";
import { requireSession } from "@/lib/guards";
import { useSession } from "@/lib/session";

/**
 * 온보딩을 마친 사용자만 들어오는 서비스 본편 레이아웃.
 *
 * 이 가드가 하위 라우트 전부를 덮는다. `/home`, `/mentors`, `/applications`,
 * `/me` 에 각각 가드를 다는 대신 여기 한 곳에만 둔다.
 */
export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ context, location }) => {
    const me = await requireSession(context.queryClient, location);

    // 가입이 끝나지 않았으면 본편에 들어올 수 없다. 어느 단계로 보낼지는
    // `/onboarding` 의 가드가 서버의 next_step 을 보고 정한다
    if (me.next_step) throw redirect({ to: "/onboarding" });

    return { me };
  },
  component: RouteComponent,
});

/**
 * 경로는 role 과 무관하게 하나씩이고, 메뉴 라벨만 달라진다. role 별로 경로를
 * 나눴다면 헤더가 통째로 두 벌이 됐을 자리다 — 지금은 `kind` 한 글자로 갈린다.
 */
function RouteComponent() {
  const { role } = useSession();

  return (
    <PageShell kind={role === "student" ? "student" : "alumni"}>
      <Outlet />
    </PageShell>
  );
}
