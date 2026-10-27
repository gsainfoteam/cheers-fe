import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/onboarding/mentor/verify")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>명함 첨부 및 인증</div>;
}
