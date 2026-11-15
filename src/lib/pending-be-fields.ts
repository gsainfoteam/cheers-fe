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
 * 선배가 **연락처를 공유**했는가(⑥, D5-1). 지금 명세에서 서버가 아는 유일한
 * "다음 단계"는 `share-contact` → `contact_shared` 다. 학생의 보낸 신청 내용은
 * 이 값으로 선배 연락처를 보인다. BE 가 상태 이름을 바꾸면 이 함수만 고친다.
 */
export function isAccepted(status: CheersStatus): boolean {
  // TODO(#47): 수락 API·상태 이름이 정해지면 맞춘다(BE 요청은 #46)
  return status === "contact_shared";
}

/*
 * ───────── 커피챗 수락 — 서버 없는 임시 기록 (06장 D6-1) ─────────
 *
 * 시안은 "커피챗 수락" 과 "내 연락처 공유" 를 다른 단계로 나눴지만 명세에는
 * 수락 API 가 없다. 그래서 `커피챗 수락하기` 는 **API 를 부르지 않고** 이
 * 브라우저에만 적어 둔다(새로고침해도 수락 상태가 유지되게). 서버가 아는
 * 단계는 연락처 공유(`share-contact`)뿐이다.
 *
 * - 다른 기기 · 다른 브라우저에서는 수락 전으로 보인다.
 * - 학생 연락처는 지금 명세상 수락 전에도 응답에 온다. 화면만 수락 뒤에 그린다.
 *
 * TODO(#47): 수락 API 가 생기면 이 묶음을 지우고 서버 상태로 판정한다.
 */

const LOCAL_ACCEPTED_KEY = "cheers:accepted-requests";

function readLocalAccepted(): string[] {
  try {
    const raw = localStorage.getItem(LOCAL_ACCEPTED_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

/** 이 브라우저에서 `커피챗 수락하기` 를 누른 신청인가 */
export function isLocallyAccepted(requestId: string): boolean {
  return readLocalAccepted().includes(requestId);
}

/** `커피챗 수락하기` 를 기록한다. 저장이 막혀도(사생활 보호 모드) 화면 상태는 호출부가 들고 있다 */
export function markLocallyAccepted(requestId: string): void {
  try {
    const ids = readLocalAccepted();
    if (!ids.includes(requestId)) {
      localStorage.setItem(LOCAL_ACCEPTED_KEY, JSON.stringify([...ids, requestId]));
    }
  } catch {
    // 저장이 막힌 환경 — 이번 화면에서만 수락 상태가 유지된다
  }
}
