import { SiteFooter } from "./site-footer";
import { SiteHeader, type HeaderKind } from "./site-header";

/**
 * 모든 화면이 입는 셸 — 헤더 + 본문 + 푸터.
 *
 * 시안 46화면을 훑어보면 헤더·푸터가 **전부**에 붙어 있다. 빠진 여섯 개는
 * 전부 모바일 전체 화면 오버레이(약관 불러오는 중, 커피챗 신청, 전달 프로필
 * 미리보기, 보낸 신청 내용)다. 즉 예외는 라우트가 아니라 오버레이이고,
 * 오버레이는 셸 위를 덮는 것이지 셸을 바꾸는 게 아니다.
 *
 * **셸을 `__root.tsx` 에 두지 않은 이유.** `kind` 를 루트에서 알 수 없다.
 * Student/Alumni 는 세션을 봐야 갈리는데, 세션은 `_app` 의 가드를 지나야
 * 읽을 수 있다(로그아웃 상태에서 루트가 그걸 읽으려 들면 안 된다). 경로
 * 문자열로 추측하거나 라우트 컨텍스트를 거슬러 올라가는 방법도 있지만,
 * 둘 다 "이 화면이 어떤 헤더를 쓰는지" 를 한눈에 안 보이게 만든다.
 * 그래서 구간을 소유한 라우트가 자기 `kind` 를 직접 적는다.
 *
 * 쓰는 곳은 다섯 군데다. 공개 구간 세 라우트(`/`, `/login`,
 * `/auth/callback`)와 레이아웃 라우트 둘(`onboarding`, `_app`).
 * **공개 라우트를 새로 만들면 여기를 같이 입혀야 한다.**
 *
 * 바탕색은 `body` 가 이미 `bg-canvas` 다(토큰 파일 `@layer base`).
 * 헤더·푸터만 `bg-surface` 로 떠 있다.
 */
export function PageShell({
  kind,
  children,
}: {
  kind: HeaderKind;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader kind={kind} />
      {/* 본문이 짧아도 푸터가 화면 중간에 뜨지 않게 남은 높이를 먹는다 */}
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
