import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/onboarding/mentor/profile")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>선배 기본정보 입력</div>;
}
