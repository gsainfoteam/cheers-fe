import type { Body } from "@/api";

/**
 * 프로필 폼의 형식 규칙. 가입(기본 정보 · 추가 정보)과 정보 수정이, 그리고
 * 학생과 선배가 **같은 규칙**을 써야 해서 한 곳에 둔다 — 한쪽만 고치면 가입
 * 때 막은 값이 수정에서 들어오거나 그 반대가 된다.
 *
 * 폼 스키마(zod)는 `features/profile/` 에 있고, 여기 있는 건 스키마와 화면이
 * 같이 쓰는 순수 함수다.
 */

/** 명세 `ContactRequestDto.phone` 의 `^01\d{8,9}$`. 저장은 숫자만 보낸다 */
export const PHONE = /^01\d{8,9}$/;
/** 브라우저의 `type="email"` 검사와 같은 수준. 나머지는 서버가 본다 */
export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function digitsOf(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** `01012345678` → `010-1234-5678`. 마이페이지 요약처럼 읽기만 하는 자리에 쓴다 */
export function formatPhone(digits: string): string {
  const d = digitsOf(digits);
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return d;
}

/**
 * 모바일 시안의 placeholder 가 `linkedin.com/in/…` 처럼 **스킴 없이** 적혀
 * 있어 사용자도 그렇게 칠 것이다. 명세는 `format: uri` 라 그대로 보내면
 * 400 이므로 스킴이 없으면 `https://` 를 붙인다.
 */
export function normalizeLink(link: string): string {
  const trimmed = link.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function isValidLink(link: string): boolean {
  try {
    const url = new URL(normalizeLink(link));
    return url.hostname.includes(".");
  } catch {
    return false;
  }
}

type GraduatedInfoRequest = Body<"/api/v1/user/graduated/info", "post">;

/**
 * 저장할 회사. 명세는 `company_id` 와 `company_name` 중 **하나만** 받는다.
 *
 * - 검색 결과에서 골랐으면 `company_id` — 표기가 갈리지 않는다
 * - 결과가 없어 친 이름 그대로 확정했으면 `company_name`. 서버가 이미 있는
 *   표기(대소문자 · 공백 무시)면 그 회사로 맞추고, 아니면 **그 이름으로
 *   가입만 된다** — 별칭으로 등록되지 않는다(백엔드와 확인, 2026-11-10)
 */
export function companyRequestOf(
  company: string,
  companyId: number | null
): Pick<GraduatedInfoRequest, "company_id" | "company_name"> {
  return companyId !== null
    ? { company_id: companyId }
    : { company_name: company.trim() };
}

type ContactRequest = Body<"/api/v1/user/graduated/info", "post">["contact"];

/**
 * 저장할 연락 설정.
 *
 * 임시: 이슈 #26 — 이메일·휴대폰 둘 다 필수, 둘 다 켠다. 시안의 "공유할
 * 이메일 / 알림 받을 휴대폰" 을 `email_enabled` · `kakao_enabled` 에 어떻게
 * 매핑할지 답이 오기 전까지의 결정이다. 답이 나오면 이 함수와 화면의
 * `(선택)` 을 함께 고친다.
 */
export function contactRequestOf(email: string, phone: string): ContactRequest {
  return {
    email_enabled: true,
    kakao_enabled: true,
    email: email.trim(),
    phone: digitsOf(phone),
  };
}
