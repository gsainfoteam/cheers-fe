import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link, Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import {
  isApiError,
  receivedRequestQuery,
  sentRequestQuery,
  useAcceptRequest,
  userInfoQuery,
  type ReceivedRequestDetail,
  type ReceivedStatus,
  type SharedContact,
} from "@/api";
import coffeeCupIcon from "@/assets/icons/coffee-cup.svg";
import { AccessMessage } from "@/components/access-message";
import { BrandCat } from "@/components/brand-cat";
import { PageContainer } from "@/components/layout/page-container";
import { MentorSummaryCard } from "@/components/mentor-summary-card";
import { action } from "@/components/ui/action";
import { AttachmentGroup } from "@/components/ui/attachment-group";
import { ConfirmDialog, PROMPT_POPUP } from "@/components/ui/confirm-dialog";
import { ProfileRow } from "@/components/ui/profile-row";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { studentProfileRowsOf } from "@/features/profile/student-profile-rows";
import { mySharedContactOf } from "@/lib/mentor-contact";
import { withPendingGraduatedFields } from "@/lib/pending-be-fields";
import { digitsOf, formatPhone } from "@/lib/profile-form";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

/**
 * 신청 내용. 학생은 보낸 신청 내용(1251:14994 / 1251:11094, 동기화 가이드
 * 05장 5.5), 선배는 받은 신청 내용(1237:14051 / 1237:14505, 06장 6.5).
 *
 * **학생이 보낸 신청 42 와 선배가 받은 신청 42 는 같은 객체이므로 경로도
 * 하나다** — 알림톡 딥링크를 만들 때 수신자 유형을 몰라도 된다. 부르는 API 는
 * loader 가 `me.type` 으로 고른다.
 *
 * 모양은 둘이 다르다.
 * - 학생: 목록 위에 뜨는 오버레이(데스크톱 가운데 모달, 모바일 전체 화면).
 * - 선배: **한 장짜리 화면**(06장). 목록 레이아웃이 자식이 있으면 목록을 빼고
 *   이 화면만 그린다(`applications.tsx`). 그 위에 내 연락처 공유 확인
 *   (`share`)이 뜬다 — 그래서 `<Outlet/>`.
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

  if (role === "mentor") {
    return (
      <>
        {/* 신청을 옮겨 가면 수락 확인 상자 · 처리 상태가 남지 않도록 key 를 준다 */}
        <ReceivedDetailPage key={applicationId} applicationId={applicationId} />
        {/* 내 연락처 공유 확인(`share`)은 이 위에 뜬다 */}
        <Outlet />
      </>
    );
  }

  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => {
        if (!open) void navigate({ to: "/applications" });
      }}
      title="보낸 신청 내용"
      /*
       * 시안 머리 문구 `신청 당시의 정보예요…` 는 쓰지 않는다 — 스냅샷이
       * 아니라 지금 내 정보를 보여 주기로 했다(D5-14). 새 문구는 디자이너
       * 확인 중이라(D5-20) 사실인 첫 문장만 둔다
       */
      description="지금 내 프로필이에요."
      // 시안 1000×702. 버튼 줄은 기본값(닫기 하나)이 시안과 같다
      className="lg:h-175.5 lg:w-250"
      // 데스크톱 시안은 버튼 줄 위 구분선이 없다
      actionsDivider="mobile"
    >
      <SentDetail applicationId={applicationId} />
    </ResponsiveDialog>
  );
}

/* ───────────────── 선배 · 받은 신청 내용 ───────────────── */

