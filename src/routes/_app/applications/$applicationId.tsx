import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link, Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  isApiError,
  sentRequestQuery,
  userInfoQuery,
  type UserInfo,
} from "@/api";
import { action } from "@/components/ui/action";
import { ProfileRow } from "@/components/ui/profile-row";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { formatDate } from "@/lib/date";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

/**
 * 보낸 신청 내용. 피그마 `Cheers / 보낸 신청 내용`(337:7717 / 337:7637).
 *
 * 목록 위에 뜨는 오버레이다 — 데스크톱은 가운데 880 모달, 모바일은 전체
 * 화면(설계 5.3). 커피챗 신청 화면과 같은 상자를 쓴다.
 *
 * **학생이 보낸 신청 42 와 선배가 받은 신청 42 는 같은 객체이므로 경로도
 * 하나다** — 알림톡 딥링크를 만들 때 수신자 유형을 몰라도 된다. 다만 선배
 * 쪽 화면(`06 · 선배 계정·받은 신청`)은 설계 3절의 비목표라 아직 없다.
 */
export const Route = createFileRoute("/_app/applications/$applicationId")({
  loader: async ({ context, params }) => {
    const me = await context.queryClient.ensureQueryData(userInfoQuery());

    // 선배는 받은 신청 API(`/cheers/received/{id}`)를 봐야 한다. 그 화면이
    // 아직 없으므로 보낸 신청을 대신 부르지 않는다 — 부르면 403 이 돌아와
    // "준비 중" 대신 오류 화면이 뜬다
    if (me.type === "student") {
      await context.queryClient.ensureQueryData(
        sentRequestQuery(params.applicationId)
      );
    }
  },
  component: RouteComponent,
  errorComponent: RouteErrorComponent,
});

function RouteComponent() {
  const { applicationId } = Route.useParams();
  const navigate = useNavigate();
  const { role } = useSession();

  const close = () => void navigate({ to: "/applications" });

  return (
    <>
      <ResponsiveDialog
        open
        onOpenChange={(open) => {
          if (!open) close();
        }}
        title="보낸 신청 내용"
        // 커피챗 신청과 같은 880×736. 버튼 줄은 기본값(닫기 하나)이 시안과 같다
        className="lg:h-184 lg:w-220"
      >
        {role === "student" ? (
          <SentDetail applicationId={applicationId} />
        ) : (
          <p className="text-body text-ink-soft">
            받은 신청 화면은 아직 준비 중이에요.
          </p>
        )}
      </ResponsiveDialog>

      {/* 연락처 공유(선배 전용)는 이 위에 또 뜬다 — 범위 밖이라 그대로 둔다 */}
      <Outlet />
    </>
  );
}

