import type { ReactNode } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { cn } from "cn";

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
  const navigate = useNavigate();
  // TODO: 세션 스토어에서 읽기. 온보딩 가드와 같은 소스를 써야 한다.
  const role: "student" | "mentor" = "student";

  const close = () => navigate({ to: "/mentors" });

  if (role !== "student") {
    return (
      <Overlay variant="notice" onClose={close}>
        <p>멘토 간의 신청은 불가능합니다.</p>
        <Button variant="outline" onClick={close}>
          확인
        </Button>
      </Overlay>
    );
  }

  return (
    <Overlay variant="form" onClose={close}>
      {/* TODO: 신청 폼 (react-hook-form + zod) */}
      <p>{mentorId} 에게 만남 신청</p>
    </Overlay>
  );
}

/**
 * 데스크톱에서는 가운데 모달, 모바일에서는 전체 화면(폼) 또는 바텀시트(안내).
 * 분기를 useMediaQuery 가 아니라 CSS 로 두는 이유: 창 크기가 바뀌어도
 * 리마운트가 일어나지 않아 작성 중인 입력값이 살아남는다.
 *
 * TODO: Base UI Dialog 로 감싸 포커스 트랩과 ESC 닫기를 얻을 것.
 */
function Overlay({
  variant,
  onClose,
  children,
}: {
  variant: "form" | "notice";
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div
        className={cn(
          "absolute bg-background text-foreground md:top-1/2 md:left-1/2 md:h-auto md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-xl md:border md:shadow-lg",
          variant === "form"
            ? "inset-0 md:inset-auto md:w-[480px]"
            : "inset-x-0 bottom-0 rounded-t-xl md:inset-auto md:w-[380px] md:rounded-xl"
        )}
      >
        {children}
      </div>
    </div>
  );
}
