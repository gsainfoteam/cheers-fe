import { createFileRoute } from "@tanstack/react-router";
import { useSession } from "@/lib/session";

/** 마이페이지. 보여주는 정보는 role 별로 다르지만 "나"라는 리소스는 하나다. */
export const Route = createFileRoute("/_app/me/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { role } = useSession();

  // TODO: src/features/profile/ 의 StudentMyPage / MentorMyPage 로 분기
  return <div>{role === "student" ? "학생 마이페이지" : "선배 마이페이지"}</div>;
}
