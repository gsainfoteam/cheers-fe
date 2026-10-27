import { createFileRoute } from "@tanstack/react-router";

/**
 * "/onboarding" 진입 시 현재 단계로 보내는 자리.
 * TODO: beforeLoad 에서 현재 단계 경로로 redirect
 */
export const Route = createFileRoute("/onboarding/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Redirecting...</div>;
}
