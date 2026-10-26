import { Outlet, createFileRoute } from "@tanstack/react-router";

/**
 * 온보딩 전 구간의 레이아웃. 단계 가드와 진행바가 여기에만 존재한다.
 * TODO: beforeLoad 에서 세션/단계를 확인하고 앞서간 경우 현재 단계로 redirect
 */
export const Route = createFileRoute("/onboarding")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <div>Onboarding</div>
      <Outlet />
    </div>
  );
}
