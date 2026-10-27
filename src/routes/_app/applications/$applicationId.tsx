import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link, Outlet, createFileRoute, useChildMatches } from "@tanstack/react-router";
import { useSession } from "@/lib/session";

/**
 * 신청 상세. 학생이 보낸 신청 42 와 선배가 받은 신청 42 는 같은 객체이므로
 * 경로도 하나다 — 알림톡 딥링크를 만들 때 수신자 role 을 몰라도 된다.
 *
 * 상세 본체를 index 가 아니라 레이아웃에 두는 이유: 연락처 공유 화면이
 * 이 위에 모달로 떠야 하므로 언마운트되면 안 된다.
 */
export const Route = createFileRoute("/_app/applications/$applicationId")({
  // TODO: loader 에서 상세를 불러오고, 수신자가 아니면 서버의 403 을 그대로 throw 한다.
  // 권한 판단을 클라이언트가 흉내 내지 말 것.
  component: RouteComponent,
  errorComponent: RouteErrorComponent,
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

/**
 * 알림톡을 다른 계정으로 열었을 때. URL 은 `/applications/42` 그대로 둔다 —
 * 전용 경로로 튕기면 원래 목적지를 또 search param 으로 들고 다녀야 하고,
 * 계정을 바꾼 뒤 "같은 URL 을 다시 연다"는 단순한 복귀가 불가능해진다.
 */
function RouteErrorComponent({ error }: ErrorComponentProps) {
  const { applicationId } = Route.useParams();
  // TODO: API 클라이언트의 에러 타입으로 교체
  const forbidden = (error as { status?: number }).status === 403;

  if (!forbidden) {
    return <p>신청을 불러오지 못했어요.</p>;
  }

  return (
    <div>
      <p>이 계정에서는 신청을 확인할 수 없어요.</p>
      <Link
        to="/login"
        search={{
          redirect: `/applications/${applicationId}`,
          reason: "wrong-account",
          switchAccount: true,
        }}
      >
        다른 계정으로 로그인
      </Link>
      <Link to="/applications">받은 신청 목록</Link>
    </div>
  );
}