/**
 * 피그마 `Cheers / 받은 신청 내용`(1237:14051 / 1237:14505), `수락한 커피챗`
 * (1245:16499 / 1245:16471), `연락처 공유 완료`(1245:17081 / 1245:17038).
 * 동기화 가이드 06장 6.5.
 *
 * **오버레이가 아니라 한 장짜리 화면이다.** 맨 위 `← 받은 신청 목록`, 화면
 * 제목, 학생 프로필 카드. 흐름이 두 단계다(정책 D5-1, 06장 6.5.3).
 *
 * 1. 수락 전: 카드 아래 `이전` · `커피챗 수락하기`. 학생 연락처는 서버가
 *    주지 않는다(수락 전 `student.email` · `phone` 은 늘 null).
 * 2. `커피챗 수락하기` → 확인 상자 `네` → `POST .../accept`(#46 1번). 상세를
 *    다시 받으면 학생 연락처가 채워져 온다.
 * 3. 수락 뒤: 버튼이 빠지고 `커피챗 시작하기` 묶음이 선다 — `학생 연락처`
 *    (내가 먼저 연락하기, API 없음) · `내 연락처`(내 연락처 공유하기 →
 *    `share-contact` → 공유 완료).
 *
 * 수락 여부는 서버 상태(`status`)로만 판정한다. 수락 자체로는 학생에게 알림이
 * 가지 않고 학생 화면에도 드러나지 않는다 — 학생이 아는 것은 공유뿐이다.
 */
function ReceivedDetailPage({ applicationId }: { applicationId: string }) {
  const { data: request } = useSuspenseQuery(receivedRequestQuery(applicationId));
  const accepted = isAccepted(request.status);
  const [accepting, setAccepting] = useState(false);
  // 방금 수락했으면 아래에 새로 선 `커피챗 시작하기` 로 데려간다 — 모바일은
  // 프로필 카드가 길어서 학생 연락처가 화면 밖에 생긴다
  const [justAccepted, setJustAccepted] = useState(false);

  return (
    <PageContainer className="flex flex-col items-center pt-8 pb-12 lg:pt-16 lg:pb-18">
      {/* 피그마 `Task workspace`(1216) — 사이 모바일 28 · 데스크톱 48 */}
      <div className="flex w-full flex-col gap-7 lg:w-304 lg:gap-12">
        {/* Label/Medium 14 보조색 — 정보 수정의 `← 마이페이지` 와 같은 자리 */}
        <Link to="/applications" className="text-label text-ink-soft self-start">
          ← 받은 신청 목록
        </Link>

        {/* 제목 → 카드 모바일 28 · 데스크톱 12 */}
        <section className="flex flex-col gap-7 lg:gap-3">
          {/* 시안 글자 그대로 `{이름} 학생님의 커피챗 신청`(D6-5) */}
          <h1 className="text-screen text-ink break-words">
            {request.student.name} 학생님의 커피챗 신청
          </h1>

          {/*
           * 카드 껍데기가 폭마다 다른 자리를 감싼다. 데스크톱은 버튼 줄까지
           * 한 카드(`px-8 py-6`), 모바일은 프로필만 카드(`px-4 py-3`)이고 버튼
           * 줄은 카드 밖이다
           */}
          <div className="lg:bg-surface lg:border-line lg:shadow-work flex flex-col gap-7 lg:rounded-lg lg:border lg:px-8 lg:py-6">
            <StudentProfile applicationId={applicationId} request={request} />

            {accepted ? null : (
              // 피그마 `Save changes` / `Form actions` — 위 데스크톱 8 · 모바일 16
              <div className="flex justify-end gap-3 pt-4 lg:pt-2">
                <Link
                  to="/applications"
                  className={cn(action({ variant: "secondary" }), "w-25 shrink-0 lg:w-30")}
                >
                  이전
                </Link>
                <button
                  type="button"
                  onClick={() => setAccepting(true)}
                  className={cn(action(), "min-w-0 flex-1 lg:w-60 lg:flex-none")}
                >
                  커피챗 수락하기
                </button>
              </div>
            )}
          </div>
        </section>

        {accepted ? (
          <StartCoffeeChat
            applicationId={applicationId}
            request={request}
            scrollIntoView={justAccepted}
          />
        ) : null}
      </div>

      <AcceptDialog
        applicationId={applicationId}
        open={accepting}
        onOpenChange={setAccepting}
        onAccepted={() => {
          setAccepting(false);
          setJustAccepted(true);
        }}
      />
    </PageContainer>
  );
}

/**
 * 선배가 수락했는가. 공유는 수락 뒤에만 되므로 `contact_shared` 도 수락이다
 * (수락 API 이전에 공유한 요청도 BE 마이그레이션으로 수락이 채워졌다).
 */
