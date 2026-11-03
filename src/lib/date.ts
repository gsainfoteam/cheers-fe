/**
 * 시안의 날짜 표기 — `2026.10.12`.
 *
 * `toLocaleDateString("ko-KR")` 는 `2026. 10. 12.` 로 공백과 끝점이 붙는다.
 * 시안과 다르고 기기 설정에 따라 또 달라지므로 직접 맞춘다.
 *
 * 서버가 주는 값은 ISO 8601 이고, 보여줄 때는 **보는 사람의 시간대**로
 * 읽는다 — 신청한 당사자에게는 자기 시계가 기준이다.
 */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}.${month}.${day}`;
}
