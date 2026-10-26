import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/onboarding/student/verify")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>학교 이메일 인증</div>;
}
