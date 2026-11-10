import type { EmployeeBadgeData } from "./employee-badge";

/**
 * 사원증에 넣을 값. 선배 둘러보기(`CheersCardDto`)와 마이페이지 · 공개 사원증
 * 미리보기(`GraduatedProfileDto`)가 **같은 함수**로 만든다 — 필요한 필드가
 * 같고, `#` 을 붙이는 규칙이 두 벌이 되면 "다른 회원에게 보이는 사원증" 과
 * 실제 목록의 사원증이 어긋난다.
 *
 * 컴포넌트 파일에 두지 않은 이유: Fast Refresh 는 컴포넌트만 내보내는 파일만
 * 다시 그릴 수 있다(lint `react-refresh/only-export-components`).
 */
type BadgeSource = {
  company: string;
  /**
   * `CheersCardDto` 에만 있다. `GraduatedProfileDto` 에는 로고가 없어
   * 마이페이지 · 미리보기 사원증은 회사 이름만 선다
   */
  company_logo_url?: string | null;
  nickname: string;
  job: string;
  hashtags: string[];
};

export function badgeDataOf(source: BadgeSource): EmployeeBadgeData {
  return {
    companyLogo: source.company_logo_url ?? undefined,
    company: source.company,
    nickname: source.nickname,
    role: source.job,
    // 사원증 안에서는 꼬리표 사이를 두 칸 띄운다(시안 `#전기전자  #3년차`)
    meta: hashtagText(source.hashtags, "  "),
  };
}

/**
 * 해시태그를 `#` 붙여 한 줄로. 저장된 값에는 `#` 이 없다(명세 `^[^#]+$`) —
 * 예전 데이터에 붙어 있어도 두 번 붙지 않게 한다.
 */
export function hashtagText(tags: string[], separator = " "): string {
  return tags.map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)).join(separator);
}
