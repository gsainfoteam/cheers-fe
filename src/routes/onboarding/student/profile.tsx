import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/onboarding/student/profile")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>학생 기본정보 입력</div>;
}
