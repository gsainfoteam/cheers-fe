/** 주어진 시각까지 남은 초(올림). 지났으면 0 */
export function secondsUntil(iso: string | undefined): number {
  if (!iso) return 0;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 1000));
}

/** `04:32` — 인증번호 남은 시간처럼 1시간을 넘지 않는 자리 */
export function mmss(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * 재전송 대기 시간. 명세의 429 는 "재전송 대기" 와 "발송 횟수 초과" 를 함께
 * 쓰고, 횟수 초과는 대기가 1시간을 넘을 수 있다. `mmss` 로 그리면
 * `125:00` 이 되므로 1시간부터는 시·분으로 적는다(동기화 가이드 2.4.3).
 */
export function formatWait(total: number): string {
  if (total < 3600) return mmss(total);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return `${h}시간 ${m}분`;
}
