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

/**
 * 회사 목록. **목록·검색 API 가 아직 없다**(선배 가이드 §2.4a, §7 #2).
 *
 * 그동안은 비워 둔다 — 모든 검색이 `등록 정보가 없습니다.` → `+ {검색어}
 * 등록하기` 로 떨어지고, 그 버튼이 검색어를 `company` 로 확정한다. 명세의
 * `company` 가 자유 문자열이라 저장도 그대로 성립한다. API 가 생기면 이
 * 함수만 바꾸면 된다(별칭·자모 검색은 서버가 하는 쪽이 낫다).
 */
export function searchCompanies(query: string): string[] {
  void query;
  return [];
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
