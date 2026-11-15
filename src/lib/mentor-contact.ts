import type { UserInfo } from "@/api";

/**
 * 연락처 공유로 학생에게 갈 내 연락처. 선배 추가 정보·정보 수정에서 저장한
 * `contact` 중 **켠 채널의 값**이다.
 *
 * 선배가 입력한 연락처는 알림용이자 공유용이고, 공유하면 입력한 연락처가
 * 모두 간다(동기화 가이드 D3-3, 2026-11-14). 끈 채널은 저장할 때 `null` 이
 * 되므로(`contactRequestFrom`) 켜짐도 함께 본다 — 그 전에 저장된 값이 남아
 * 있어도 보여주지 않는다.
 *
 * 받은 신청 내용의 `내 연락처 공유` 카드와 공유 확인 대화상자가 **같은 값**을
 * 보여줘야 한다 — 둘이 다르면 확인한 것과 보낸 것이 어긋난다.
 *
 * 둘 다 없으면(커피챗 미참여) 공유는 서버가 409 로 막는다.
 */
export function mySharedContactOf(me: UserInfo): {
  email: string | null;
  phone: string | null;
} {
  const contact = me.graduated?.profile?.contact;
  return {
    email: contact?.email_enabled && contact.email ? contact.email : null,
    phone: contact?.kakao_enabled && contact.phone ? contact.phone : null,
  };
}
