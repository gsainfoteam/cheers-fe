import { createFileRoute } from "@tanstack/react-router";

/**
 * 구글 OAuth 리다이렉트 수신 지점. role과 무관하게 단 하나만 존재한다.
 * TODO: validateSearch(code, state) -> nonce 대조 -> 토큰 교환 -> /onboarding 으로 redirect
 */
export const Route = createFileRoute("/auth/callback")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Signing in...</div>;
}
