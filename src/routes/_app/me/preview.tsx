import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { userInfoQuery } from "@/api";
import { EmployeeBadge } from "@/components/employee-badge";
import { badgeDataOf } from "@/components/employee-badge-data";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useSession } from "@/lib/session";

/**
 * 공개 사원증 미리보기. 피그마 `Dialog / 공개 사원증 미리보기`(338:9308,
 * 화면 338:9268 / 338:9212).
 *
 * 마이페이지(`me.tsx` 레이아웃) 위에 뜬다 — 데스크톱 560×636 모달, 모바일
 * 전체 화면. 버튼 줄은 기본값(`닫기` 하나)이 시안과 같다.
 *
 * 마이페이지 오른쪽의 사원증과 **같은 그림**이다(같은 `badgeDataOf`). 버튼
 * 라벨은 `사원증 미리보기`, 이 제목은 `공개 사원증 미리보기` — 시안대로 둘을
 * 다르게 둔다.
 */
export const Route = createFileRoute("/_app/me/preview")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const { role } = useSession();
  const { data: me } = useSuspenseQuery(userInfoQuery());
  const profile = me.graduated?.profile;

  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => {
        if (!open) void navigate({ to: "/me" });
      }}
      title="공개 사원증 미리보기"
      className="lg:h-159 lg:w-140"
    >
      {role === "mentor" && profile ? (
        <>
          {/*
           * 피그마 `Credential preview` — muted 바탕 상자 가운데 사원증.
           * 사원증 폭이 데스크톱 236, 모바일 288 이다(가이드에는 288 로 적혀
           * 있지만 렌더된 시안을 따랐다). 둘 다 220 을 넘어 큰 글자가 선다.
           * 데스크톱은 본문 462 안에 다 안 들어가 본문이 스크롤된다 — 시안도 같다
           */}
          <div className="bg-muted flex justify-center rounded-md py-8 lg:py-6.5">
            <EmployeeBadge data={badgeDataOf(profile)} className="w-72 lg:w-59" />
          </div>
          <p className="text-body-sm text-ink-soft">
            다른 회원에게 보이는 사원증이에요.
            <br />
            실명, 부서, 연락처와 연락 설정은 공개되지 않아요.
          </p>
        </>
      ) : (
        // 학생 미리보기(선배가 신청 상세에서 보는 내 모습)는 학생 가이드의 범위다
        <p className="text-body text-ink-soft">미리보기는 아직 준비 중이에요.</p>
      )}
    </ResponsiveDialog>
  );
}
