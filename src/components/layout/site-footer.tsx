import { PageContainer } from "./page-container";

/**
 * 사이트 푸터. 피그마 `Cheers / Footer`(353:9657)의 Viewport 2변형.
 *
 * 모바일은 세로로 쌓고(393×101), 데스크톱은 한 줄에 양끝 정렬이다(1440×69).
 * 구분선이 본문 위가 아니라 **푸터 맨 위**에 붙는 게 헤더와 다른 점이다.
 */

const tos_link = "https://terms.gistory.me/cheers/tos/261101/"
const privacy_link = "https://terms.gistory.me/cheers/privacy/261101/";
export function SiteFooter() {
  return (
    <footer className="bg-surface">
      {/* 피그마 `Divider` — 화면 끝까지 가므로 컨테이너 바깥이다 */}
      <div className="bg-line h-px" />

      <PageContainer className="flex flex-col items-start gap-4 py-6 lg:flex-row lg:items-center">
        <p className="text-label text-ink-soft lg:flex-1">취얼스</p>

        {/*
         * 피그마 `Legal links`. 약관 · 개인정보 본문은 외부 약관 사이트에 있어
         * 새 탭으로 연다. 모양은 시안의 글자 그대로다(Label/Small, 보조색).
         */}
        <div className="text-label-sm text-ink-soft flex items-center gap-6 whitespace-nowrap">
          <span><a href={tos_link} target="_blank"  rel="noopener noreferrer">이용약관</a></span>
          <span><a href={privacy_link} target="_blank"  rel="noopener noreferrer">개인정보 수집·이용</a></span>
        </div>
      </PageContainer>
    </footer>
  );
}
