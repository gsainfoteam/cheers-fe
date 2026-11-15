import { useSyncExternalStore } from "react";

/**
 * CSS 미디어 쿼리가 맞는지. 폭에 따라 **구조가** 달라지는 자리(학과 고르기의
 * 드롭다운 ↔ 바텀시트)에만 쓴다. 모양만 다른 자리는 `lg:` 클래스로 충분하다.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", notify);
      return () => list.removeEventListener("change", notify);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}

/** Tailwind `lg` 경계(1024) 아래. `max-lg:` 과 같은 기준이다 */
export const BELOW_LG = "(width < 64rem)";
