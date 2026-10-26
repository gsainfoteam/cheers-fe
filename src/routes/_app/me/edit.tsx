import { createFileRoute } from "@tanstack/react-router";
import { useSession } from "@/lib/session";

/**
 * 정보 수정.
 *
 * TODO: 온보딩의 profile / extra 폼과 같은 컴포넌트를 쓴다.
 * 폼 본체를 src/features/profile/ 로 빼서 온보딩과 여기서 공유할 것 —
 * 라우트 파일 안에 폼을 그리면 같은 폼을 두 벌 관리하게 된다.
 */
export const Route = createFileRoute("/_app/me/edit")({
  component: RouteComponent,
});

function RouteComponent() {
  const { role } = useSession();

  return <div>{role === "student" ? "학생 정보 수정" : "선배 정보 수정"}</div>;
}
