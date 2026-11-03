import { useId, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  cheersListQuery,
  isApiError,
  useRequestCheers,
  userInfoQuery,
  type UserInfo,
} from "@/api";
import { action } from "@/components/ui/action";
import { ProfileRow } from "@/components/ui/profile-row";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { MENTOR_LIST_PARAMS } from "@/lib/mentor-list";

/**
 * 커피챗 신청. 피그마 `Cheers / 커피챗 신청`(336:7965 / 336:7879).
 *
 * 설계 5.3 의 상세 열람 규칙대로 **데스크톱은 목록 위 모달, 모바일은 전체
 * 화면**이다. 단계 3이 약관 본문에 쓰려고 만든 `ResponsiveDialog` 의 두 번째
 * 사용처다 — 상자 크기(880×736)와 버튼 줄만 이 화면이 정한다.
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
  const { role } = useSession();
  const { data: me } = useSuspenseQuery(userInfoQuery());
  const { data: list } = useSuspenseQuery(cheersListQuery(MENTOR_LIST_PARAMS));
  const request = useRequestCheers();
  const formId = useId();

  const [message, setMessage] = useState("");
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

  const send = () =>
    request.mutate(
      { graduated_id: mentorId, message: trimmed },
      {
        onSuccess: () =>
          void navigate({
            to: "/mentors/$mentorId/sent",
            params: { mentorId },
          }),
      }
    );

  return (
    <ResponsiveDialog
      {...dialogProps}
      title="커피챗 신청"
      // 시안 880×736. 약관 오버레이(720×610)보다 넓다 — 데스크톱에서
      // 질문과 전달 정보가 좌우로 서야 해서다
      className="lg:h-184 lg:w-220"
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
           * 남는다 — 엔터로도 보낼 수 있다.
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
      {/* 피그마 `Selected alumni` */}
      <div className="border-line flex items-start gap-4 border-b pb-5">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-h2 text-ink">{mentor.nickname} 선배</p>
          <p className="text-body-sm text-ink-soft">
            {mentor.company} · {mentor.job}
          </p>
        </div>
      </div>

      {/* 피그마 `Request form` — 모바일 세로, 데스크톱 좌우 반반 */}
      <div className="flex flex-col gap-7 lg:flex-row lg:gap-8">
        {/* 피그마 `Question and notice` */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-col gap-4">
            <h3 className="text-card-title text-ink">선배에게 궁금한 점</h3>

            <form
              id={formId}
              onSubmit={(e) => {
                e.preventDefault();
                if (canSend) send();
              }}
              className={cn(
                "bg-surface border-control flex h-45 flex-col justify-between gap-4 rounded-md border p-5 lg:h-59",
                // Field 와 같은 포커스 표시 — 테두리 두께를 바꾸지 않고 안쪽 링
                "focus-within:border-focus focus-within:ring-focus focus-within:ring-1 focus-within:ring-inset"
              )}
            >
              <textarea
                aria-label="선배에게 궁금한 점"
                maxLength={MAX_MESSAGE}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="궁금한 점을 적어주세요."
                className="text-body text-ink placeholder:text-ink-soft min-h-0 flex-1 resize-none outline-none"
              />
              <p className="text-label-sm text-ink-soft text-right">
                {message.length} / {MAX_MESSAGE}
              </p>
            </form>
          </div>

          {/* 피그마 `Notice` — 5.3 의 "신청이 곧 확정은 아니다" 를 글로 못박는다 */}
          <p className="text-body-sm text-ink-soft">
            보낸 질문과 프로필은 수정할 수 없어요.
            <br />
            신청만으로 커피챗이 확정되지는 않아요.
          </p>

          {/*
           * 피그마 `Notice`(890:31036 / 890:31038) — 안내 바로 아래 밑줄 글자.
           *
           * **새 탭으로 연다.** 같은 탭에서 이동하면 라우트를 떠나는 게 곧
           * 오버레이를 닫는 동작이라 적던 질문이 사라진다.
           *
           * 시안의 글자 높이는 20 이다. 누를 자리는 44 로 키우고 `-my-3` 으로
           * 되돌려, 보이는 간격은 시안 그대로 두고 손가락 영역만 넓혔다.
           */}
          <a
            href={FAQ_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-body-sm text-ink-soft -my-3 flex min-h-11 items-center self-start underline"
          >
            자주하는 질문 확인하기
            <span className="sr-only">(새 탭에서 열림)</span>
          </a>

          {request.error ? (
            <p role="alert" className="text-body-sm text-danger">
              {describeRequestError(request.error)}
            </p>
          ) : null}
        </div>

        {/* 피그마 `Profile sent to alumni` — 모바일에서는 위에 구분선이 붙는다 */}
        <div className="border-line flex min-w-0 flex-1 flex-col border-t pt-6 lg:border-t-0 lg:pt-0">
          <h3 className="text-card-title text-ink flex min-h-11 items-center">
            함께 전달되는 내 정보
          </h3>
          <p className="text-body-sm text-ink-soft pb-3">
            이름·이메일과 아래 프로필을
            <br />
            선배에게 함께 보냅니다.
          </p>

          <dl>
            {profileRowsOf(me).map((row) => (
              <ProfileRow key={row.label} label={row.label} value={row.value} />
            ))}
          </dl>

          <Link
            to="/me/edit"
            className="text-label text-brand flex min-h-11 items-center underline"
          >
            내 정보 수정
          </Link>
        </div>
      </div>
    </ResponsiveDialog>
  );
}

/** 시안 `Profile sent to alumni` 의 일곱 줄. 값이 없으면 빈칸 대신 말로 적는다 */
function profileRowsOf(me: UserInfo): { label: string; value: string }[] {
  const profile = me.student?.profile;
  const none = "등록하지 않음";
  const attachment = profile?.attachments[0];

  return [
    { label: "이름", value: me.name ?? none },
    { label: "이메일", value: me.student?.email ?? me.email ?? none },
    { label: "학과", value: profile?.department.name ?? none },
    { label: "관심 분야", value: profile?.interests.join(" · ") || none },
    { label: "참여 활동", value: profile?.activities.join(" · ") || none },
    { label: "전화번호", value: profile?.contact?.phone ?? none },
    {
      label: "이력서 / 포트폴리오",
      value: attachment ? (attachment.file_name ?? attachment.url) : none,
    },
  ];
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
