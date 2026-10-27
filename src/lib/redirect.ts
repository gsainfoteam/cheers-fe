/**
 * 로그인 후 돌아갈 경로를 검증한다.
 *
 * 검증 없이 쓰면 `/login?redirect=https://evil.com` 같은 링크를 만들 수 있고,
 * 알림톡을 사칭한 피싱으로 이어진다. 같은 출처의 경로만 통과시킨다.
 */
export function toInternalPath(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (!value.startsWith("/")) return undefined;
  // "//evil.com" 은 프로토콜 상대 URL, "/\evil.com" 은 일부 브라우저가 같게 해석한다
  if (value.startsWith("//") || value.startsWith("/\\")) return undefined;
  return value;
}
