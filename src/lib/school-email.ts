/**
 * 학교 이메일 검사. 동기화 가이드 02장 2.3.2 / D2-4.
 *
 * **허용 도메인은 `gist.ac.kr` 이고 하위 도메인도 받는다** — 학생 메일
 * `@gm.gist.ac.kr` 이 시안 placeholder 이자 실제로 가장 많이 쓰이는 주소다.
 *
 * 화면에서는 일부러 **덜 막는다.** 서버의 허용 목록은 superadmin 이 바꾸는
 * 값이라(`PUT /manager/v1/school/{schoolPk}/email-domain`) 여기 적은 규칙과
 * 어긋날 수 있다. 최종 판단은 서버의 400 이고, 이 검사는 버튼을 미리 끄고
 * 문구를 일찍 띄우기 위한 것이다.
 *
 * `+` 주소는 서버가 400 으로 막으므로(`SendCodeRequestDto.email` 의
 * `^[^+]+@`) 여기서도 거른다.
 */
const SCHOOL_EMAIL = /^[^\s@+]+@([a-z0-9-]+\.)*gist\.ac\.kr$/;

/** 보내기 전에 정리한 값. 서버도 소문자로 정규화해 저장한다 */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isSchoolEmail(value: string): boolean {
  return SCHOOL_EMAIL.test(normalizeEmail(value));
}
