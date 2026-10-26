import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/student/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>학생 홈</div>;
}
