import * as React from "react";
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import type { RouterContext } from "@/lib/router-context";

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
});

function RootComponent() {
  return (
    <React.Fragment>
      <div>Hello "__root"!</div>
      <Outlet />
    </React.Fragment>
  );
}
