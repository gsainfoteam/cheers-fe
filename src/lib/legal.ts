/**
 * 약관 문서 주소. 약관 본문은 외부 약관 사이트(terms.gistory.me)에 있다.
 *
 * 한 문서를 **두 경로**로 연다.
 * - `pageUrl`: 일반 경로. 푸터처럼 새 탭으로 열 때 쓴다.
 * - `embedUrl`: `/embedded/` 경로. 약관 사이트 자체 헤더가 빠진 판이라
 *   iframe 으로 다이얼로그 안에 넣을 때 쓴다(일반 경로를 넣으면 제목이
 *   두 번 나온다).
 *
 * 약관을 개정하면 **여기 `VERSION` 하나만** 올린다. 예전에는 푸터와 약관
 * 동의 화면이 주소를 따로 들고 있어서 한쪽만 올라갈 수 있었다.
 */
const BASE = "https://terms.gistory.me";
const VERSION = "261101";

/** 키는 `GET /user/consent/list` 가 주는 `type` 과 같다 */
const PATHS = {
  tos: `cheers/tos/${VERSION}/`,
  privacy: `cheers/privacy/${VERSION}/`,
} as const;

export type LegalDoc = keyof typeof PATHS;

export function isLegalDoc(type: string): type is LegalDoc {
  return Object.hasOwn(PATHS, type);
}

export function pageUrl(doc: LegalDoc): string {
  return `${BASE}/${PATHS[doc]}`;
}

export function embedUrl(doc: LegalDoc): string {
  return `${BASE}/embedded/${PATHS[doc]}`;
}
