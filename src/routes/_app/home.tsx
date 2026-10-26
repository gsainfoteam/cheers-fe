import { createFileRoute } from "@tanstack/react-router";
import { useSession } from "@/lib/session";

/**
 * 로그인 후 홈. role 로 경로를 나누지 않는다 — 세션이 이미 아는 사실을
 * URL 에 다시 적을 뿐이고, 나누는 순간 서로의 홈을 막는 가드가 생긴다.
 */
export const Route = createFileRoute("/_app/home")({
  component: RouteComponent,
});

function RouteComponent() {
  const { role } = useSession();

  // TODO: role 별 대시보드 컴포넌트로 분기 (src/features/home/)
  return <div>{role === "student" ? "학생 홈" : "선배 홈"}</div>;
}
