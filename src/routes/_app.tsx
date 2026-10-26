import { Outlet, createFileRoute } from "@tanstack/react-router";

/**
 * 온보딩을 마친 사용자만 들어오는 서비스 본편 레이아웃.
 * TODO: beforeLoad 에서 미완료 사용자를 /onboarding 으로 redirect
 */
export const Route = createFileRoute("/_app")({
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
