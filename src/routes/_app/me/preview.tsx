import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { userInfoQuery } from "@/api";
import { EmployeeBadge } from "@/components/employee-badge";
import { badgeDataOf } from "@/components/employee-badge-data";
import { ProfileRow } from "@/components/ui/profile-row";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { studentProfileRowsOf } from "@/features/profile/student-profile-rows";
import { useSession } from "@/lib/session";

/**
 * 미리보기 — 다른 사람에게 내 프로필이 어떻게 보이는지.
 *
 * - 학생: `Dialog / 전달 프로필 미리보기`(338:8158, 화면 338:8126 / 338:8060).
 *   커피챗을 신청하면 선배에게 가는 일곱 줄이다. 보낸 신청 내용의 `전달한 내
 *   정보` 와 **같은 함수**(`studentProfileRowsOf`)로 그린다.
 * - 선배: `Dialog / 공개 사원증 미리보기`(338:9308, 화면 338:9268 / 338:9212).
 *   마이페이지 오른쪽의 사원증과 같은 그림이다(같은 `badgeDataOf`).
 *
 * 마이페이지(`me.tsx` 레이아웃) 위에 뜬다 — 데스크톱 560 모달, 모바일 전체
 * 화면. 버튼 줄은 기본값(`닫기` 하나)이 시안과 같다.
 */
export const Route = createFileRoute("/_app/me/preview")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const { role } = useSession();
  const close = (open: boolean) => {
    if (!open) void navigate({ to: "/me" });
  };

  return role === "mentor" ? (
    <ResponsiveDialog
      open
      onOpenChange={close}
      title="공개 사원증 미리보기"
      // 560×636
      className="lg:h-159 lg:w-140"
    >
      <BadgePreview />
    </ResponsiveDialog>
  ) : (
    <ResponsiveDialog
      open
      onOpenChange={close}
      title="전달 프로필 미리보기"
      // 560×602
      className="lg:h-150.5 lg:w-140"
    >
      <SentProfilePreview />
    </ResponsiveDialog>
  );
}

/** 피그마 `Dialog content`(338:8167) — 설명 한 줄 + 정의 행 일곱 줄 */
function SentProfilePreview() {
  const { data: me } = useSuspenseQuery(userInfoQuery());

  return (
    // 다이얼로그 본문의 묶음 간격(24)을 쓰지 않는다 — 시안은 설명과 줄이 붙어 있다
    <div className="flex flex-col">
      <p className="text-body-sm text-ink-soft min-h-11">
        커피챗 신청 시 선배에게 전달되는 정보예요. 연락받을 방법 설정은 포함되지
        않아요.
      </p>
      <dl>
        {studentProfileRowsOf(me).map((row) => (
          <ProfileRow
            key={row.label}
            label={
              // 시안이 이 이름표만 두 줄로 끊는다
              row.label === "이력서 / 포트폴리오" ? (
                <>
                  이력서 /
                  <br />
                  포트폴리오
                </>
              ) : (
                row.label
              )
            }
            value={row.value}
            size="comfortable"
          />
        ))}
      </dl>
    </div>
  );
}

function BadgePreview() {
  const { data: me } = useSuspenseQuery(userInfoQuery());
  const profile = me.graduated?.profile;
  if (!profile) {
    return (
      <p role="alert" className="text-body text-ink-soft">
        프로필을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
      </p>
    );
  }

  return (
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
  );
}
