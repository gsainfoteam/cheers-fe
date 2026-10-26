import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/onboarding/mentor/extra")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>선배 추가정보 입력</div>;
}
