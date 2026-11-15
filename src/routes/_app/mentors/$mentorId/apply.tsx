import { useId, useRef, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import {
  cheersListQuery,
  isApiError,
  useRequestCheers,
  userInfoQuery,
  type CheersCard,
} from "@/api";
import openNewWindowIcon from "@/assets/icons/open-new-window.svg";
import { MentorSummaryCard } from "@/components/mentor-summary-card";
import { action } from "@/components/ui/action";
import { AttachmentGroup } from "@/components/ui/attachment-group";
import { ProfileRow } from "@/components/ui/profile-row";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { studentProfileRowsOf } from "@/features/profile/student-profile-rows";
import { withPendingCardFields } from "@/lib/pending-be-fields";
import { useSession } from "@/lib/session";
import { useAutosize } from "@/lib/use-autosize";
import { BELOW_LG, useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";
import { MENTOR_LIST_PARAMS } from "@/lib/mentor-list";

/**
 * 커피챗 신청. 피그마 `Cheers / 커피챗 신청`(336:7965 / 336:7879).
 * 동기화 가이드 04장 4.3 이 이 화면의 기준이다.
 *
 * 설계 5.3 의 상세 열람 규칙대로 **데스크톱은 목록 위 모달, 모바일은 전체
 * 화면**이다(`ResponsiveDialog`). 상자 크기(1000×720), 머리의 안내 문구, 버튼
 * 줄만 이 화면이 정한다.
 *
 * **선배 정보는 목록 캐시에서 읽는다.** 명세에 카드 하나를 가져오는 엔드포인트가
 * 없고, 이 화면은 목록에서만 열린다. 부모 라우트(`/mentors`)가 이미 받아 둔
 * 같은 쿼리를 보므로 요청이 더 늘지 않는다.
 */
export const Route = createFileRoute("/_app/mentors/$mentorId/apply")({
  loader: ({ context }) => context.queryClient.ensureQueryData(userInfoQuery()),
  component: RouteComponent,
});

/** 200자 제한은 명세(`CreateRequestDto.message.maxLength`)와 시안이 같다 */
const MAX_MESSAGE = 200;

/**
 * 시안 `자주하는 질문 확인하기` 가 여는 주소.
 *
 * FAQ 페이지는 아직 없다(#24). 생기면 이 한 줄만 바꾼다 — 라우트가
 * 생기면 `<Link>` 로, 외부 문서라면 그 URL 로.
 */
const FAQ_URL = "/faq";

function RouteComponent() {
  const { mentorId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { role } = useSession();
  const { data: me } = useSuspenseQuery(userInfoQuery());
  const { data: list } = useSuspenseQuery(cheersListQuery(MENTOR_LIST_PARAMS));
  const request = useRequestCheers();
  const formId = useId();

  const [message, setMessage] = useState(() => readDraft(mentorId));
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // 모바일만 글자에 맞춰 늘어난다. 데스크톱은 280 고정(4.3.3)
  useAutosize(textareaRef, message, useMediaQuery(BELOW_LG));

  const mentor = list.items.find((item) => item.graduated_id === mentorId);

  const close = () => void navigate({ to: "/mentors" });

  // 오버레이는 열린 채로만 그려진다. 닫으면 라우트를 떠나는 게 닫는 동작이다
  const dialogProps = {
    open: true,
    onOpenChange: (open: boolean) => {
      if (!open) close();
    },
  };

  /**
   * 선배끼리는 신청할 수 없다. 시안에 이 상태가 없어서 문구만 보여준다 —
   * 실제 차단은 서버가 하고(403), 여기서는 헛걸음을 줄인다.
   */
  if (role !== "student") {
    return (
      <ResponsiveDialog {...dialogProps} title="커피챗 신청">
        <p className="text-body text-ink-soft">
          커피챗 신청은 재학생만 보낼 수 있어요.
        </p>
      </ResponsiveDialog>
    );
  }

  // 목록에 없는 선배(직접 주소를 열었거나 그 사이 빠졌다)
  if (!mentor) {
    return (
      <ResponsiveDialog {...dialogProps} title="커피챗 신청">
        <p className="text-body text-ink-soft">
          선배를 찾을 수 없어요. 목록에서 다시 골라주세요.
        </p>
      </ResponsiveDialog>
    );
  }

  const trimmed = message.trim();
  const canSend = trimmed.length > 0 && !request.isPending;

  const changeMessage = (value: string) => {
    setMessage(value);
    writeDraft(mentorId, value);
  };

  const send = () =>
    request.mutate(
      { graduated_id: mentorId, message: trimmed },
      {
        onSuccess: () => {
          writeDraft(mentorId, "");
          void navigate({
            to: "/mentors/$mentorId/sent",
            params: { mentorId },
          });
        },
      }
    );

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
    <ResponsiveDialog
      {...dialogProps}
      title="커피챗 신청"
      /*
       * 5.3 의 "신청이 곧 확정은 아니다" 를 글로 못박는다. 데스크톱은 머리에
       * 한 줄, 모바일은 본문 맨 위에 문장마다 한 줄(4.3.1)
       */
      description={
        <>
          <span className="block lg:inline">보낸 질문과 프로필은 수정할 수 없어요.</span>{" "}
          <span className="block lg:inline">신청만으로 커피챗이 확정되지는 않아요.</span>
        </>
      }
      // 시안 1000×720. 질문과 전달 정보가 좌우로 선다
      className="lg:h-180 lg:w-250"
      // 데스크톱 시안은 버튼 줄 위 구분선이 없다
      actionsDivider="mobile"
      actions={
        <>
          {/* 모바일 시안에는 취소가 없다. 닫기(X)가 그 자리를 한다 */}
          <button
            type="button"
            onClick={close}
            className={cn(action({ variant: "secondary" }), "hidden w-25 lg:flex")}
          >
            취소
          </button>
          {/*
           * 버튼은 스크롤 영역 바깥이고 폼은 안쪽이라 `form` 속성으로 잇는다.
           * 설계 5.3 의 "주요 버튼은 항상 접근 가능" 을 지키면서도 폼 제출로
           * 남는다.
           */}
          <button
            type="submit"
            form={formId}
            disabled={!canSend}
            className={cn(action(), "w-full lg:w-60")}
          >
            {request.isPending ? "보내는 중…" : "신청 보내기"}
          </button>
        </>
      }
    >
      {/*
       * 피그마 `Request form` — 모바일 세로, 데스크톱 456 | 24 | 456.
       * 열 사이 24, 왼쪽 열의 카드 → 질문 16 은 05장 5.5.1 에서 시안을 다시 재서
       * 맞췄다(보낸 신청 내용과 같은 틀)
       */}
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-6">
        {/* 왼쪽 열: 선배 카드 + 질문 */}
        <div className="flex min-w-0 flex-1 flex-col gap-6 lg:gap-4">
          {/* 피그마 `Selected alumni`(1197:10107 / 1248:17975). 4.3.2 */}
          <SelectedMentor card={mentor} />

          {/* 피그마 `Question` */}
          <div className="flex flex-col gap-3">
            <h3 className="text-card-title text-ink">선배에게 궁금한 점</h3>

            <form
              id={formId}
              onSubmit={(e) => {
                e.preventDefault();
                if (canSend) send();
              }}
              className={cn(
                "bg-surface border-control flex flex-col rounded-md border",
                // 모바일: 120 에서 글자에 맞춰 160 까지. 넘으면 칸 안에서 스크롤
                "max-h-40 min-h-30 gap-2 px-4 py-3",
                // 데스크톱: 280 고정
                "lg:h-70 lg:max-h-none lg:min-h-0 lg:justify-between lg:gap-4 lg:px-5 lg:py-4",
                // Field 와 같은 포커스 표시 — 테두리 두께를 바꾸지 않고 안쪽 링
                "focus-within:border-focus focus-within:ring-focus focus-within:ring-1 focus-within:ring-inset"
              )}
            >
              <textarea
                ref={textareaRef}
                rows={1}
                aria-label="선배에게 궁금한 점"
                maxLength={MAX_MESSAGE}
                value={message}
                onChange={(e) => changeMessage(e.target.value)}
                placeholder="궁금한 점을 적어주세요."
                className="text-body text-ink placeholder:text-ink-soft min-h-0 flex-auto resize-none outline-none"
              />
              <p className="text-label-sm text-ink-soft shrink-0 text-right">
                {message.length} / {MAX_MESSAGE}
              </p>
            </form>

            {/*
             * 피그마 `Notice` 의 밑줄 글자. **새 탭으로 연다.** 같은 탭에서
             * 이동하면 라우트를 떠나는 게 곧 오버레이를 닫는 동작이다.
             *
             * 시안의 글자 높이는 20 이다. 누를 자리는 44 로 키우고 `-my-3` 으로
             * 되돌려, 보이는 간격은 시안 그대로 두고 손가락 영역만 넓혔다.
             */}
            <a
              href={FAQ_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-body-sm text-ink-soft -my-3 flex min-h-11 items-center gap-1 self-start underline"
            >
              자주하는 질문 확인하기
              <img src={openNewWindowIcon} alt="" className="size-4.5 shrink-0" />
              <span className="sr-only">(새 탭에서 열림)</span>
            </a>
          </div>

          {request.error ? (
            <p role="alert" className="text-body-sm text-danger">
              {describeRequestError(request.error)}
            </p>
          ) : null}
        </div>

        {/*
         * 피그마 `Profile sent to alumni`. 데스크톱은 `justify-between` 이라
         * 바닥의 `내 정보 수정하기` 가 왼쪽 열의 끝과 같은 선에 선다
         */}
        <div className="flex min-w-0 flex-1 flex-col gap-3 lg:justify-between lg:gap-4">
          <div className="flex flex-col gap-3 lg:gap-4">
            <div className="flex min-h-11 items-center justify-between gap-3">
              <h3 className="text-card-title text-ink">함께 전달되는 내 정보</h3>
              {/*
               * 같은 탭으로 간다 — 고친 뒤 돌아오면 이 목록이 새 값으로 다시
               * 그려진다. 적던 질문은 초안으로 남는다(D4-3)
               */}
              <Link
                to="/me/edit"
                aria-label="내 정보 수정"
                className="text-label text-brand flex min-h-11 items-center underline lg:hidden"
              >
                수정
              </Link>
            </div>

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

          <Link
            to="/me/edit"
            className="text-label text-brand hidden min-h-11 items-center self-end underline lg:flex"
          >
            내 정보 수정하기
          </Link>
        </div>
      </div>
    </ResponsiveDialog>
  );
}

/** 목록 카드(`CheersCardDto`)를 요약 카드에 옮긴다. 부서는 #46 전까지 없음 */
function SelectedMentor({ card }: { card: CheersCard }) {
  const { department } = withPendingCardFields(card);
  return (
    <MentorSummaryCard
      name={`${card.nickname} 선배`}
      company={card.company}
      department={department}
      job={card.job}
      logoUrl={card.company_logo_url}
      linkedinUrl={card.links[0]}
    />
  );
}

/**
 * 질문 초안(D4-3). `내 정보 수정` 은 같은 탭으로 가므로 대화상자가 닫히며
 * 적던 질문이 사라진다. 탭이 살아 있는 동안만 남기면 충분해서 `sessionStorage`
 * 다. 보내기에 성공하면 지운다. 저장소를 못 쓰는 환경(사파리 사생활 보호
 * 등)에서는 조용히 넘어간다 — 초안은 편의일 뿐이다.
 */
const draftKey = (mentorId: string) => `apply-draft:${mentorId}`;

function readDraft(mentorId: string): string {
  try {
    return sessionStorage.getItem(draftKey(mentorId))?.slice(0, MAX_MESSAGE) ?? "";
  } catch {
    return "";
  }
}

function writeDraft(mentorId: string, value: string) {
  try {
    if (value) sessionStorage.setItem(draftKey(mentorId), value);
    else sessionStorage.removeItem(draftKey(mentorId));
  } catch {
    // 위 머리말
  }
}

function describeRequestError(error: unknown): string {
  if (!isApiError(error)) return "신청을 보내지 못했어요. 다시 시도해 주세요.";

  // 목록을 받은 뒤 선배가 연락 설정을 바꾼 경우. `can_request` 로는 못 막는다
  if (error.status === 409) return "지금은 이 선배가 신청을 받지 않아요.";
  if (error.status === 404) return "선배를 찾을 수 없어요. 목록을 새로고침해 주세요.";
  if (error.status === 403) return "커피챗 신청은 재학생만 보낼 수 있어요.";
  if (error.status === 400) return "질문 내용을 다시 확인해 주세요.";
  return "신청을 보내지 못했어요. 다시 시도해 주세요.";
}
