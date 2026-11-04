import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { cheersListQuery, type CheersCard } from "@/api";
import arrowRight from "@/assets/icons/arrow-right.svg";
import {
  EmployeeBadge,
  type EmployeeBadgeData,
} from "@/components/employee-badge";
import { PageContainer } from "@/components/layout/page-container";
import { MENTOR_LIST_PARAMS } from "@/lib/mentor-list";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

/**
 * 선배 둘러보기. 피그마 `Cheers / 선배 둘러보기 · 학생`(352:9466 / 352:9467),
 * `Cheers / 선배 둘러보기 · 선배`(336:7652 / 336:7423).
 *
 * **학생·선배가 같은 화면을 본다**(백엔드가 선배에게도 목록을 열었다 — 선배
 * 가이드 §3.1). 시점에 따라 달라지는 건 세 곳뿐이다: 설명 문구, 사원증 아래
 * 신청 줄, 모바일 줄 간격. 부르는 API 가 같으므로 loader 가 아니라 화면에서
 * `useSession()` 으로 가른다 — 가이드 §1.1 의 "loader 에서 가른다" 는 학생·선배가
 * **다른 API** 를 부르는 화면(`/applications`, `/me`)의 규칙이다.
 *
 * 목록을 index 가 아니라 **레이아웃**에 두는 이유: 신청 화면(`$mentorId/apply`)이
 * 이 위에 오버레이로 뜨므로 목록이 언마운트되면 안 된다. 데스크톱에서는 목록
 * 위에 모달이 뜨고, 모바일에서는 전체 화면이 목록을 덮는다 — 설계 5.3 의
 * 상세 열람 규칙이고, 단계 3이 만든 `ResponsiveDialog` 가 그걸 한다.
 *
 * 학생/선배 모두 같은 목록을 본다. 신청 가능 여부는 카드의 `can_request` 와
 * 신청 화면이 가른다.
 */
export const Route = createFileRoute("/_app/mentors")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(cheersListQuery(MENTOR_LIST_PARAMS)),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <MentorList />
      {/* 신청 오버레이. 목록은 그대로 남아 뒤에 깔린다 */}
      <Outlet />
    </>
  );
}

function MentorList() {
  const { data } = useSuspenseQuery(cheersListQuery(MENTOR_LIST_PARAMS));
  /** 선배는 신청을 보낼 수 없다(`POST /cheers/request` 는 재학생만) */
  const canApply = useSession().role === "student";

  return (
    <>
      {/* 피그마 `Page introduction` */}
      <PageContainer className="flex flex-col gap-3 pt-8 pb-6 lg:pt-14 lg:pb-8">
        <h1 className="text-page text-ink">선배 둘러보기</h1>
        {/*
         * 선배판의 텍스트 노드 이름은 학생 문구 그대로인데 화면에 그려진
         * 글자만 바뀌어 있다. 렌더된 글자를 옮겼다(가이드 §0 경고)
         */}
        <p className="text-body text-ink-soft">
          {canApply
            ? "선배의 사원증을 골라, 궁금한 이야기를 나눠보세요."
            : "GIST 선배들의 회사와 직무를 둘러보세요."}
        </p>
      </PageContainer>

      {/* 피그마 `Employee badge shelf` */}
      <PageContainer className="flex flex-col gap-6 pt-2 pb-12 lg:pb-16">
        {/* 피그마 `Results heading` */}
        <div className="flex items-center gap-2">
          <h2 className="text-label-lg text-ink">선배 사원증</h2>
          <p className="text-label text-brand">{data.total}</p>
        </div>

        {data.items.length === 0 ? (
          // 시안에 없는 상태다. 보낸 신청의 `없음` 시안과 달리 여기는
          // 그려져 있지 않아 한 줄로만 적었다
          <p className="text-body text-ink-soft">
            아직 공개된 선배 사원증이 없어요.
          </p>
        ) : (
          /*
           * 피그마 `Employee badge gallery` — 모바일 2열(가로 12 / 세로 32),
           * 데스크톱 4열(가로 32 / 세로 40). 353 과 1248 을 그 간격으로
           * 나누면 카드가 정확히 170.5 와 288 이 된다.
           *
           * 선배 시점은 신청 줄이 빠져 카드가 짧아지면서 모바일 줄 사이가
           * 24 로 좁아진다(336:7423). 카드가 아니라 격자의 일이라 여기서
           * 가른다. 데스크톱은 시안에 한 줄뿐이라 학생과 같은 40 으로 둔다.
           */
          <ul
            className={cn(
              "grid grid-cols-2 gap-x-3 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-10",
              canApply ? "gap-y-8" : "gap-y-6"
            )}
          >
            {data.items.map((card) => (
              <li key={card.graduated_id}>
                <MentorCard card={card} canApply={canApply} />
              </li>
            ))}
          </ul>
        )}
      </PageContainer>
    </>
  );
}

/**
 * 피그마 `Alumni credential and request` — 사원증 + 그 아래 신청 줄.
 *
 * 선배 시점에서는 사원증만 남는다. 묶음 `div` 는 그대로 두고 줄만 그리지
 * 않는다 — 사원증 리디자인(가이드 §3.3)으로 신청 줄이 카드 **안**으로
 * 들어가면 이 분기도 그 자리로 옮겨 가기만 하면 된다.
 */
function MentorCard({ card, canApply }: { card: CheersCard; canApply: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <EmployeeBadge data={toBadge(card)} />

      {/*
       * 피그마 `Request action`. 카드에 인쇄되지 않는 웹 UI 라 사원증
       * **바깥**에 있다(컴포넌트 설명: "Request CTA is separate web UI").
       */}
      {!canApply ? null : card.can_request ? (
        <Link
          to="/mentors/$mentorId/apply"
          params={{ mentorId: card.graduated_id }}
          className={cn(REQUEST_ACTION, "text-ink")}
        >
          커피챗 신청
          <img src={arrowRight} alt="" className="shrink-0" />
        </Link>
      ) : (
        /*
         * 연락 설정을 "희망하지 않음" 으로 둔 선배. 시안에 이 상태가
         * 없어서 같은 줄에 글자만 바꿔 뒀다 — 누를 수 없다는 걸 색이 아니라
         * 문구로도 말한다.
         */
        <p className={cn(REQUEST_ACTION, "text-ink-faint")}>
          지금은 신청을 받지 않아요
        </p>
      )}
    </div>
  );
}

/** 시안 `Request action` — 높이 48, 위쪽 테두리만 있다 */
const REQUEST_ACTION =
  "bg-surface border-line text-label flex h-12 w-full items-center justify-between gap-2 rounded-md border-t px-4";

function toBadge(card: CheersCard): EmployeeBadgeData {
  return {
    // 명세의 카드에는 회사 로고가 없다. 시안의 삼성·SK 로고는 예시 데이터라
    // (설계 5.3) 실제로는 회사 이름만 선다
    company: card.company,
    nickname: card.nickname,
    role: card.job,
    meta: card.hashtags
      .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
      .join("  "),
  };
}
