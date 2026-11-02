import { useEffect } from "react";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { z } from "zod";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { PageContainer } from "@/components/layout/page-container";
import { PageShell } from "@/components/layout/page-shell";
import { redirectIfSignedIn } from "@/lib/guards";
import { toInternalPath } from "@/lib/redirect";
import { lastRole, rememberRole } from "@/lib/role";
import type { Role } from "@/lib/session";

const searchSchema = z.object({
  redirect: z.string().optional(),
  reason: z.enum(["application", "wrong-account"]).optional(),
  switchAccount: z.coerce.boolean().optional(),
  role: z.enum(["student", "mentor"]).optional(),
});

/**
 * 로그인. 피그마 `Cheers / 학생 로그인`(334:5733 / 334:5643)과
 * `Cheers / 선배 로그인`(334:5917)이 **같은 화면의 두 변형**이라 한 라우트다.
 *
 * 시안에서 두 변형이 다른 건 제목과 아래쪽 전환 링크뿐이고, 나머지는 전부
 * 같다. 그래서 role 을 검색 파라미터로 받는다 — 랜딩의 "학생으로 시작하기"
 * 가 `/login?role=student` 로 보내고, 화면 아래 링크가 반대쪽으로 넘긴다.
 *
 * role 없이 들어오는 길도 있다. 가드가 딥링크에서 튕겨 보낼 때(`redirect`,
 * `reason` 이 붙는 경우)는 유형을 알 수 없어서 마지막에 고른 유형으로
 * 떨어진다 — `lib/role.ts` 주석 참고.
 */
/**
 * 네 값 모두 **선택**이다. 필수로 두면 `/login` 으로 보내는 쪽마다 쓰지도 않는
 * 키를 전부 적어야 한다 — 가드(`lib/guards.ts`)는 유형을 모르고, 랜딩은
 * 복귀 지점을 모른다.
 */
type LoginSearch = {
  redirect?: string;
  reason?: "application" | "wrong-account";
  switchAccount?: boolean;
  role?: Role;
};

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => {
    const parsed = searchSchema.safeParse(search);
    const value = parsed.success ? parsed.data : {};
    return {
      redirect: toInternalPath(value.redirect),
      reason: value.reason,
      switchAccount: value.switchAccount === true,
      role: value.role,
    };
  },
  beforeLoad: async ({ context, search }) => {
    // "다른 계정으로 로그인" 은 세션이 있어도 여기 머물러야 한다.
    // 아니면 계정을 바꾸려는 사람이 영영 제자리로 튕긴다
    if (search.switchAccount) return;
    await redirectIfSignedIn(context.queryClient);
  },
  component: RouteComponent,
});

const MESSAGE = {
  application: "신청 내용을 보려면 로그인을 해주세요.",
  "wrong-account": "다른 계정으로 로그인해 주세요.",
} as const;

/** 시안 문구 그대로. 임의로 바꾸지 않는다 */
const COPY: Record<Role, { title: string; switchTo: string }> = {
  student: { title: "학생으로 시작하기", switchTo: "취업한 선배로 시작하기" },
  mentor: {
    title: "선배로 시작하기",
    switchTo: "취업 준비 중인 학생으로 시작하기",
  },
};

function RouteComponent() {
  const { reason, redirect, switchAccount, role: picked } = Route.useSearch();
  const router = useRouter();

  /**
   * 유형이 URL 에 없으면 마지막에 고른 것을 쓴다. `POST /user/oauth/login` 이
   * `type` 을 필수로 받고, 가입 중인 유저에게는 그 값이 진짜로 작용한다.
   */
  const role: Role = picked ?? lastRole() ?? "student";
  const other: Role = role === "student" ? "mentor" : "student";

  // URL 로 유형이 정해졌으면 기억해 둔다. 다음에 `/login` 으로 맨몸으로
  // 돌아와도 같은 유형으로 로그인되게 하려는 것이다
  useEffect(() => {
    if (picked) rememberRole(picked);
  }, [picked]);

  const afterLogin = () => {
    if (redirect) {
      // 딥링크 복귀. 타입이 붙은 `to` 로는 임의 경로를 표현할 수 없어 history 를 쓴다.
      // 값은 validateSearch 에서 같은 출처인지 이미 걸러졌다
      router.history.push(redirect);
      return;
    }
    // 복귀 지점이 없으면 가드가 next_step 을 보고 정한다
    void router.invalidate();
  };

  return (
    <PageShell kind="public">
      <PageContainer className="flex flex-col items-center pt-8 pb-12 lg:pt-16 lg:pb-18">
        {/* 피그마 `Task workspace` — 모바일은 한 줄로 쌓고 데스크톱은 2열 */}
        <div className="flex w-full flex-col gap-7 lg:w-234 lg:flex-row lg:items-start lg:gap-16">
          {/* 피그마 `Task introduction` — pt-4 는 제목을 카드와 눈높이에 맞추는 값 */}
          <div className="flex flex-col gap-3 lg:w-88 lg:shrink-0 lg:gap-5 lg:pt-4">
            <h1 className="text-task-title text-ink">{COPY[role].title}</h1>
            <p className="text-body text-ink-soft">
              가입한 계정이 있다면 같은 계정으로 로그인해 주세요.
            </p>
          </div>

          {/* 피그마 `Content` — 카드 껍데기는 데스크톱에만 있다 */}
          <div className="lg:border-line lg:bg-surface lg:shadow-work flex flex-col gap-7 lg:w-130 lg:shrink-0 lg:rounded-lg lg:border lg:p-10">
            {reason ? (
              <p className="text-body-sm text-ink-soft">{MESSAGE[reason]}</p>
            ) : null}

            <GoogleSignInButton
              role={role}
              // GIS 에는 prompt=select_account 가 없다. 자동 선택을 꺼서 계정 선택
              // 화면이 뜨게 한다 — 없으면 구글이 기존 세션으로 즉시 돌려보내서
              // 사용자가 "다른 계정으로 로그인" 과 "확인할 수 없어요" 사이를 맴돈다
              switchAccount={switchAccount}
              onSuccess={afterLogin}
            />

            {/* 유형을 잘못 골라 들어온 사람의 출구. 복귀 지점은 그대로 들고 간다 */}
            <Link
              to="/login"
              search={{ redirect, reason, switchAccount, role: other }}
              className="text-label text-brand"
            >
              {COPY[role].switchTo}
            </Link>
          </div>
        </div>
      </PageContainer>
    </PageShell>
  );
}
