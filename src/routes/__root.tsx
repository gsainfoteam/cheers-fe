import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import type { RouterContext } from "@/lib/router-context";

/**
 * 루트는 비어 있다 — 헤더·푸터는 `components/layout/page-shell.tsx` 가 지고,
 * 구간을 소유한 라우트가 자기 `kind` 와 함께 입는다. 이유는 그 파일 주석에 있다.
 */
export const Route = createRootRouteWithContext<RouterContext>()({
  component: Outlet,
});
