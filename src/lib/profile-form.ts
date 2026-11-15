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

/**
 * **다른 회원이 넣은** 링크를 `href` 에 넣기 전에 거른다. `http(s)` 가
 * 아니면 `null` — `javascript:` 같은 스킴을 막는다. 저장할 때 `normalizeLink`
 * 가 스킴을 붙이지만 그 경로를 거치지 않은 값이 있을 수 있어 화면에서도 본다.
 */
export function httpUrlOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed && /^https?:\/\//i.test(trimmed) ? trimmed : null;
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

/**
 * 저장할 부서. 선택 입력이라 **비었으면 키를 보내지 않는다** — 명세
 * `department`: *"선택 입력, 안 보내거나 빈 값이면 null 로 저장"*(이슈 #43).
 * 저장이 전체 교체라 정보 수정에서 지우면 그대로 null 이 된다.
 */
export function departmentRequestOf(
  department: string
): Pick<GraduatedInfoRequest, "department"> {
  const trimmed = department.trim();
  return trimmed ? { department: trimmed } : {};
}

type ContactRequest = Body<"/api/v1/user/graduated/info", "post">["contact"];

/**
 * 연락 채널 폼 값 — 피그마 `커피챗 참여 설정`(1159:10067)의 체크박스 둘과
 * 채널별 입력 칸. 체크박스가 곧 명세의 `kakao_enabled` · `email_enabled` 다
 * (동기화 가이드 3.5.3).
 *
 * `email` 은 켜짐 여부(boolean)이고 주소는 `emailAddress` 다 — 명세의
 * `email`(주소)과 이름이 겹쳐서 헷갈리지 않게 폼에서는 묶어서 다룬다.
 */
export type ContactChannels = {
  kakao: boolean;
  email: boolean;
  /** 사용자가 친 그대로(하이픈 포함 가능). 보낼 때 숫자만 남긴다 */
  phone: string;
  emailAddress: string;
};

/**
 * 연락 설정의 처음 값.
 *
 * - 저장된 설정이 있으면 그대로(정보 수정, 명함 재인증 선배)
 * - 없으면 **두 채널 모두 켬** — 시안 주석 *"진입 시 기본적으로 check
 *   되어있게 … 커피챗 참여 유도"*. 이메일은 계정 이메일로 미리 채운다
 *   (동기화 가이드 D3-6)
 */
export function contactChannelsOf(
  saved: {
    kakao_enabled: boolean;
    email_enabled: boolean;
    phone: string | null;
    email: string | null;
  } | null,
  fallbackEmail: string | null
): ContactChannels {
  if (!saved) {
    return { kakao: true, email: true, phone: "", emailAddress: fallbackEmail ?? "" };
  }
  return {
    kakao: saved.kakao_enabled,
    email: saved.email_enabled,
    phone: formatPhone(saved.phone ?? ""),
    emailAddress: saved.email ?? fallbackEmail ?? "",
  };
}

/**
 * 저장할 연락 설정.
 *
 * **끈 채널의 값은 보내지 않는다(`null`).** 선배가 입력한 연락처는 알림용이자
 * 학생에게 공유하는 값이라(동기화 가이드 D3-3), 끈 채널의 값을 남겨 두면 쓰지
 * 않겠다고 한 연락처가 공유될 수 있다. 빈 문자열은 400 이므로 보내지 않는다.
 */
export function contactRequestFrom(channels: ContactChannels): ContactRequest {
  const phone = digitsOf(channels.phone);
  const email = channels.emailAddress.trim();
  return {
    kakao_enabled: channels.kakao,
    email_enabled: channels.email,
    phone: channels.kakao && phone ? phone : null,
    email: channels.email && email ? email : null,
  };
}
