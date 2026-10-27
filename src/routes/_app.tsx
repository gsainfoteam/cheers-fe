import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { useSession } from "@/lib/session";

/**
 * 온보딩을 마친 사용자만 들어오는 서비스 본편 레이아웃.
 *
 * TODO: beforeLoad 에서
 *  - 세션이 없으면 `/login?redirect=<현재 경로>` 로. 랜딩(`/`)이 아니다 —
 *    딥링크로 들어온 사람에게 role 선택 화면을 보여줄 이유가 없고,
 *    이렇게 두면 알림톡뿐 아니라 모든 딥링크가 복귀 지점을 얻는다
 *  - 온보딩 미완료 사용자는 `/onboarding` 으로
 */
export const Route = createFileRoute("/_app")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <AppHeader />
      <Outlet />
    </div>
  );
}

/**
 * 경로는 role 과 무관하게 하나씩이고, 라벨만 달라진다.
 * role 별로 경로를 나눴다면 이 헤더가 통째로 두 벌이 됐을 자리다.
 */
function AppHeader() {
  const { role } = useSession();

  return (
    <nav>
      <Link to="/home">홈</Link>
      <Link to="/mentors">{role === "student" ? "선배 찾기" : "선배 둘러보기"}</Link>
      <Link to="/applications">{role === "student" ? "보낸 신청" : "받은 신청"}</Link>
      <Link to="/me">마이페이지</Link>
    </nav>
  );
}
