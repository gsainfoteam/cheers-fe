import type { UserInfo } from "@/api";

/**
 * 연락처 공유로 학생에게 갈 내 이메일. 선배 추가 정보에서 저장한
 * `contact.email` 이다.
 *
 * 받은 신청 내용의 `내 연락처 공유` 카드와 공유 확인 대화상자가 **같은 값**을
 * 보여줘야 한다 — 둘이 다르면 확인한 것과 보낸 것이 어긋난다.
 *
 * 가입 화면이 이메일을 필수로 받지만(이슈 #26 임시 결정) 그 전에 가입한
 * 계정은 비어 있을 수 있다. 그때 공유는 서버가 409 로 막는다.
 */
export function myContactEmailOf(me: UserInfo): string | null {
  return me.graduated?.profile?.contact?.email ?? null;
}
