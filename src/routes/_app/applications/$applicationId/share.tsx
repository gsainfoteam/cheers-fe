import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RouteOverlay } from "@/components/route-overlay";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/session";

/**
 * 연락처 공유 확인. 선배 → 학생 단방향이고, 한번 공개하면 되돌릴 수 없다.
 *
 * 확인 단계에 URL 을 주는 이유: 되돌릴 수 없는 작업일수록 새로고침이나
 * 뒤로가기로 사고가 나면 안 되고, 나중에 "어떤 연락처를 공유할지 선택"이
 * 붙어도 구조가 바뀌지 않는다.
 *
 * TODO: 라우터 context 에 세션이 붙으면 이 분기를 beforeLoad 가드로 올릴 것.
 * 검사 두 가지 — (1) role 이 mentor 인가 (2) status 가 아직 PENDING 인가.
 * 아니면 상세로 redirect. 실제 차단은 서버가 공유 요청을 거부하는 쪽이다.
 */
export const Route = createFileRoute("/_app/applications/$applicationId/share")({
  component: RouteComponent,
});

function RouteComponent() {
  const { applicationId } = Route.useParams();
  const { role } = useSession();
  const navigate = useNavigate();

  const close = () =>
    navigate({ to: "/applications/$applicationId", params: { applicationId } });

  if (role !== "mentor") {
    return (
      <RouteOverlay variant="notice" onClose={close}>
        <p>연락처 공유는 선배만 할 수 있습니다.</p>
        <Button variant="outline" onClick={close}>
          확인
        </Button>
      </RouteOverlay>
    );
  }

  return (
    <RouteOverlay variant="form" onClose={close}>
      {/* TODO: 공유 mutation. 성공 후 close() 하면 상세가 갱신된 연락처를 받는다. */}
      <p>학생에게 연락처를 공유하면 취소할 수 없습니다.</p>
      <Button>공유하기</Button>
      <Button variant="outline" onClick={close}>
        취소
      </Button>
    </RouteOverlay>
  );
}
