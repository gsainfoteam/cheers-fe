import { createFileRoute } from "@tanstack/react-router";

/**
 * "/onboarding" 진입 시 현재 단계로 보내는 자리.
 *
 * 실제 분기는 부모(`onboarding.tsx`)의 beforeLoad 가 한다. `/onboarding` 은
 * 어느 단계 경로에도 속하지 않으므로 거기서 현재 단계로 리다이렉트되고,
 * 이 컴포넌트는 사실상 그려지지 않는다.
 *
 * 그래도 파일을 남겨두는 이유: 라우트가 없으면 `/onboarding` 이 404 가 되어
 * 부모 가드가 아예 실행되지 않는다.
 */
export const Route = createFileRoute("/onboarding/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Redirecting...</div>;
}
