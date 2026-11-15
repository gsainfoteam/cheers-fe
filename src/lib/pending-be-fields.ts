import type { CheersCard, CheersStatus, ReceivedRequest, RequestGraduated } from "@/api";

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

/** 보낸 신청의 선배(③). 행의 `{회사} · {부서}`·칩, 상세 카드의 로고·부서·LinkedIn */
export type RequestGraduatedView = RequestGraduated & {
  department: string | null;
  hashtags: string[];
  company_logo_url: string | null;
  links: string[];
};

export function withPendingGraduatedFields(graduated: RequestGraduated): RequestGraduatedView {
  // TODO(#46): RequestGraduatedDto 에 필드가 생기면 지운다
  return { department: null, hashtags: [], company_logo_url: null, links: [], ...graduated };
}

/** 선배 카드(①). 사원증 부서 줄, 커피챗 신청 선배 카드 */
export function withPendingCardFields(card: CheersCard): CheersCard & { department: string | null } {
  // TODO(#46): CheersCardDto.department 가 생기면 지운다
  return { department: null, ...card };
}

/** 받은 신청 목록 행(②) */
export function withPendingReceivedFields(
  request: ReceivedRequest
): ReceivedRequest & { interests: string[]; activities: string[] } {
  // TODO(#46): ReceivedRequestDto.interests · activities 가 생기면 지운다
  return { interests: [], activities: [], ...request };
}

/**
 * 커피챗이 **수락**됐는가(⑥, D5-1). 정책상 선배가 수락하면 양쪽 연락처가
 * 서비스 안에서 공개된다. 지금 명세에서 그에 해당하는 것은 선배의 연락처
 * 공유(`share-contact` → `contact_shared`)다. BE 가 수락을 새 API·새 상태
 * 이름으로 바꾸면 이 함수만 고친다.
 */
export function isAccepted(status: CheersStatus): boolean {
  // TODO(#46): 수락 API·상태 이름이 정해지면 맞춘다
  return status === "contact_shared";
}
