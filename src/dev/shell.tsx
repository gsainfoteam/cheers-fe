import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { PageContainer } from "@/components/layout/page-container";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader, type HeaderKind } from "@/components/layout/site-header";
import "@/index.css";

/**
 * 개발용 레이아웃 셸 확인 페이지 (`/shell.html`).
 *
 * 헤더는 Kind 가 네 가지인데, 실제 앱에서는 **한 번에 하나밖에 못 본다.**
 * Student/Alumni 는 세션이 있어야 하고 Onboarding 은 가입 중이어야 한다.
 * 네 벌을 나란히 놓고 폭을 줄였다 늘였다 하는 게 시안과 맞는지 보는
 * 유일한 방법이라 이 페이지를 둔다. 단계 1의 `/tokens.html` 과 같은 자리다.
 *
 * **라우터를 따로 세우는 이유.** 헤더가 TanStack `<Link>` 를 쓰므로 라우터
 * 없이는 렌더조차 안 된다. 그렇다고 진짜 라우트 트리를 쓰면 가드가 붙어
 * 로그인 화면으로 튕긴다. 그래서 헤더가 가리키는 경로만 빈 라우트로 세운
 * 메모리 라우터를 쓴다 — 아무것도 불러오지 않고, 링크는 멀쩡히 생긴다.
 */

const LINK_PATHS = [
  "/",
  "/login",
  "/mentors",
  "/applications",
  "/me",
] as const;

const rootRoute = createRootRoute({ component: ShellPreview });

const router = createRouter({
  routeTree: rootRoute.addChildren(
    LINK_PATHS.map((path) =>
      createRoute({ getParentRoute: () => rootRoute, path, component: () => null })
    )
  ),
  history: createMemoryHistory({ initialEntries: ["/"] }),
});

const KINDS: { kind: HeaderKind; note: string }[] = [
  { kind: "public", note: "랜딩 · 로그인 · 콜백 — 메뉴가 `로그인` 하나뿐이라 모바일에서도 로고와 같은 줄 (393×61 / 1440×73)" },
  { kind: "onboarding", note: "가입 전 구간 — 메뉴 없음 (393×61 / 1440×73)" },
  { kind: "student", note: "학생 본편 — 모바일에서 메뉴가 둘째 줄로 내려간다 (393×105 / 1440×73)" },
  { kind: "alumni", note: "선배 본편 — `받은 신청` 만 다르다 (393×105 / 1440×73)" },
];

export function ShellPreview() {
  return (
    <div className="min-h-svh">
      <PageContainer className="py-10">
        <p className="text-micro text-brand mb-3">CHEERS LAYOUT SHELL</p>
        <h1 className="text-task-title text-ink">레이아웃 셸 확인 (개발용)</h1>
        <p className="text-body text-ink-soft mt-3 max-w-prose">
          피그마 <code className="text-label">Cheers / Header</code>(353:9429) 8변형과{" "}
          <code className="text-label">Cheers / Footer</code>(353:9657) 2변형. 창 폭을
          1024px 아래위로 움직이면 네 헤더가 같이 바뀐다. 아래 푸터는 실제 셸이 쓰는 것과
          같은 것이다.
        </p>
      </PageContainer>

      {KINDS.map(({ kind, note }) => (
        <section key={kind} className="mb-10">
          <PageContainer className="mb-2">
            <p className="text-label text-ink">kind=&quot;{kind}&quot;</p>
            <p className="text-label-sm text-ink-soft">{note}</p>
          </PageContainer>
          {/* 바탕이 bg-surface 라 캔버스 위에서 경계가 보이도록 그대로 둔다 */}
          <SiteHeader kind={kind} />
        </section>
      ))}

      <section>
        <PageContainer className="mb-2">
          <p className="text-label text-ink">SiteFooter</p>
          <p className="text-label-sm text-ink-soft">
            모바일은 세로로 쌓고 데스크톱은 한 줄 양끝 정렬 (393×101 / 1440×69)
          </p>
        </PageContainer>
        <SiteFooter />
      </section>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* 앱의 진짜 라우터 타입이 전역으로 등록돼 있어 미리보기용 라우터와 맞지 않는다.
        렌더만 하는 자리라 타입을 비운다 */}
    <RouterProvider router={router as never} />
  </StrictMode>
);
