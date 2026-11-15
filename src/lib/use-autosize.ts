import { useLayoutEffect } from "react";

/**
 * `textarea` 높이를 글자에 맞춘다. 커피챗 신청 모바일 질문 칸(동기화 가이드
 * 04장 4.3.3)이 "최소 120, 그 뒤로는 글자에 맞춰 160까지" 라서다.
 *
 * CSS `field-sizing: content` 면 한 줄이지만 iOS Safari 지원이 늦다. 그래서
 * 값이 바뀔 때마다 `scrollHeight` 를 높이로 적는다. 최소·최대는 이 훅이 아니라
 * 감싸는 상자의 `min-h` / `max-h` 가 정한다 — 상자가 최대에 닿으면
 * `textarea` 가 줄어들고(`min-h-0`) 그 안에서 스크롤한다.
 *
 * `enabled` 가 false 면(데스크톱 고정 높이) 적어 둔 높이를 지운다.
 */
export function useAutosize(
  ref: React.RefObject<HTMLTextAreaElement | null>,
  value: string,
  enabled: boolean
) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!enabled) {
      el.style.height = "";
      return;
    }
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [ref, value, enabled]);
}
