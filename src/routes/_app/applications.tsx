import { useState } from "react";
import { Link, Outlet, createFileRoute, useChildMatches } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  receivedRequestsQuery,
  sentRequestsQuery,
  userInfoQuery,
  type ReceivedRequest,
  type SentRequest,
} from "@/api";
import { PageContainer } from "@/components/layout/page-container";
import { action } from "@/components/ui/action";
import { NoticeDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { RequestItem } from "@/components/ui/request-item";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

/**
 * 보낸 신청 · 받은 신청. 피그마 학생 `Cheers / 보낸 신청`(1251:10163 / 1251:10174),
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
 *
 * **선배의 받은 신청 내용은 06장에서 한 장짜리 화면이 됐다**(`← 받은 신청
 * 목록` + 화면 제목, 동기화 가이드 6.5.1). 경로는 학생과 같은
 * `/applications/{id}` 로 둔다(알림톡 딥링크). 그래서 선배는 자식 경로가 있으면
 * 목록을 그리지 않고 자식만 그린다. 목록 데이터는 loader 가 받아 둔 채라
 * `← 받은 신청 목록` 으로 돌아오면 바로 뜬다.
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
  const hasChild = useChildMatches().length > 0;

  // 선배의 받은 신청 내용은 목록 위 오버레이가 아니라 한 장짜리 화면이다(06장)
  if (role === "mentor" && hasChild) return <Outlet />;

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
          <SentRow request={request} />
        </li>
      ))}
    </ul>
  );
}

/**
 * 피그마 `Cheers / Sent Requests`(1237:11072 / 1248:17998). 동기화 가이드
 * 05장 5.4 — 보낸 신청 행은 **상대 선배의 정보**다(D0-7): `회사`(`{회사} ·
 * {부서}`) / `직무` 정의 행 + 선배 해시태그 칩. 부서가 없으면 `{회사}` 만,
 * 해시태그가 없으면 칩 줄이 없다(명세 2026-11-15 갱신, #46).
 *
 * - 이름 뒤 `선배` 는 시안(닉네임만)과 달리 유지한다(D5-11)
 * - 시안의 상태 아이콘(안 읽음 / 읽음 / 수락함)은 수락 흐름이 정해질 때까지
 *   그리지 않는다(D5-10)
 */
function SentRow({ request }: { request: SentRequest }) {
  /*
   * 탈퇴한 선배(1258:9593). 기록은 남고 상세도 열린다(명세에 410 이 없다).
   * 서버가 보내는 선배 값은 쓰지 않고 FE 가 `열람 불가` 로 덮는다. 시안의
   * 칩 `#열람 불가` 는 그리지 않는다 — 선배가 단 태그처럼 읽힌다(D5-12)
   */
  if (request.graduated_withdrawn) {
    return (
      <RequestItem
        applicationId={request.id}
        name="탈퇴한 선배"
        date={request.created_at}
        rows={[
          { label: "회사", value: WITHDRAWN_VALUE },
          { label: "직무", value: WITHDRAWN_VALUE },
        ]}
      />
    );
  }

  const { graduated } = request;
  return (
    <RequestItem
      applicationId={request.id}
      name={`${graduated.nickname} 선배`}
      date={request.created_at}
      rows={[
        {
          label: "회사",
          value: graduated.department
            ? `${graduated.company} · ${graduated.department}`
            : graduated.company,
        },
        { label: "직무", value: graduated.job },
      ]}
      tags={graduated.hashtags}
    />
  );
}

const WITHDRAWN_VALUE = "열람 불가";

/* ───────────────── 선배 · 받은 신청 ───────────────── */

function ReceivedList() {
  const { data } = useSuspenseQuery(receivedRequestsQuery(LIST_PARAMS));

  if (data.items.length === 0) {
    /*
     * 피그마 `받은 신청 없음`(339:9998 / 339:9914) — 아이콘과 한 줄뿐이다.
     * 옛 시안의 설명 두 줄과 `내 프로필 확인` 버튼은 없어졌다(06장 6.4.3).
     * 레이어 이름은 `보낸` 이지만 화면 글자는 `받은` 이다
     */
    return <EmptyState title="아직 받은 신청이 없어요." />;
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

/**
 * 피그마 `Cheers / Received Requests`(1237:10977), 학생 탈퇴 시(1248:18431).
 *
 * 학과 · 관심 분야 · 참여 활동은 목록 명세(`ReceivedRequestDto`)로 그린다
 * (관심 분야 · 활동은 명세 2026-11-15 갱신, D0-6, #46). 상세를 부르면 읽음
 * 처리가 되므로 목록에서 상세를 불러 채우면 안 된다(가이드 §7 #13).
 * 빈 목록이면 그 줄을 그리지 않는다.
 */
function ReceivedRow({ request }: { request: ReceivedRequest }) {
  const [notice, setNotice] = useState(false);

  /*
   * 탈퇴한 학생(1248:18431). 상세는 410 으로 막혀 있다. 시안 주석: *"리스트에서도
   * 이름 정보 가리기, 클릭 시 '탈퇴한 학생의 신청입니다. 열람이 불가능해요'
   * 모달"*. 서버 값(이름 자리의 `탈퇴한 학생의 신청서입니다`, 학과)은 쓰지 않고
   * FE 가 `열람 불가` 로 덮는다. 칩 `#열람 불가` 는 그리지 않는다 — 보낸 신청의
   * 탈퇴한 선배 행과 같은 이유(D5-12, D6-9)
   */
  if (request.student_withdrawn) {
    return (
      <>
        <RequestItem
          onSelect={() => setNotice(true)}
          name="탈퇴한 학생"
          date={request.created_at}
          rows={[
            { label: "학과", value: WITHDRAWN_VALUE },
            { label: "관심 분야", value: WITHDRAWN_VALUE },
          ]}
        />
        <NoticeDialog
          open={notice}
          onOpenChange={setNotice}
          title="열람할 수 없어요"
          description="탈퇴한 학생의 신청입니다."
        />
      </>
    );
  }

  const rows = [
    { label: "학과", value: request.department },
    { label: "관심 분야", value: request.interests.join(", ") },
  ];

  return (
    <RequestItem
      applicationId={request.id}
      // 시안은 이름만 쓰지만 `님의 신청` 을 유지한다(동기화 가이드 D0-8)
      name={`${request.student_name}님의 신청`}
      date={request.created_at}
      rows={rows}
      tags={request.activities}
      tagsLabel="참여 활동"
    />
  );
}
