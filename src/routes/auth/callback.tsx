import { createFileRoute } from "@tanstack/react-router";

/**
 * OAuth 리다이렉트 수신 지점.
 *
 * 구글은 더 이상 여기로 오지 않는다. GIS(Google Identity Services)로 붙이면서
 * 리다이렉트 없이 같은 페이지의 콜백으로 id_token 을 받게 됐다 —
 * `components/google-sign-in-button.tsx` 참고.
 *
 * 네이버 · 애플을 붙일 때 리다이렉트가 필요하면 이 자리를 쓴다. 그때도
 * 백엔드는 code 가 아니라 **id_token(네이버는 access token)** 을 받는다는 점에
 * 주의할 것. code 교환에는 client secret 이 필요해서 브라우저에서는 못 한다.
 */
export const Route = createFileRoute("/auth/callback")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Signing in...</div>;
}
