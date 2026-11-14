/**
 * 관심 분야 — 고정 칩(서버 목록) + 학생이 직접 넣는 `기타` 값. 동기화 가이드
 * 02장 2.5.3.
 *
 * **값은 `string[]` 하나다.** 서버(`SaveStudentInfoRequestDto.interests`)가
 * 50자 이내 문자열이면 목록에 없는 값도 받아 그 학생 프로필에만 저장한다
 * (가이드 D2-3, 공통 목록에는 안 들어간다). 그래서 사용자 값을 따로 들고
 * 다니지 않고, 목록에 없는 값을 사용자 칩으로 **파생**한다.
 *
 * 개수(1~20) · 중복 금지는 고정과 사용자 값을 **합친** 배열에 걸린다(명세
 * `minItems 1, maxItems 20, uniqueItems`).
 */

export const INTEREST_MAX = 20;
export const INTEREST_MAX_LENGTH = 50;

const DUPLICATE = "이미 추가된 분야예요.";
const FULL = `${INTEREST_MAX}개까지 고를 수 있어요.`;
const TOO_LONG = `${INTEREST_MAX_LENGTH}자까지 쓸 수 있어요.`;

export type InterestEdit =
  | { ok: true; values: string[] }
  /** `error` 가 없으면 문구 없이 막는다(빈 값 — 버튼이 이미 꺼져 있다) */
  | { ok: false; error: string | undefined };

/** 사용자 칩으로 그릴 값. 넣은 순서를 지킨다 */
export function customInterestsOf(values: string[], options: string[]): string[] {
  return values.filter((value) => !options.includes(value));
}

function check(name: string): string | undefined | null {
  if (!name) return undefined;
  if (name.length > INTEREST_MAX_LENGTH) return TOO_LONG;
  return null;
}

/**
 * `기타 관심 분야 추가` 모달의 `추가`.
 *
 * 고정 칩과 같은 이름을 치면 새 칩을 만들지 않고 **그 고정 칩을 선택한다** —
 * 같은 분야가 두 모양으로 서지 않게. 값이 목록에 있으면 고정 칩으로 그려지므로
 * 배열에 넣기만 하면 된다.
 */
export function addCustomInterest(values: string[], input: string): InterestEdit {
  const name = input.trim();
  const invalid = check(name);
  if (invalid !== null) return { ok: false, error: invalid };
  if (values.includes(name)) return { ok: false, error: DUPLICATE };
  if (values.length >= INTEREST_MAX) return { ok: false, error: FULL };
  return { ok: true, values: [...values, name] };
}

/**
 * 수정 팝업의 `변경`. 사용자 칩의 **자리를 지키며** 이름만 바꾼다.
 * 고정 칩 이름으로 바꾸면 사용자 칩을 지우고 그 고정 칩을 선택한다.
 */
export function renameCustomInterest(
  values: string[],
  options: string[],
  from: string,
  input: string
): InterestEdit {
  const name = input.trim();
  const invalid = check(name);
  if (invalid !== null) return { ok: false, error: invalid };
  if (name === from) return { ok: true, values };
  if (values.includes(name)) return { ok: false, error: DUPLICATE };
  if (options.includes(name)) {
    return { ok: true, values: [...values.filter((v) => v !== from), name] };
  }
  return { ok: true, values: values.map((v) => (v === from ? name : v)) };
}

/** 수정 팝업의 `삭제` */
export function removeInterest(values: string[], name: string): string[] {
  return values.filter((v) => v !== name);
}
