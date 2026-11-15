import type { RequestGraduated } from "@/api";

/**
 * 시안에는 있지만 API 명세에 아직 없는 필드의 **임시값**. 이슈 #46,
 * 동기화 가이드 05장 5.8.
 *
 * 화면마다 `?? null` 을 흩어 두지 않고 여기 모은다. 임시값은 모두 "없음"
 * (`null`, `[]`)이다 — 가짜 글자는 넣지 않는다. 화면이 "값이 없으면 줄을
 * 그리지 않는다" 규칙이라, BE 가 필드를 내려 주면 화면 코드는 그대로 둔다.
 *
 * **기본값을 앞에 두고 응답을 뒤에 펼친다.** `api:sync` 로 `dto.ts` 에 필드가
 * 생기면 실제 값이 기본값을 덮으므로, 이 파일을 지우기 전에도 화면이 바로
 * 실제 값을 쓴다. 필드가 생기면 해당 줄을 지운다.
 */

/** 보낸 신청 내용의 선배 카드(③) — 로고 · LinkedIn */
export type RequestGraduatedView = RequestGraduated & {
  company_logo_url: string | null;
  links: string[];
};

export function withPendingGraduatedFields(graduated: RequestGraduated): RequestGraduatedView {
  // TODO(#46): RequestGraduatedDto 에 company_logo_url · links 가 생기면 지운다
  return { company_logo_url: null, links: [], ...graduated };
}

/*
 * 2026-11-15 `api:sync` 로 명세에 생겨 지운 것: `RequestGraduatedDto.department` ·
 * `hashtags`(③ 중 둘), `CheersCardDto.department`(①),
 * `ReceivedRequestDto.interests` · `activities`(②), `GraduatedProfileDto.company_logo_url`(⑧),
 * 커피챗 수락 API(⑥ — `isAccepted` 와 브라우저 임시 기록 `isLocallyAccepted` ·
 * `markLocallyAccepted` 를 서버 상태로 바꿈).
 */
