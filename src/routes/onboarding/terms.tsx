import { createFileRoute } from "@tanstack/react-router";

/** 학생/선배 공통 약관 동의. 항목 데이터만 role 별로 달라진다. */
export const Route = createFileRoute("/onboarding/terms")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>약관 동의</div>;
}
