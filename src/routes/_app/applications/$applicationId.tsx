import { Link, Outlet, createFileRoute, useChildMatches } from "@tanstack/react-router";
import { useSession } from "@/lib/session";

/**
 * 신청 상세. 학생이 보낸 신청 42 와 선배가 받은 신청 42 는 같은 객체이므로
 * 경로도 하나다 — 알림 딥링크를 만들 때 수신자 role 을 몰라도 된다.
 *
 * 상세 본체를 index 가 아니라 레이아웃에 두는 이유: 연락처 공유 화면이
 * 이 위에 모달로 떠야 하므로 언마운트되면 안 된다.
 */
export const Route = createFileRoute("/_app/applications/$applicationId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { applicationId } = Route.useParams();
  const { role } = useSession();
  const hasOverlay = useChildMatches().length > 0;

  // TODO: 실제 상세 로드.
  // 연락처는 서버가 공유 전에는 null 로 비워서 내려줘야 한다. status 를 보고
  // 클라이언트가 가리는 방식이면 개발자 도구로 그대로 보인다.
  const application = { status: "PENDING" as const, contact: null as string | null };
  const canShare = role === "mentor" && application.status === "PENDING";

  return (
    <div>
      <div className={hasOverlay ? "hidden md:block" : "block"}>
        {/* TODO: status 가 EXPIRED 면 만료 안내. 거절 흐름은 없고 시간이 지나면 만료된다. */}
        <p>신청 {applicationId}</p>
        {application.contact ? <p>연락처: {application.contact}</p> : null}
        {canShare ? (
          <Link to="/applications/$applicationId/share" params={{ applicationId }}>
            연락처 공유하기
          </Link>
        ) : null}
      </div>
      <Outlet />
    </div>
  );
}
