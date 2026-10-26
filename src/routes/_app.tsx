import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { useSession } from "@/lib/session";

/**
 * 온보딩을 마친 사용자만 들어오는 서비스 본편 레이아웃.
 * TODO: beforeLoad 에서 미완료 사용자를 /onboarding 으로 redirect
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
