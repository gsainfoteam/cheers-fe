import { createFileRoute } from "@tanstack/react-router";
import { useSession } from "@/lib/session";

/** 프로필 미리보기 — 상대방에게 내 프로필이 어떻게 보이는지. */
export const Route = createFileRoute("/_app/me/preview")({
  component: RouteComponent,
});

function RouteComponent() {
  const { role } = useSession();

  // TODO: 선배는 학생이 보는 멘토 카드/프로필, 학생은 선배가 신청 상세에서 보는 모습
  return <div>{role === "student" ? "학생 프로필 미리보기" : "선배 프로필 미리보기"}</div>;
}
