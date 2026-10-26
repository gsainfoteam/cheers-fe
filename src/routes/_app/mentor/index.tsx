import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/mentor/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>선배 홈</div>;
}