function SentDetail({ applicationId }: { applicationId: string }) {
  const { data: me } = useSuspenseQuery(userInfoQuery());
  const { data: request } = useSuspenseQuery(sentRequestQuery(applicationId));
  const { graduated, shared_contact: shared } = request;

  return (
    <>
      {/* 피그마 `Selected alumni` — 신청 화면과 달리 muted 상자 안에 있다 */}
      <div className="bg-muted flex items-start gap-4 rounded-md p-4">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-label-lg text-ink">{graduated.nickname} 선배</p>
          <p className="text-body-sm text-ink-soft">
            {request.graduated_withdrawn
              ? "탈퇴한 선배"
              : `${graduated.company} · ${graduated.job}`}
          </p>
        </div>
      </div>

      <p className="text-body-sm text-ink-soft">
        {formatDate(request.created_at)}에 보낸 신청
      </p>

      {/* 피그마 `Sent request details` — 모바일 세로, 데스크톱 좌우 반반 */}
      <div className="flex flex-col gap-7 lg:flex-row lg:gap-6">
        {/* 피그마 `Sent question` */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <h3 className="text-card-title text-ink">보낸 질문</h3>
          <p className="text-body text-ink whitespace-pre-wrap">
            {request.message}
          </p>
          <div className="bg-muted rounded-md p-4">
            <p className="text-body-sm text-ink-soft">
              {/*
               * 시안 문구는 "신청 당시의 정보예요. 현재 프로필과 다를 수
               * 있어요." 인데, 아래 프로필은 **지금 내 정보**다 — 명세의
               * 보낸 신청 상세(`SentRequestDetailDto`)가 신청 당시의
               * 프로필을 돌려주지 않기 때문이다. 경고의 방향만 뒤집었다.
               */}
              지금 내 프로필이에요. 신청 당시 보낸 내용과 다를 수 있어요.
            </p>
          </div>
        </div>

        {/* 피그마 `Sent profile` */}
        <div className="border-line flex min-w-0 flex-1 flex-col border-t pt-6 lg:border-t-0 lg:pt-0">
          <h3 className="text-card-title text-ink flex min-h-11 items-center">
            전달한 내 정보
          </h3>
          <dl>
            {sentProfileRowsOf(me).map((row) => (
              <ProfileRow
                key={row.label}
                label={row.label}
                value={row.value}
                size="comfortable"
              />
            ))}
          </dl>
        </div>
      </div>

      {/*
       * 시안에 없는 묶음이다. 선배가 연락처를 공유하면 명세가
       * `shared_contact` 로 내려주는데 그걸 보여줄 자리가 시안에 없다 —
       * 설계 2절의 "결과를 확인한다" 가 여기서 끊기므로 같은 `Profile row`
       * 로 덧붙였다. **디자이너 확인이 필요하다.**
       */}
      {shared ? (
        <div className="border-line flex flex-col border-t pt-6">
          <h3 className="text-card-title text-ink flex min-h-11 items-center">
            선배 연락처
          </h3>
          <p className="text-body-sm text-ink-soft pb-3">
            {formatDate(shared.shared_at)}에 선배가 연락처를 공유했어요.
            연락처를 받은 것이 커피챗 확정은 아니에요.
          </p>
          <dl>
            <ProfileRow label="이름" value={shared.name} size="comfortable" />
            <ProfileRow
              label="이메일"
              value={shared.email ?? "공유하지 않음"}
              size="comfortable"
            />
            <ProfileRow
              label="전화번호"
              value={shared.phone ?? "공유하지 않음"}
              size="comfortable"
            />
          </dl>
        </div>
      ) : null}
    </>
  );
}

/** 시안 `Sent profile` 의 일곱 줄. 신청 화면과 순서가 다르다 */
function sentProfileRowsOf(me: UserInfo): { label: string; value: string }[] {
  const profile = me.student?.profile;
  const none = "등록하지 않음";
  const attachment = profile?.attachments[0];

  return [
    { label: "이름", value: me.name ?? none },
    { label: "학과", value: profile?.department.name ?? none },
    { label: "관심 분야", value: profile?.interests.join(" · ") || none },
    { label: "참여 활동", value: profile?.activities.join(" · ") || none },
    { label: "이메일", value: me.student?.email ?? me.email ?? none },
    { label: "전화번호", value: profile?.contact?.phone ?? none },
    {
      label: "이력서 / 포트폴리오",
      value: attachment ? (attachment.file_name ?? attachment.url) : none,
    },
  ];
}

/**
 * 알림톡을 다른 계정으로 열었을 때. URL 은 `/applications/42` 그대로 둔다 —
 * 전용 경로로 튕기면 원래 목적지를 또 search param 으로 들고 다녀야 하고,
 * 계정을 바꾼 뒤 "같은 URL 을 다시 연다" 는 단순한 복귀가 불가능해진다.
 */
function RouteErrorComponent({ error }: ErrorComponentProps) {
  const { applicationId } = Route.useParams();
  const navigate = useNavigate();
  const forbidden = isApiError(error) && error.status === 403;
  const gone = isApiError(error) && error.status === 410;

  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => {
        // 닫기(X)도 목록으로 돌아가는 길이어야 한다
        if (!open) void navigate({ to: "/applications" });
      }}
      title="보낸 신청 내용"
      className="lg:h-auto lg:w-150"
      actions={
        <Link to="/applications" className={cn(action(), "w-full lg:w-60")}>
          목록으로
        </Link>
      }
    >
      <p className="text-body text-ink-soft">
        {forbidden
          ? "이 계정에서는 신청을 확인할 수 없어요."
          : gone
            ? "상대가 탈퇴해 신청 내용을 볼 수 없어요."
            : "신청을 불러오지 못했어요."}
      </p>

      {forbidden ? (
        <Link
          to="/login"
          search={{
            redirect: `/applications/${applicationId}`,
            reason: "wrong-account",
            switchAccount: true,
          }}
          className="text-label text-brand underline"
        >
          다른 계정으로 로그인
        </Link>
      ) : null}
    </ResponsiveDialog>
  );
}