function isAccepted(status: ReceivedStatus): boolean {
  return status === "accepted" || status === "contact_shared";
}

/**
 * 피그마 `Student profile` / `Frame 37` — `학생 프로필` 줄 넷, 이력서 ·
 * 포트폴리오, `궁금한 점` 인용 상자. 줄과 첨부는 커피챗 신청 · 보낸 신청
 * 내용과 같은 `compact` 줄 · 38 상자다(04 · 05장).
 *
 * 옛 화면 아래의 `신청 당시의 프로필이에요.` 는 시안에서 없어졌다.
 */
function StudentProfile({
  applicationId,
  request,
}: {
  applicationId: string;
  request: ReceivedRequestDetail;
}) {
  const queryClient = useQueryClient();
  const { student } = request;

  /** presigned 첨부 URL 이 만료됐을 수 있어 누를 때 상세를 다시 받는다 */
  const refreshAttachments = async () =>
    (
      await queryClient.fetchQuery({
        ...receivedRequestQuery(applicationId),
        // presigned URL 의 수명을 모르므로 1분이 지났으면 새로 받는다
        staleTime: 60_000,
      })
    ).student.attachments;

  return (
    <div className="bg-surface border-line shadow-work flex flex-col gap-4 rounded-lg border px-4 py-3 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
      <h2 className="text-card-title text-ink">학생 프로필</h2>
      <dl>
        <ProfileRow label="이름" value={student.name} />
        <ProfileRow label="학과" value={student.department} />
        {/* 여러 값은 `, `(D4-2), 빈 값은 흐린 `등록하지 않음` */}
        <ProfileRow label="관심 분야" value={student.interests.join(", ") || null} />
        <ProfileRow label="참여 활동" value={student.activities.join(", ") || null} />
      </dl>
      <AttachmentGroup attachments={student.attachments} refresh={refreshAttachments} />

      <h2 className="text-card-title text-ink">궁금한 점</h2>
      {/* 피그마 `Student question` — 캔버스 바탕 + 왼쪽 2px 주황 띠. 보낸 신청 내용과 같은 모양 */}
      <p className="bg-canvas border-brand-accent text-body text-ink border-l-2 px-4 py-3 break-words whitespace-pre-wrap">
        {request.message}
      </p>
    </div>
  );
}

/**
 * 피그마 `커피챗 수락 모달`(1245:16951). 버튼 `커피챗 수락하기` 의 주석:
 * *"커피챗 수락 모달로 한 번 더 확인"*. 문구는 시안 그대로다.
 *
 * `네` 가 `POST .../accept` 를 부른다. 상세를 다시 받아 학생 연락처가 채워질
 * 때까지 처리 중이고(`useAcceptRequest`), 그동안은 닫히지 않는다. 이미 수락한
 * 요청이어도 서버가 처음 결과를 돌려주므로 다시 눌러도 안전하다.
 */
function AcceptDialog({
  applicationId,
  open,
  onOpenChange,
  onAccepted,
}: {
  applicationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccepted: () => void;
}) {
  const accept = useAcceptRequest();

  return (
    <ConfirmDialog
      layout="choice"
      open={open}
      onOpenChange={(next) => {
        if (accept.isPending) return;
        // 다시 열 때 지난 실패 문구가 남지 않게 한다
        if (next) accept.reset();
        onOpenChange(next);
      }}
      title="커피챗을 수락할까요?"
      description="수락하면 학생의 연락처를 확인할 수 있어요."
      cancelLabel="아니오"
      confirmLabel="네"
      onConfirm={() => accept.mutate(applicationId, { onSuccess: onAccepted })}
      busy={accept.isPending}
      busyLabel="수락하는 중…"
    >
      {accept.error ? (
        <p role="alert" className="text-body-sm text-danger text-center">
          {describeAcceptError(accept.error)}
        </p>
      ) : null}
    </ConfirmDialog>
  );
}

