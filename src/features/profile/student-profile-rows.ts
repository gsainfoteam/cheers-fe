import type { UserInfo } from "@/api";
import { attachmentLabelsOf } from "@/lib/attachments";
import { formatPhone } from "@/lib/profile-form";
import { studentSharedEmailOf } from "./student-form";

/**
 * 선배에게 전달되는 학생 프로필 일곱 줄. 피그마 `Sent profile`(보낸 신청
 * 내용 337:7754)과 `전달 프로필 미리보기`(338:8166)가 **같은 줄**이다 —
 * 미리보기가 "신청하면 이렇게 간다" 를 보여주는 화면이라 둘이 어긋나면 안 된다.
 *
 * 순서는 시안 그대로다. 커피챗 신청 화면(4-2)의 요약과는 순서가 다르다.
 */
export function studentProfileRowsOf(
  me: UserInfo
): { label: string; value: string }[] {
  const profile = me.student?.profile;
  const none = "등록하지 않음";
  const phone = profile?.contact?.kakao_enabled ? profile.contact.phone : null;
  // 알림 이메일은 이제 고칠 수 있다(가이드 2.6.3) — 학교 이메일이 아니라 켠 주소
  const email = studentSharedEmailOf(me);

  return [
    { label: "이름", value: me.name ?? none },
    { label: "학과", value: profile?.department.name ?? none },
    { label: "관심 분야", value: profile?.interests.join(" · ") || none },
    { label: "참여 활동", value: profile?.activities.join(" · ") || none },
    { label: "이메일", value: email || none },
    { label: "전화번호", value: phone ? formatPhone(phone) : none },
    { label: "이력서 / 포트폴리오", value: attachmentLabelsOf(profile?.attachments) ?? none },
  ];
}
