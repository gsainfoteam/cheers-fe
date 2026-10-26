import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RouteOverlay } from "@/components/route-overlay";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/session";

/**
 * 만남 신청. 학생은 폼, 선배는 안내 문구를 받는다.
 *
 * 라우트를 role 별로 쪼개지 않는 이유: 두 경우 모두 "카드를 눌러 열고 닫는"
 * 같은 동작이고, 노출되는 정보도 없다. 실제 차단은 서버가 신청 요청을
 * 거부하는 것으로 이뤄진다.
 */
export const Route = createFileRoute("/_app/mentors/$mentorId/apply")({
  component: RouteComponent,
});

function RouteComponent() {
  const { mentorId } = Route.useParams();
  const { role } = useSession();
  const navigate = useNavigate();

  const close = () => navigate({ to: "/mentors" });

  if (role !== "student") {
    return (
      <RouteOverlay variant="notice" onClose={close}>
        <p>멘토 간의 신청은 불가능합니다.</p>
        <Button variant="outline" onClick={close}>
          확인
        </Button>
      </RouteOverlay>
    );
  }

  return (
    <RouteOverlay variant="form" onClose={close}>
      {/* TODO: 신청 폼 (react-hook-form + zod) */}
      <p>{mentorId} 에게 만남 신청</p>
    </RouteOverlay>
  );
}
