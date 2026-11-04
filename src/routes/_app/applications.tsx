import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  receivedRequestsQuery,
  sentRequestsQuery,
  userInfoQuery,
  type ReceivedRequest,
} from "@/api";
import { PageContainer } from "@/components/layout/page-container";
import { action } from "@/components/ui/action";
import { EmptyState } from "@/components/ui/empty-state";
import { RequestItem } from "@/components/ui/request-item";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

/**
 * 보낸 신청 · 받은 신청. 피그마 학생 `Cheers / 보낸 신청`(337:7514 / 337:7389),
 * `보낸 신청 없음`(337:8004 / 337:7920), 선배 `Cheers / 받은 신청`
 * (338:9655 / 338:9530), `받은 신청 없음`(339:9992 / 339:9908).
 *
 * **학생의 보낸 신청 42 와 선배의 받은 신청 42 는 같은 객체라 경로가 하나다**
 * — 알림톡 딥링크가 수신자 유형을 몰라도 된다(설계 4-3c). 대신 부르는
 * API 가 다르므로 **loader 가 `me.type` 으로 API 를 고르고**, 화면은
 * `SentList` / `ReceivedList` 로 갈라 그린다(선배 가이드 §4.2). 화면에서
 * 분기하면 loader 가 엉뚱한 API 를 불러 403 화면이 뜬다.
 *
 * 둘러보기와 같은 구조다 — 목록을 **레이아웃**에 두고 상세를 자식으로 받는다.
 * 설계 5.3 이 "상세는 PC 에서 목록 위 모달, 모바일에서 전체 화면" 이라고
 * 정해 뒀고, 목록이 언마운트되면 그게 성립하지 않는다.
 */
export const Route = createFileRoute("/_app/applications")({
  loader: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(userInfoQuery());

    if (me.type === "student") {
      await context.queryClient.ensureQueryData(sentRequestsQuery(LIST_PARAMS));
    } else {
      await context.queryClient.ensureQueryData(
        receivedRequestsQuery(LIST_PARAMS)
      );
    }
  },
  component: RouteComponent,
});

/**
 * 둘러보기와 같은 이유로 한 번에 받을 수 있는 최대치를 받는다. 시안에
 * 페이지 넘김이 없다
 */
const LIST_PARAMS = { size: 50 } as const;

function RouteComponent() {
  const { role } = useSession();

  return (
    <>
      <PageContainer className="flex flex-col items-center pt-8 pb-12 lg:pt-16 lg:pb-18">
        {/* 피그마 `Content` */}
        <div className="flex w-full flex-col gap-8 lg:w-200">
          <h1 className="text-task-title text-ink">
            {role === "student" ? "보낸 신청" : "받은 신청"}
          </h1>
          {role === "student" ? <SentList /> : <ReceivedList />}
        </div>
      </PageContainer>

      {/* 상세 오버레이. 목록은 그대로 남아 뒤에 깔린다 */}
      <Outlet />
    </>
  );
}

/* ───────────────── 학생 · 보낸 신청 ───────────────── */

function SentList() {
  const { data } = useSuspenseQuery(sentRequestsQuery(LIST_PARAMS));

  if (data.items.length === 0) {
    // 피그마 `Empty request list`(337:7926 / 337:8010)
    return (
      <EmptyState
        title="아직 보낸 신청이 없어요."
        description={
          <>
            궁금한 경험을 가진 선배에게
            <br />첫 커피챗을 신청해 보세요.
          </>
        }
        action={
          <Link to="/mentors" className={cn(action(), "w-full lg:w-60")}>
            선배 둘러보기
          </Link>
        }
      />
    );
  }

  /* 피그마 `Requests` */
  return (
    <ul className="flex flex-col gap-4">
      {data.items.map((request) => (
        <li key={request.id}>
          <RequestItem
            applicationId={request.id}
            title={`${request.graduated.nickname} 선배`}
            detail={
              /*
               * 탈퇴한 선배도 기록은 남는다(명세 `graduated_withdrawn`). 시안에
               * 이 상태가 없어서 회사·직무 자리에 그 사실을 적는다 — 빈칸으로
               * 두면 "정보가 없는 선배" 처럼 읽힌다.
               */
              request.graduated_withdrawn
                ? "탈퇴한 선배"
                : `${request.graduated.company} · ${request.graduated.job}`
            }
            date={request.created_at}
          />
        </li>
      ))}
    </ul>
  );
}

/* ───────────────── 선배 · 받은 신청 ───────────────── */

function ReceivedList() {
  const { data } = useSuspenseQuery(receivedRequestsQuery(LIST_PARAMS));

  if (data.items.length === 0) {
    /*
     * 피그마 `받은 신청 없음`(339:9992). 텍스트 노드 이름은 학생 문구로 남아
     * 있지만 렌더된 화면은 선배용이다 — 화면 글자를 옮겼다. 버튼은 둘러보기가
     * 아니라 **내 프로필**로 간다.
     */
    return (
      <EmptyState
        title="아직 받은 신청이 없어요."
        description={
          <>
            프로필과 연락 설정을 확인해 보세요.
            <br />
            신청이 오면 이곳에서 볼 수 있어요.
          </>
        }
        action={
          <Link to="/me" className={cn(action(), "w-full lg:w-60")}>
            내 프로필 확인
          </Link>
        }
      />
    );
  }

  /*
   * 행마다 상세를 부르지 않는다 — 받은 신청 상세의 **첫 조회가 상태를
   * `viewed` 로 바꾼다.** 목록을 여는 것만으로 모든 신청이 읽음이 된다.
   * 상태 배지도 그리지 않는다(설계 5.3 이 읽음·거절·만료를 의도적으로 뺐다).
   */
  return (
    <ul className="flex flex-col gap-4">
      {data.items.map((request) => (
        <li key={request.id}>
          <ReceivedRow request={request} />
        </li>
      ))}
    </ul>
  );
}

/** 피그마 `Action / received` */
function ReceivedRow({ request }: { request: ReceivedRequest }) {
  // 탈퇴한 학생의 신청은 상세가 410 으로 막힌다(명세: "프론트는 목록 클릭을
  // 막음"). 이름 자리에 서버가 `탈퇴한 학생의 신청서입니다` 를 보내 주므로
  // `님의 신청` 을 붙이지 않는다. 시안에 없는 상태다
  if (request.student_withdrawn) {
    return (
      <RequestItem
        title={request.student_name}
        detail={request.department}
        date={request.created_at}
      />
    );
  }

  return (
    <RequestItem
      applicationId={request.id}
      title={`${request.student_name}님의 신청`}
      // 시안 둘째 줄은 `학과 · 관심 분야` 인데 목록 명세(`ReceivedRequestDto`)에
      // 관심 분야가 없다. 상세를 부르면 읽음 처리가 되므로 학과만 둔다(가이드 §7 #13)
      detail={request.department}
      date={request.created_at}
    />
  );
}
