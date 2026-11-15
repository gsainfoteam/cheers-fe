import type { UserInfo } from "@/api";
import { attachmentLabelsOf } from "@/lib/attachments";
import { formatPhone } from "@/lib/profile-form";
import { studentSharedEmailOf } from "./student-form";

/** 여러 값(관심 분야 · 참여 활동)을 잇는 글자. 시안이 쉼표다(동기화 가이드 D4-2) */
const LIST_SEPARATOR = ", ";

/**
 * 선배에게 전달되는 학생 프로필. 피그마 `Sent profile`(보낸 신청 내용
 * 337:7754), `전달 프로필 미리보기`(338:8166), 커피챗 신청의 `Profile sent to
 * alumni`(336:8005)가 **같은 줄, 같은 순서**다 — 미리보기와 신청 화면이
 * "신청하면 이렇게 간다" 를 보여주는 자리라 셋이 어긋나면 안 된다.
 *
 * 값이 없으면 `null` 이다. `ProfileRow` 가 `등록하지 않음` 을 흐린 글자로 그린다.
 *
 * `withAttachments: false` 면 마지막 `이력서 / 포트폴리오` 줄을 뺀다. 커피챗
 * 신청 화면은 첨부를 파일마다 누를 수 있는 상자로 따로 그린다(04장 4.3.5).
 */
export function studentProfileRowsOf(
  me: UserInfo,
  { withAttachments = true }: { withAttachments?: boolean } = {}
): { label: string; value: string | null }[] {
  const profile = me.student?.profile;
  // 켠 채널만 전달된다(가이드 2.6.3) — 카카오를 끄면 번호도 가지 않는다
  const phone = profile?.contact?.kakao_enabled ? profile.contact.phone : null;
  // 알림 이메일은 이제 고칠 수 있다(가이드 2.6.3) — 학교 이메일이 아니라 켠 주소
  const email = studentSharedEmailOf(me);

  const rows = [
    { label: "이름", value: me.name ?? null },
    { label: "학과", value: profile?.department.name ?? null },
    { label: "관심 분야", value: profile?.interests.join(LIST_SEPARATOR) || null },
    { label: "참여 활동", value: profile?.activities.join(LIST_SEPARATOR) || null },
    { label: "이메일", value: email || null },
    { label: "전화번호", value: phone ? formatPhone(phone) : null },
  ];
  if (!withAttachments) return rows;
  return [
    ...rows,
    { label: "이력서 / 포트폴리오", value: attachmentLabelsOf(profile?.attachments) },
  ];
}
