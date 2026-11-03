import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { cheersListQuery, type CheersCard } from "@/api";
import arrowRight from "@/assets/icons/arrow-right.svg";
import {
  EmployeeBadge,
  type EmployeeBadgeData,
} from "@/components/employee-badge";
import { PageContainer } from "@/components/layout/page-container";
import { cn } from "@/lib/utils";

/**
 * 선배 둘러보기. 피그마 `Cheers / 선배 둘러보기 · 학생`(352:9466 / 352:9467).
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
    context.queryClient.ensureQueryData(cheersListQuery(LIST_PARAMS)),
  component: RouteComponent,
});

/**
 * 시안에 페이지 넘김이 없다.
 *
 * 명세는 `page`/`size`(최대 50)로 끊어 주는데 그걸 그릴 자리가 시안에
 * 없어서, 일단 한 번에 받을 수 있는 최대치를 받는다. 선배가 50명을 넘기면
 * 넘김 UI 를 디자이너와 정해야 한다 — 조용히 잘라 보여주지 않으려고
 * 결과 수(`total`)를 제목 옆에 그대로 내건다.
 */
const LIST_PARAMS = { size: 50 } as const;

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
  const { data } = useSuspenseQuery(cheersListQuery(LIST_PARAMS));

  return (
    <>
      {/* 피그마 `Page introduction` */}
      <PageContainer className="flex flex-col gap-3 pt-8 pb-6 lg:pt-14 lg:pb-8">
        <h1 className="text-page text-ink">선배 둘러보기</h1>
        <p className="text-body text-ink-soft">
          선배의 사원증을 골라, 궁금한 이야기를 나눠보세요.
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
           */
          <ul className="grid grid-cols-2 gap-x-3 gap-y-8 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-10">
            {data.items.map((card) => (
              <li key={card.graduated_id}>
                <MentorCard card={card} />
              </li>
            ))}
          </ul>
        )}
      </PageContainer>
    </>
  );
}

/** 피그마 `Alumni credential and request` — 사원증 + 그 아래 신청 줄 */
function MentorCard({ card }: { card: CheersCard }) {
  return (
    <div className="flex flex-col gap-3">
      <EmployeeBadge data={toBadge(card)} />

      {/*
       * 피그마 `Request action`. 카드에 인쇄되지 않는 웹 UI 라 사원증
       * **바깥**에 있다(컴포넌트 설명: "Request CTA is separate web UI").
       */}
      {card.can_request ? (
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
