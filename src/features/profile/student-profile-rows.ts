import type { UserInfo } from "@/api";
import { formatPhone } from "@/lib/profile-form";
import { studentSharedEmailOf } from "./student-form";

/** 여러 값(관심 분야 · 참여 활동)을 잇는 글자. 시안이 쉼표다(동기화 가이드 D4-2) */
const LIST_SEPARATOR = ", ";

type Row = { label: string; value: string | null };

/**
 * 학생 프로필 줄. 값이 없으면 `null` 이다 — `ProfileRow` 가 `등록하지 않음` 을
 * 흐린 글자로 그린다. 이력서 · 포트폴리오는 줄이 아니라 파일 상자 묶음
 * (`AttachmentGroup`)으로 따로 그린다.
 *
 * 두 조각으로 나눈다(동기화 가이드 05장 5.2.3):
 * - 커피챗 신청 `함께 전달되는 내 정보`(336:8005)와 보낸 신청 내용 `전달한 내
 *   정보`(1251:15030)는 여섯 줄을 **이름 · 학과 · 관심 분야 · 참여 활동 ·
 *   이메일 · 전화번호** 순서로 한 번에 그린다(`studentProfileRowsOf`).
 * - 마이페이지(1251:9157)는 앞 네 줄을 `내 프로필`, 연락처 두 줄을 `연락처`
 *   구획에 따로 그리고 연락처 순서가 **전화번호 → 이메일**이다.
 */
export function studentBasicRowsOf(me: UserInfo): Row[] {
  const profile = me.student?.profile;
  return [
    { label: "이름", value: me.name ?? null },
    { label: "학과", value: profile?.department.name ?? null },
    { label: "관심 분야", value: profile?.interests.join(LIST_SEPARATOR) || null },
    { label: "참여 활동", value: profile?.activities.join(LIST_SEPARATOR) || null },
  ];
}

/**
 * 연락처. **켠 채널의 값만** 돌려준다(가이드 2.6.3) — 카카오를 끄면 번호도
 * 가지 않는다. 선배에게는 커피챗을 수락한 뒤에만 보인다(05장 D5-1).
 */
export function studentContactOf(me: UserInfo): { email: string | null; phone: string | null } {
  const contact = me.student?.profile?.contact;
  const phone = contact?.kakao_enabled ? contact.phone : null;
  return {
    // 알림 이메일은 고칠 수 있다(가이드 2.6.3) — 학교 이메일이 아니라 켠 주소
    email: studentSharedEmailOf(me) || null,
    phone: phone ? formatPhone(phone) : null,
  };
}

/** 선배에게 전달되는 여섯 줄. 커피챗 신청 화면과 보낸 신청 내용이 같은 줄, 같은 순서다 */
export function studentProfileRowsOf(me: UserInfo): Row[] {
  const { email, phone } = studentContactOf(me);
  return [
    ...studentBasicRowsOf(me),
    { label: "이메일", value: email },
    { label: "전화번호", value: phone },
  ];
}
