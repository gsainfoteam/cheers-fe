import { Link, createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { cheersListQuery } from "@/api";
import { CompletionCard } from "@/components/completion-card";
import { PageContainer } from "@/components/layout/page-container";
import { action } from "@/components/ui/action";
import { cn } from "@/lib/utils";
import { MENTOR_LIST_PARAMS } from "@/lib/mentor-list";

/**
 * 커피챗 신청 완료. 피그마 `Cheers / 커피챗 신청 완료`(337:7304 / 337:7217).
 *
 * **오버레이가 아니라 한 장의 화면이다.** 신청 화면은 목록 위에 뜨지만
 * 이 화면은 헤더·푸터를 그대로 두른 본문이고 뒤에 목록이 없다 — 시안이
 * 그렇게 그려져 있다.
 *
 * 그래서 경로가 `mentors_` 다. TanStack 의 밑줄 접미사는 **부모 레이아웃을
 * 쓰지 않겠다**는 표시라, 주소는 `/mentors/{id}/sent` 그대로 두면서 목록
 * 레이아웃 밖에 선다.
 *
 * 선배 이름은 목록 캐시에서 읽는다. 새로고침으로 캐시가 비면 loader 가
 * 같은 쿼리를 다시 받는다.
 */
export const Route = createFileRoute("/_app/mentors_/$mentorId/sent")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(cheersListQuery(MENTOR_LIST_PARAMS)),
  component: RouteComponent,
});

function RouteComponent() {
  const { mentorId } = Route.useParams();
  const { data: list } = useSuspenseQuery(cheersListQuery(MENTOR_LIST_PARAMS));
  const mentor = list.items.find((item) => item.graduated_id === mentorId);

  return (
    <PageContainer className="flex flex-col items-center pt-8 pb-12 lg:pt-16 lg:pb-18">
      <CompletionCard
        title="커피챗 요청을 보냈어요."
        description={`${mentor ? `${mentor.nickname} 선배에게 ` : ""}질문과 프로필을 전달했어요.`}
      >
        <Link to="/applications" className={action()}>
          보낸 신청 보기
        </Link>
        {/*
         * 시안의 Ghost 는 이 자리에서 **흰 바탕**이다(카드 위라 테두리 없이도
         * 버튼으로 읽힌다). 랜딩의 Ghost 는 배경 없이 글자만이라 토큰 쪽을
         * 건드리지 않고 여기서만 바탕을 얹었다.
         */}
        <Link
          to="/mentors"
          className={cn(action({ variant: "ghost" }), "bg-surface")}
        >
          선배 둘러보기
        </Link>
      </CompletionCard>
    </PageContainer>
  );
}
