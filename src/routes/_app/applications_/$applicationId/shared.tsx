import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { receivedRequestQuery } from "@/api";
import { CompletionCard } from "@/components/completion-card";
import { PageContainer } from "@/components/layout/page-container";
import { action } from "@/components/ui/action";

/**
 * 연락처 공유 완료. 피그마 `Cheers / 연락처 공유 완료`(339:9132 / 339:9048).
 *
 * **오버레이가 아니라 셸을 두른 한 장이다** — 커피챗 신청 완료
 * (`mentors_/$mentorId/sent.tsx`)와 같은 경우라 경로도 같은 방식이다.
 * `applications_` 의 밑줄은 목록 레이아웃을 쓰지 않겠다는 표시라, 주소는
 * `/applications/{id}/shared` 그대로 두고 뒤에 목록이 깔리지 않는다.
 *
 * 학생 이름은 받은 신청 상세 캐시에서 읽는다. 새로고침하면 loader 가 다시
 * 받는다(이미 읽은 신청이라 상태가 바뀌지 않는다).
 */
export const Route = createFileRoute("/_app/applications_/$applicationId/shared")({
  beforeLoad: ({ context }) => {
    if (context.me.type !== "graduated") throw redirect({ to: "/applications" });
  },
  loader: async ({ context, params }) => {
    const request = await context.queryClient.ensureQueryData(
      receivedRequestQuery(params.applicationId)
    );
    // 주소를 직접 열었는데 아직 보내지 않은 신청이면 상세로 돌려보낸다
    if (!request.contact_shared_at) {
      throw redirect({
        to: "/applications/$applicationId",
        params: { applicationId: params.applicationId },
      });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { applicationId } = Route.useParams();
  const { data: request } = useSuspenseQuery(receivedRequestQuery(applicationId));

  return (
    <PageContainer className="flex flex-col items-center pt-8 pb-12 lg:pt-16 lg:pb-18">
      <CompletionCard
        title="연락처를 보냈어요."
        description={`${request.student.name}님께 이름과 이메일을 전달했어요.`}
      >
        <Link to="/applications" className={action()}>
          받은 신청 보기
        </Link>
      </CompletionCard>
    </PageContainer>
  );
}
