import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link, Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import {
  isApiError,
  receivedRequestQuery,
  sentRequestQuery,
  userInfoQuery,
  type Attachment,
  type ReceivedRequestDetail,
  type UserInfo,
} from "@/api";
import { AccessMessage } from "@/components/access-message";
import { action } from "@/components/ui/action";
import { ProfileRow } from "@/components/ui/profile-row";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { formatDate } from "@/lib/date";
import { myContactEmailOf } from "@/lib/mentor-contact";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

/**
 * 신청 내용. 학생은 보낸 신청 내용(337:7717 / 337:7637), 선배는 받은 신청
 * 내용(339:8525 / 339:8447).
 *
 * 목록 위에 뜨는 오버레이다 — 데스크톱은 가운데 모달, 모바일은 전체 화면
 * (설계 5.3). **학생이 보낸 신청 42 와 선배가 받은 신청 42 는 같은 객체이므로
 * 경로도 하나다** — 알림톡 딥링크를 만들 때 수신자 유형을 몰라도 된다. 부르는
 * API 는 loader 가 `me.type` 으로 고른다.
 *
 * 선배 쪽은 이 위에 연락처 공유 확인(`share`)이 또 뜬다 — 그래서 `<Outlet/>`.
 */
export const Route = createFileRoute("/_app/applications/$applicationId")({
  loader: async ({ context, params }) => {
    const me = await context.queryClient.ensureQueryData(userInfoQuery());

    // 받은 신청 상세는 **첫 조회가 상태를 viewed 로 바꾼다**. 배지를 그리지
    // 않으므로 목록을 다시 받을 필요는 없다
    if (me.type === "student") {
      await context.queryClient.ensureQueryData(
        sentRequestQuery(params.applicationId)
      );
    } else {
      await context.queryClient.ensureQueryData(
        receivedRequestQuery(params.applicationId)
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
  const onOpenChange = (open: boolean) => {
    if (!open) close();
  };

  return (
    <>
      {role === "student" ? (
        <ResponsiveDialog
          open
          onOpenChange={onOpenChange}
          title="보낸 신청 내용"
          // 커피챗 신청과 같은 880×736. 버튼 줄은 기본값(닫기 하나)이 시안과 같다
          className="lg:h-184 lg:w-220"
        >
          <SentDetail applicationId={applicationId} />
        </ResponsiveDialog>
      ) : (
        <ResponsiveDialog
          open
          onOpenChange={onOpenChange}
          title="받은 커피챗 신청"
          /*
           * 1184×707 — 신청·보낸 신청(880)보다 훨씬 넓다. 버튼 줄이 없다:
           * 행동이 본문 안의 연락 방법 카드 둘에 있다.
           *
           * 모바일 시안은 오버레이가 아니라 **셸이 있는 한 장**(맨 위에
           * `← 받은 신청 목록`)이다. 여기서는 같은 Dialog 로 전체 화면을
           * 덮고 ✕ 로 닫는다 — 모바일만 라우트 페이지로 그리면 1024px 경계를
           * 넘을 때 다시 마운트된다(설계 3-3a). 시안과 다르게 둔 자리(§7 #9).
           */
          className="lg:h-176.75 lg:w-296"
          actions={false}
        >
          <ReceivedDetail applicationId={applicationId} />
        </ResponsiveDialog>
      )}

      {/* 연락처 공유 확인(선배)은 이 위에 또 뜬다 */}
      <Outlet />
    </>
  );
}

/* ───────────────── 선배 · 받은 신청 내용 ───────────────── */

/**
 * 피그마 TODO `889:31027` *"여기 레이아웃 다시 구성"* 이 이 프레임 옆에
 * 붙어 있다. 배치가 바뀔 수 있어서 묶음(머리 · 질문 · 학생 카드 · 연락 방법)을
 * 작은 조각으로 나눠 두고, 여기서는 배치만 한다.
 */
function ReceivedDetail({ applicationId }: { applicationId: string }) {
  const { data: request } = useSuspenseQuery(receivedRequestQuery(applicationId));

  return (
    <>
      {/* 피그마 `Request heading` — 머리 제목이 폭마다 다르다 */}
      <div className="flex flex-col gap-2">
        <h2 className="text-page text-ink">
          {request.student.name}님의{" "}
          {/* 데스크톱은 모달 머리에 이미 `받은 커피챗 신청` 이 있어 줄였다 */}
          <span className="lg:hidden">커피챗 </span>신청
        </h2>
        <p className="text-body-sm text-ink-soft">
          {formatDate(request.created_at)}에 받은 신청
        </p>
      </div>

      {/* 피그마 `Student question` — 왼쪽 주황 띠 + 캔버스 바탕 */}
      <div className="bg-canvas border-brand-accent flex flex-col gap-4 border-l-3 p-6">
        <h3 className="text-label text-brand">궁금한 점</h3>
        <p className="text-body-lg text-ink break-words whitespace-pre-wrap">
          {request.message}
        </p>
      </div>

      {/* 피그마 `Profile and contact choices` — 모바일 세로, 데스크톱 360 + 나머지 */}
      <div className="flex flex-col gap-6 lg:flex-row">
        <StudentProfileCard applicationId={applicationId} request={request} />
        <ContactMethods applicationId={applicationId} request={request} />
      </div>
    </>
  );
}

/** 피그마 `Student profile` */
function StudentProfileCard({
  applicationId,
  request,
}: {
  applicationId: string;
  request: ReceivedRequestDetail;
}) {
  const { student } = request;
  const none = "등록하지 않음";
  // 시안은 한 줄이다. 파일 첨부(최대 3개)가 학생 화면에 들어오면 같이 바꾼다
  const attachment = student.attachments[0];

  return (
    <section className="bg-surface border-line shadow-work flex flex-col rounded-lg border p-6 lg:w-90 lg:shrink-0">
      <h3 className="text-card-title text-ink min-h-11">신청한 학생</h3>
      <dl>
        <ProfileRow label="이름" value={student.name} size="card" />
        <ProfileRow label="학과" value={student.department} size="card" />
        <ProfileRow
          label="관심 분야"
          value={student.interests.join(" · ") || none}
          size="card"
        />
        <ProfileRow
          label="참여 활동"
          value={student.activities.join(" · ") || none}
          size="card"
        />
        <ProfileRow
          label="포트폴리오"
          value={
            attachment ? (
              <AttachmentLink
                applicationId={applicationId}
                attachment={attachment}
              />
            ) : (
              none
            )
          }
          size="card"
          className="pb-5"
        />
      </dl>
      {/*
       * 이 묶음은 명세가 **신청 당시 스냅샷**을 준다(`ReceivedRequestDetailDto
       * .student`) — 학생의 보낸 신청 상세와 달리 시안 문구를 그대로 써도 된다
       */}
      <p className="text-body-sm text-ink-soft pt-3">신청 당시의 프로필이에요.</p>
    </section>
  );
}

/**
 * 첨부 링크. 링크 첨부는 시안처럼 스킴 없이 도메인부터 보이고, 파일 첨부는
 * 파일 이름이 보인다.
 *
 * **파일의 `url` 은 presigned URL 이라 만료된다.** 받아 둔 지 오래됐으면
 * 누르는 순간 상세를 다시 받아 새 URL 로 연다. 창은 클릭과 같은 틱에 먼저
 * 열어 둔다 — 응답을 기다린 뒤에 열면 팝업 차단에 걸린다.
 */
function AttachmentLink({
  applicationId,
  attachment,
}: {
  applicationId: string;
  attachment: Attachment;
}) {
  const queryClient = useQueryClient();
  const label =
    attachment.source === "file"
      ? (attachment.file_name ?? "첨부 파일")
      : attachment.url.replace(/^https?:\/\//i, "").replace(/\/$/, "");

  const openFresh = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (attachment.source !== "file") return;
    e.preventDefault();
    const tab = window.open("about:blank", "_blank");
    const fresh = await queryClient.fetchQuery({
      ...receivedRequestQuery(applicationId),
      // presigned URL 의 수명을 모르므로 1분이 지났으면 새로 받는다
      staleTime: 60_000,
    });
    const url =
      fresh.student.attachments.find((a) => a.file_name === attachment.file_name)
        ?.url ?? attachment.url;
    if (tab) {
      tab.opener = null;
      tab.location.href = url;
    } else {
      window.location.href = url;
    }
  };

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noreferrer noopener"
      onClick={openFresh}
      className="text-ink underline-offset-2 hover:underline"
    >
      {label}
    </a>
  );
}

/** 피그마 `Contact methods` */
function ContactMethods({
  applicationId,
  request,
}: {
  applicationId: string;
  request: ReceivedRequestDetail;
}) {
  const { data: me } = useSuspenseQuery(userInfoQuery());
  const myEmail = myContactEmailOf(me);
  const studentEmail = request.student.email;

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-4">
      <h3 className="text-card-title text-ink">연락 방법</h3>
      <p className="text-body-sm text-ink-soft">
        편한 방법으로 연락을 이어가세요.
      </p>

      {/*
       * 피그마 `Equal contact choices` — **두 카드는 같은 무게다.** 한쪽만
       * Primary 로 칠하지 않는다(컴포넌트 설명: "neither is a preferred or
       * accepted state").
       */}
      <div className="flex flex-col gap-4 lg:flex-row">
        <ContactChoice
          title="학생에게 직접 연락"
          description="학생의 이메일로 먼저 연락해요."
          value={studentEmail ?? "—"}
        >
          {studentEmail ? (
            <a
              href={`mailto:${studentEmail}`}
              target="_blank"
              rel="noreferrer"
              className={CHOICE_ACTION}
            >
              이메일로 연락하기
            </a>
          ) : (
            // 시안에 없는 상태. 학생이 연락 설정에서 이메일을 끈 경우다
            <p className={CHOICE_STATUS}>학생이 이메일 연락을 받지 않아요.</p>
          )}
        </ContactChoice>

        <ContactChoice
          title="내 연락처 공유"
          description="이름과 이메일을 보내 학생이 연락할 수 있게 해요."
          value={myEmail ?? "—"}
        >
          {request.contact_shared_at ? (
            /*
             * 이미 공유한 신청. 시안에 상태가 없다 — 같은 버튼을 그대로 두면
             * "아직 안 보냈다" 로 읽혀서 날짜를 적은 문구로 바꿨다. 디자이너
             * 확인 필요(가이드 §7 #7)
             */
            <p className={CHOICE_STATUS}>
              {formatDate(request.contact_shared_at)}에 공유했어요.
            </p>
          ) : myEmail ? (
            <Link
              to="/applications/$applicationId/share"
              params={{ applicationId }}
              className={CHOICE_ACTION}
            >
              공유할 정보 확인
            </Link>
          ) : (
            // 공유할 이메일이 없으면 서버가 409 로 막는다. 미리 알려준다
            <p className={CHOICE_STATUS}>
              공유할 이메일이 없어요. 마이페이지에서 등록해 주세요.
            </p>
          )}
        </ContactChoice>
      </div>

      {/* 설계 5.3 의 규칙이다. 빼거나 줄이지 않는다 */}
      <p className="text-body-sm text-ink-soft">
        연락처를 공유해도 커피챗 일정이 확정되지는 않아요.
      </p>
    </section>
  );
}

/**
 * 피그마 `Cheers / Contact choice`(338:7636).
 *
 * 디자인 시스템이 **버튼 상태 셋**만 그려 뒀다: 기본(흰 바탕 + 옅은 테두리)
 * · 호버(champagne 바탕) · 포커스(주황 테두리). 카드 자체는 누르는 자리가
 * 아니다 — 안의 버튼이 행동 단위다.
 */
function ContactChoice({
  title,
  description,
  value,
  children,
}: {
  title: string;
  description: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface border-line shadow-work flex min-w-0 flex-1 flex-col gap-3 rounded-lg border p-6">
      <h4 className="text-card-title text-ink">{title}</h4>
      <p className="text-body-sm text-ink-soft min-h-10">{description}</p>
      <p className="text-body text-ink min-h-6 break-all">{value}</p>
      {children}
    </div>
  );
}

/** Secondary 껍데기에 글자는 Web/Button(16), 호버·포커스는 시안 상태 */
const CHOICE_ACTION = cn(
  action({ variant: "secondary" }),
  "text-button hover:bg-champagne focus-visible:border-focus focus-visible:ring-focus w-full focus-visible:ring-1 focus-visible:outline-none"
);

/** 버튼 자리를 대신하는 문구. 같은 높이를 지켜 두 카드의 줄이 어긋나지 않게 한다 */
const CHOICE_STATUS =
  "bg-muted text-body-sm text-ink-soft flex min-h-13 items-center justify-center rounded-md px-4 py-3 text-center";

/* ───────────────── 학생 · 보낸 신청 내용 ───────────────── */

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

/* ───────────────── 오류 ───────────────── */

/**
 * 상세를 볼 수 없을 때. 알림톡 링크로 들어온 경우가 대부분이다.
 *
 * URL 은 `/applications/42` 그대로 둔다 — 전용 경로로 튕기면 원래 목적지를
 * 또 search param 으로 들고 다녀야 하고, 계정을 바꾼 뒤 "같은 URL 을 다시
 * 연다" 는 단순한 복귀가 불가능해진다.
 */
function RouteErrorComponent({ error }: ErrorComponentProps) {
  const { role } = useSession();
  return role === "student" ? (
    <SentErrorDialog error={error} />
  ) : (
    <ReceivedErrorDialog error={error} />
  );
}

/**
 * 선배 쪽. 피그마 `07 · 알림톡·웹 진입` 의 다른 계정(343:9219 / 343:9168)과
 * 접근 불가(343:9318 / 343:9269).
 *
 * | 응답 | 명세 | 화면 |
 * |---|---|---|
 * | 404 | 요청이 없거나 내가 받은 요청이 아님 | 다른 계정 |
 * | 403 | 가입 미완료 · 현업자 아님 · 명함 인증 취소 | 다른 계정 |
 * | 410 | 학생이 탈퇴했거나 유예 중 | 접근 불가 |
 * | 400 | id 가 UUID 가 아님(링크가 잘림) | 접근 불가 |
 *
 * 404 하나에 "없는 신청" 과 "남의 신청" 이 섞여 있다. 알림톡으로 들어온
 * 경우 가장 흔한 원인이 계정 불일치이고, `받은 신청 목록` 버튼이 "없는
 * 신청" 일 때의 출구도 되므로 둘 다 다른 계정으로 보낸다.
 *
 * **시안은 목록 없는 한 장인데 여기서는 목록 위 모달이다**(경로를 지키려고 —
 * 위 주석). 시안의 아이콘·제목·설명·버튼을 모달 안에 그대로 넣었다. 뒤에
 * 보이는 건 지금 계정 자기의 받은 신청 목록이라 문제가 없다(§7 #17).
 */
function ReceivedErrorDialog({ error }: { error: unknown }) {
  const { applicationId } = Route.useParams();
  const navigate = useNavigate();
  const status = isApiError(error) ? error.status : undefined;

  const dialogProps = {
    open: true,
    onOpenChange: (open: boolean) => {
      // 닫기(✕)도 목록으로 돌아가는 길이어야 한다
      if (!open) void navigate({ to: "/applications" });
    },
    title: "받은 커피챗 신청",
    // 시안 카드 560 + 좌우 32 × 2
    className: "lg:h-auto lg:w-156",
    actions: false as const,
  };

  if (status === 404 || status === 403) {
    return (
      <ResponsiveDialog {...dialogProps}>
        <AccessMessage
          bare
          icon="info"
          title={
            <>
              이 계정에서는 신청을
              <br />
              확인할 수 없어요
            </>
          }
          description="신청을 받은 선배 계정으로 로그인해 주세요."
        >
          <div className="flex flex-col gap-4">
            <Link
              to="/login"
              search={{
                redirect: `/applications/${applicationId}`,
                reason: "wrong-account",
                // GIS 자동 선택을 끈다 — 없으면 구글이 같은 계정으로 즉시
                // 돌려보내 이 화면을 맴돈다
                switchAccount: true,
                role: "mentor",
              }}
              className={action()}
            >
              다른 계정으로 로그인
            </Link>
            <Link
              to="/applications"
              className={cn(action({ variant: "secondary" }), "text-button")}
            >
              받은 신청 목록
            </Link>
          </div>
        </AccessMessage>
      </ResponsiveDialog>
    );
  }

  if (status === 410 || status === 400) {
    return (
      <ResponsiveDialog {...dialogProps}>
        <AccessMessage
          bare
          icon="info"
          title={
            <>
              신청 내용을
              <br />
              확인할 수 없어요
            </>
          }
          description="받은 신청 목록에서 확인해 주세요."
        >
          <Link to="/applications" className={action()}>
            받은 신청 목록
          </Link>
        </AccessMessage>
      </ResponsiveDialog>
    );
  }

  // 서버 장애 · 네트워크. 시안이 없다
  return (
    <ResponsiveDialog
      {...dialogProps}
      actions={
        <Link to="/applications" className={cn(action(), "w-full lg:w-60")}>
          목록으로
        </Link>
      }
    >
      <p role="alert" className="text-body text-ink-soft">
        신청을 불러오지 못했어요.
      </p>
    </ResponsiveDialog>
  );
}

/** 학생 쪽. 시안이 따로 없어 단계 4 의 모양 그대로다 */
function SentErrorDialog({ error }: { error: unknown }) {
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
