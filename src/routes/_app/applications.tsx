import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { sentRequestsQuery, userInfoQuery, type SentRequest } from "@/api";
import chevronRight from "@/assets/icons/chevron-right.svg";
import coffeeIcon from "@/assets/icons/coffee.svg";
import coffeeLarge from "@/assets/icons/coffee-lg.svg";
import { PageContainer } from "@/components/layout/page-container";
import { action } from "@/components/ui/action";
import { formatDate } from "@/lib/date";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

/**
 * 보낸 신청. 피그마 `Cheers / 보낸 신청`(337:7514 / 337:7389)과
 * `보낸 신청 없음`(337:8004 / 337:7920).
 *
 * 둘러보기와 같은 구조다 — 목록을 **레이아웃**에 두고 상세를 자식으로 받는다.
 * 설계 5.3 이 "상세는 PC 에서 목록 위 모달, 모바일에서 전체 화면" 이라고
 * 정해 뒀고, 목록이 언마운트되면 그게 성립하지 않는다.
 *
 * **선배가 받은 신청은 아직 이 화면이 아니다.** 시안의 `06 · 선배 계정·받은
 * 신청` 은 설계 3절이 비목표로 둔 범위다. 경로는 하나로 두되(알림톡 딥링크가
 * 수신자 유형을 몰라도 되도록) 선배에게는 안내만 보여준다.
 */
export const Route = createFileRoute("/_app/applications")({
  loader: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(userInfoQuery());

    // 선배의 받은 신청은 다른 API 다. 그 화면이 아직 없으므로 보낸 신청을
    // 대신 부르지 않는다 — 선배가 부르면 403 이 돌아온다
    if (me.type === "student") {
      await context.queryClient.ensureQueryData(sentRequestsQuery(LIST_PARAMS));
    }
  },
  component: RouteComponent,
});

/** 둘러보기와 같은 이유로 한 번에 받을 수 있는 최대치를 받는다 */
const LIST_PARAMS = { size: 50 } as const;

function RouteComponent() {
  return (
    <>
      <SentList />
      {/* 상세 오버레이. 목록은 그대로 남아 뒤에 깔린다 */}
      <Outlet />
    </>
  );
}

function SentList() {
  const { role } = useSession();

  return (
    <PageContainer className="flex flex-col items-center pt-8 pb-12 lg:pt-16 lg:pb-18">
      {/* 피그마 `Content` */}
      <div className="flex w-full flex-col gap-8 lg:w-200">
        <h1 className="text-task-title text-ink">
          {role === "student" ? "보낸 신청" : "받은 신청"}
        </h1>

        {role === "student" ? (
          <SentRequests />
        ) : (
          <p className="text-body text-ink-soft">
            받은 신청 화면은 아직 준비 중이에요.
          </p>
        )}
      </div>
    </PageContainer>
  );
}

function SentRequests() {
  const { data } = useSuspenseQuery(sentRequestsQuery(LIST_PARAMS));

  if (data.items.length === 0) return <EmptyRequests />;

  /* 피그마 `Requests` */
  return (
    <ul className="flex flex-col gap-4">
      {data.items.map((request) => (
        <li key={request.id}>
          <RequestRow request={request} />
        </li>
      ))}
    </ul>
  );
}

/** 피그마 `Action / sentDetail` */
function RequestRow({ request }: { request: SentRequest }) {
  const { graduated } = request;

  return (
    <Link
      to="/applications/$applicationId"
      params={{ applicationId: request.id }}
      className="bg-surface border-line flex items-center gap-4 rounded-lg border px-4 py-5 lg:gap-6 lg:p-7"
    >
      {/* 피그마 `Coffee icon` — 샴페인 바탕의 정사각 */}
      <span className="bg-champagne flex size-11 shrink-0 items-center justify-center rounded-md">
        <img src={coffeeIcon} alt="" />
      </span>

      {/* 피그마 `Request content` */}
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="text-card-title text-ink">
          {graduated.nickname} 선배
        </span>
        <span className="text-body-sm text-ink-soft">
          {/*
           * 탈퇴한 선배도 기록은 남는다(명세 `graduated_withdrawn`). 시안에
           * 이 상태가 없어서 회사·직무 자리에 그 사실을 적는다 — 빈칸으로
           * 두면 "정보가 없는 선배" 처럼 읽힌다.
           */}
          {request.graduated_withdrawn
            ? "탈퇴한 선배"
            : `${graduated.company} · ${graduated.job}`}
        </span>
        <span className="text-label-sm text-ink-soft">
          {formatDate(request.created_at)}
        </span>
      </span>

      <img src={chevronRight} alt="" className="shrink-0" />
    </Link>
  );
}

/** 피그마 `Empty request list`(337:7926 / 337:8010) */
function EmptyRequests() {
  return (
    <div className="flex flex-col items-center gap-6 py-12 lg:py-14">
      <img src={coffeeLarge} alt="" />
      <h2 className="text-h2 text-ink text-center">아직 보낸 신청이 없어요.</h2>
      <p className="text-body text-ink-soft text-center">
        궁금한 경험을 가진 선배에게
        <br />첫 커피챗을 신청해 보세요.
      </p>
      <Link to="/mentors" className={cn(action(), "w-full lg:w-60")}>
        선배 둘러보기
      </Link>
    </div>
  );
}
