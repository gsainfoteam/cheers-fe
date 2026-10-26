import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/onboarding/student/extra")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>학생 추가정보 입력</div>;
}
