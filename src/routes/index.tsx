import { Link, createFileRoute } from "@tanstack/react-router";
import { PageContainer } from "@/components/layout/page-container";
import { PageShell } from "@/components/layout/page-shell";
import { redirectIfSignedIn } from "@/lib/guards";

/**
 * 랜딩. 유형을 고르면 그 유형의 로그인 화면으로 보낸다.
 *
 * 순서가 뒤바뀌면 안 된다 — `POST /user/oauth/login` 이 `type` 을 필수로 받고,
 * 처음 로그인하는 사용자는 그 값으로 가입이 시작된다. 유형을 기억하는 일은
 * `/login` 이 `role` 파라미터를 받을 때 한다.
 *
 * **아직 시안(`352:9464` / `352:9465`)이 안 올라간 화면이다.** 히어로와 선배
 * 카드가 들어갈 자리이고, 지금은 로그인 구간이 끝까지 돌아가도록 유형 선택만
 * 남겨 뒀다.
 */
export const Route = createFileRoute("/")({
  // 이미 로그인한 사람에게 유형 선택을 다시 보여주지 않는다. 가입 중인
  // 사용자가 다른 유형을 누르면 인증과 추가 정보가 지워지기 때문이다
  beforeLoad: async ({ context }) => {
    await redirectIfSignedIn(context.queryClient);
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <PageShell kind="public">
      <PageContainer className="flex flex-col items-center pt-8 pb-12 lg:pt-16 lg:pb-18">
        <div className="flex w-full flex-col gap-7 lg:w-234">
          <div className="flex flex-col gap-3 lg:gap-5">
            <h1 className="text-task-title text-ink">취얼스</h1>
            <p className="text-body text-ink-soft">어떤 유형으로 시작할까요?</p>
          </div>

          <div className="flex flex-col gap-3 lg:w-130">
            <Link
              to="/login"
              search={{ role: "student" }}
              className="border-line bg-surface text-ink text-label-lg flex h-14 w-full items-center rounded-lg border p-4"
            >
              취업 준비 중인 학생으로 시작하기
            </Link>
            <Link
              to="/login"
              search={{ role: "mentor" }}
              className="border-line bg-surface text-ink text-label-lg flex h-14 w-full items-center rounded-lg border p-4"
            >
              취업한 선배로 시작하기
            </Link>
          </div>
        </div>
      </PageContainer>
    </PageShell>
  );
}