function describeAcceptError(error: unknown): string {
  if (!isApiError(error)) return "수락하지 못했어요. 다시 시도해 주세요.";
  if (error.status === 410) return "학생이 탈퇴해 수락할 수 없어요.";
  if (error.status === 404) return "신청을 찾을 수 없어요. 목록에서 다시 확인해 주세요.";
  if (error.status === 403) return "이 계정에서는 커피챗을 수락할 수 없어요.";
  return "수락하지 못했어요. 다시 시도해 주세요.";
}

/**
 * 피그마 `커피챗 시작하기`(1245:16755 / 1245:16832) — 수락한 뒤에만 선다.
 * 두 카드가 같은 모양이다: 제목 + 설명, 이메일 · 전화번호 줄, 오른쪽 아래
 * Primary 240(모바일 폭 전체). 데스크톱 좌우 반반(사이 16), 모바일 세로.
 */
function StartCoffeeChat({
  applicationId,
  request,
  scrollIntoView,
}: {
  applicationId: string;
  request: ReceivedRequestDetail;
  /** 방금 수락했으면 이 묶음으로 화면을 옮긴다. 이미 수락한 신청을 열 때는 그대로 둔다 */
  scrollIntoView: boolean;
}) {
  const { data: me } = useSuspenseQuery(userInfoQuery());
  // 공유하면 켠 채널의 연락처가 모두 간다(D3-3). 공유 확인과 같은 값
  const mine = mySharedContactOf(me);
  // 수락 뒤 상세에만 채워져 온다. 재학생이 고른 연락 수단만 값이 있다
  const { student } = request;
  const [contacting, setContacting] = useState(false);

  return (
    <section
      ref={
        scrollIntoView
          ? (node) => node?.scrollIntoView({ behavior: "smooth", block: "start" })
          : undefined
      }
      className="flex flex-col gap-3"
    >
      <h2 className="text-screen text-ink">커피챗 시작하기</h2>
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* 피그마 `Contact choice / mailtoStudent` */}
        <ContactCard
          title="학생 연락처"
          description="학생의 연락처로 먼저 연락해요."
          email={student.email}
          phone={student.phone}
        >
          <button
            type="button"
            onClick={() => setContacting(true)}
            // 학생은 연락 수단 하나 이상이 필수라(D2-2) 둘 다 없을 일은 드물다
            disabled={!student.email && !student.phone}
            className={CARD_ACTION}
          >
            내가 먼저 연락하기
          </button>
        </ContactCard>

        {/* 피그마 `Contact choice / share` */}
        <ContactCard
          title="내 연락처"
          description="이름과 연락처를 공개해 학생이 연락할 수 있게 해요."
          email={mine.email}
          phone={mine.phone}
        >
          {request.contact_shared_at ? (
            // 피그마 `연락처 공유 완료` — Primary 비활성(muted 바탕 + 보조색 글자)
            <button type="button" disabled className={CARD_ACTION}>
              내 연락처 공유 완료
            </button>
          ) : mine.email || mine.phone ? (
            <Link
              to="/applications/$applicationId/share"
              params={{ applicationId }}
              className={CARD_ACTION}
            >
              내 연락처 공유하기
            </Link>
          ) : (
            // 시안에 없는 상태. 켠 채널이 없으면 공유는 서버가 409 로 막는다
            <button type="button" disabled className={CARD_ACTION}>
              공유할 연락처가 없어요
            </button>
          )}
        </ContactCard>
      </div>

      <ContactStudentDialog
        open={contacting}
        onOpenChange={setContacting}
        email={student.email}
        phone={student.phone}
      />
    </section>
  );
}

const CARD_ACTION = cn(action(), "w-full lg:w-60");

/** 피그마 `Contact choice` — 시안 컴포넌트 설명대로 두 카드는 같은 무게다 */
function ContactCard({
  title,
  description,
  email,
  phone,
  children,
}: {
  title: string;
  description: string;
  email: string | null;
  phone: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface border-line shadow-work flex min-w-0 flex-1 flex-col gap-3 rounded-lg border p-6">
      {/* 데스크톱은 제목 옆에 설명(사이 12), 모바일은 아래 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:gap-3">
        <h3 className="text-card-title text-ink">{title}</h3>
        <p className="text-body-sm text-ink-soft">{description}</p>
      </div>
      <dl>
        <ProfileRow label="이메일" value={email} />
        <ProfileRow label="전화번호" value={phone ? formatPhone(phone) : null} />
      </dl>
      <div className="flex justify-end">{children}</div>
    </div>
  );
}

/**
 * 피그마 `내가 먼저 연락하기 모달`(1245:17001). 시안 주석: *"문자/메일 작성
 * 창으로 바로갈 수 있도록 연결 - 가능하다면 이렇게 구현. 불가능하다면
 * 문자(메일) '복사하기' 버튼으로 만들고, 버튼 누르면 창 알아서 닫히게"*.
 *
 * - 메일: `mailto:` 로 메일 작성 창을 연다(두 폭).
 * - 문자: 휴대폰(모바일 폭)은 `sms:` 로 문자 작성 창을 연다. 데스크톱은 문자
 *   앱이 없는 경우가 많아 **전화번호 복사**로 바꾸고, 복사되면 잠시 알린 뒤
 *   닫는다(D6-7).
 * - 학생이 켜지 않은 채널의 버튼은 그리지 않는다.
 *
 * 시안에 닫기 버튼이 없다. 바깥을 누르거나 Esc 로 닫는다(D6-8).
 */
function ContactStudentDialog({
  open,
  onOpenChange,
  email,
  phone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string | null;
  phone: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const close = () => onOpenChange(false);

  const copyPhone = async () => {
    if (!phone) return;
    try {
      await navigator.clipboard.writeText(formatPhone(phone));
      setCopied(true);
      window.setTimeout(() => {
        setCopied(false);
        close();
      }, 1200);
    } catch {
      // 복사 권한이 없으면 번호가 카드에 보이므로 그대로 둔다
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="bg-ink-fill/44 fixed inset-0 z-60" />
        <Dialog.Popup className={PROMPT_POPUP}>
          <Dialog.Title className="text-screen text-ink text-center">
            커피챗을 시작하세요
          </Dialog.Title>
          <Dialog.Description className="text-body text-ink-soft text-center">
            학생의 연락처로 먼저 연락하여 커피챗을 시작하세요.
          </Dialog.Description>
          <div className="flex flex-col gap-2">
            {phone ? (
              <>
                <a
                  href={`sms:${digitsOf(phone)}`}
                  onClick={close}
                  className={cn(action({ variant: "secondary" }), "lg:hidden")}
                >
                  문자로 연락하기
                </a>
                <button
                  type="button"
                  onClick={() => void copyPhone()}
                  className={cn(action({ variant: "secondary" }), "hidden lg:flex")}
                >
                  {copied ? "전화번호를 복사했어요" : "전화번호 복사하기"}
                </button>
              </>
            ) : null}
            {email ? (
              <a href={`mailto:${email}`} onClick={close} className={action({ variant: "secondary" })}>
                메일로 연락하기
              </a>
            ) : null}
          </div>
          {/* 복사 결과를 화면 읽기 프로그램에도 알린다 */}
          <p className="sr-only" aria-live="polite">
            {copied ? "전화번호를 복사했어요" : ""}
          </p>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/* ───────────────── 학생 · 보낸 신청 내용 ───────────────── */

/**
 * 피그마 `Cheers / 보낸 신청 내용`(대화상자 1251:14994 / 1251:11094), 수락한
 * 경우(1251:15117 / 1251:15165), 선배 탈퇴 시(1258:9680). 동기화 가이드 05장 5.5.
 *
 * 커피챗 신청 대화상자(04장)를 읽기 전용으로 만든 모양이다 — 같은 두 열 틀,
 * 같은 선배 카드(`MentorSummaryCard`), 같은 전달 정보 줄과 첨부 상자.
 *
 * - 왼쪽 열: 선배 카드 → `선배 연락처`(대기 / 수락) → `궁금한 점` 인용 상자.
 *   선배가 탈퇴했으면 카드 자리에 안내 상자가 서고 연락처 묶음은 없다
 *   (탈퇴가 수락보다 우선 — 명세도 탈퇴하면 연락처를 null 로 준다)
 * - 오른쪽 열: `전달한 내 정보`. **지금 내 정보**다 — 신청 당시 스냅샷을 쓰지
 *   않기로 했다(D5-14)
 * - 선배의 로고 · LinkedIn 은 명세에 아직 없어 임시값(없음)이다(#46). 부서는
 *   명세 2026-11-15 갱신으로 실제 값이다
 *
 * **학생에게는 "수락" 이 보이지 않는다**(#46). 선배가 수락해도 보낸 요청은
 * `viewed` 그대로이고, 선배가 `내 연락처 공유하기` 를 해야 `contact_shared` 와
 * `shared_contact` 가 온다. 그래서 선배 연락처는 `shared_contact` 만 본다.
 */
function SentDetail({ applicationId }: { applicationId: string }) {
  const queryClient = useQueryClient();
  const { data: me } = useSuspenseQuery(userInfoQuery());
  const { data: request } = useSuspenseQuery(sentRequestQuery(applicationId));
  const withdrawn = request.graduated_withdrawn;
  const graduated = withPendingGraduatedFields(request.graduated);
  // 공유 전이면 null. 탈퇴하면 명세도 연락처를 비우지만 화면은 탈퇴 안내가 우선이다
  const shared = withdrawn ? null : request.shared_contact;

  /** presigned 첨부 URL 이 만료됐을 수 있어 누를 때 내 정보를 다시 받는다 */
  const refreshAttachments = async () =>
    (
      await queryClient.fetchQuery({
        ...userInfoQuery(),
        // presigned URL 의 수명을 모르므로 1분이 지났으면 새로 받는다
        staleTime: 60_000,
      })
    ).student?.profile?.attachments ?? [];

  return (
    // 피그마 `Dialog content` — 모바일 세로(24), 데스크톱 456 | 24 | 456
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* 왼쪽 열 — 사이 모바일 24 · 데스크톱 16 */}
      <div className="flex min-w-0 flex-1 flex-col gap-6 lg:gap-4">
        {withdrawn ? (
          <WithdrawnMentorCard />
        ) : (
          <>
            <MentorSummaryCard
              // 연락처를 공유하면 실명이 함께 보인다. 시안 표기가 폭마다 달라 공백 있는 쪽(D5-16)
              name={
                shared
                  ? `${graduated.nickname}(${shared.name}) 선배`
                  : `${graduated.nickname} 선배`
              }
              company={graduated.company}
              department={graduated.department}
              job={graduated.job}
              logoUrl={graduated.company_logo_url}
              linkedinUrl={graduated.links[0]}
            />
            <MentorContact contact={shared} />
          </>
        )}

        <h3 className="text-card-title text-ink">궁금한 점</h3>
        {/* 피그마 `궁금한 점` 상자 — 캔버스 바탕 + 왼쪽 2px 주황 띠 */}
        <p className="bg-canvas border-brand-accent text-body text-ink border-l-2 px-4 py-3 break-words whitespace-pre-wrap">
          {request.message}
        </p>
      </div>

      {/* 오른쪽 열 — 피그마 `전달한 내 정보`. 수정 링크가 없다(읽기 전용) */}
      <div className="flex min-w-0 flex-1 flex-col gap-3 lg:gap-4">
        <h3 className="text-card-title text-ink">전달한 내 정보</h3>
        <dl>
          {studentProfileRowsOf(me).map((row) => (
            <ProfileRow key={row.label} label={row.label} value={row.value} />
          ))}
        </dl>
        <AttachmentGroup
          attachments={me.student?.profile?.attachments ?? []}
          refresh={refreshAttachments}
        />
      </div>
    </div>
  );
}

/**
 * 피그마 `선배 연락처`(대기 1251:15637 / 1251:15669, 수락 1251:15620 /
 * 1251:15680). 공유 전에는 안내 상자, 공유 뒤에는 이메일 · 전화번호 줄.
 * 이름 줄은 없다 — 실명은 선배 카드 제목으로 간다.
 *
 * 안내 문구는 시안의 "수락하면" 대신 **"공유하면"** 이다(D6-10, 2026-11-15
 * 사용자 결정). 학생에게는 수락이 보이지 않고 선배가 연락처를 공유해야
 * 열리기 때문이다(#46). 수락만 하고 선배가 먼저 연락하면 이 상자는 계속
 * 안내로 남는다.
 */
function MentorContact({ contact }: { contact: SharedContact | null }) {
  return (
    <section className="flex flex-col">
      <h3 className="text-card-title text-ink flex items-center">
        <img src={coffeeCupIcon} alt="" className="size-6 shrink-0" />
        선배 연락처
      </h3>
      {contact ? (
        <dl>
          <ProfileRow label="이메일" value={contact.email} />
          <ProfileRow
            label="전화번호"
            value={contact.phone ? formatPhone(contact.phone) : null}
          />
        </dl>
      ) : (
        <p className="border-line text-label-sm text-ink-soft flex h-20 items-center justify-center border-b py-2.5 text-center">
          선배가 연락처를 공유하면
          <br />
          여기에 공개돼요
        </p>
      )}
    </section>
  );
}

/**
 * 피그마 선배 탈퇴 시(1258:9775) — 선배 카드 자리 전체가 이 상자다. 3D
 * 고양이(`BrandCat`)를 쓴다. 모바일 시안은 없어 같은 상자를 폭 전체로 둔다(D5-17).
 */
function WithdrawnMentorCard() {
  return (
    <div className="bg-muted border-line flex h-60 flex-col items-center justify-center gap-4 rounded-md border p-3">
      <BrandCat sizes="60px" className="w-15" />
      {/* 시안 `더이상` 은 맞춤법대로 띄운다 */}
      <p className="text-label-sm text-ink-soft text-center">
        탈퇴한 선배의 정보는
        <br />
        더 이상 열람할 수 없어요
      </p>
    </div>
  );
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
    <ReceivedErrorPage error={error} />
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
 * 받은 신청 내용이 한 장짜리 화면이 되면서(06장 6.5.1) 오류도 시안 그대로
 * **한 장**이다 — 예전에는 목록 위 모달 안에 넣었다. 목록에서 탈퇴한 학생의
 * 행을 누르면 상세로 오지 않고 안내 상자가 뜬다(`applications.tsx`). 여기
 * 410 은 알림톡 링크로 바로 들어온 경우다.
 */
function ReceivedErrorPage({ error }: { error: unknown }) {
  const { applicationId } = Route.useParams();
  const status = isApiError(error) ? error.status : undefined;

  return (
    <PageContainer className="flex flex-col items-center pt-8 pb-12 lg:pt-16 lg:pb-18">
      {status === 404 || status === 403 ? (
        <AccessMessage
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
          {/* 두 버튼 사이는 시안대로 24 — `AccessMessage` 의 gap-6 과 같다 */}
          <div className="flex flex-col gap-6">
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
            <Link to="/applications" className={action({ variant: "secondary" })}>
              받은 신청 목록
            </Link>
          </div>
        </AccessMessage>
      ) : status === 410 || status === 400 ? (
        <AccessMessage
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
      ) : (
        // 서버 장애 · 네트워크. 시안이 없다
        <div className="flex w-full flex-col gap-6 lg:w-140">
          <p role="alert" className="text-body text-ink-soft">
            신청을 불러오지 못했어요.
          </p>
          <Link to="/applications" className={cn(action(), "w-full lg:w-60")}>
            목록으로
          </Link>
        </div>
      )}
    </PageContainer>
  );
}

/**
 * 학생 쪽. 시안이 따로 없어 단계 4 의 모양 그대로다. 보낸 신청 상세에는
 * 410 이 없다 — 선배가 탈퇴해도 열리고, 화면이 탈퇴 안내를 그린다(05장 5.5.5)
 */
function SentErrorDialog({ error }: { error: unknown }) {
  const { applicationId } = Route.useParams();
  const navigate = useNavigate();
  const forbidden = isApiError(error) && error.status === 403;

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
