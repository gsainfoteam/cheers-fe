/**
 * 선배 닉네임 형식. 명세 `GraduatedInfoRequestDto.nickname` 의
 * `^[가-힣A-Za-z0-9_]{2,10}$` 과 시안 메모(960:10011) *"가-힣, A-Z, a-z,
 * 0-9, _ 만 사용 가능 / 2~10자 길이 제한"* 이 같은 규칙이다.
 */
export const NICKNAME = /^[가-힣A-Za-z0-9_]{2,10}$/;

/**
 * 걸린 이유 하나. 패턴 하나로는 "무엇이 틀렸는지" 를 말할 수 없어서 순서대로
 * 검사하고 처음 걸린 것만 돌려준다 — 공백 → 그 밖의 허용 밖 글자 → 길이.
 *
 * `composing` 은 조합 중인 한글 자모(ㅂ, ㅏ …)가 걸린 경우다. 한글을 치는
 * 도중에는 값에 자모가 섞이는 게 정상이라, 쓰는 쪽은 이 이유를 칸을 떠난
 * 뒤에만 보여준다.
 */
export type NicknameProblem = "space" | "symbol" | "composing" | "length";

export function nicknameProblem(value: string): NicknameProblem | undefined {
  if (/\s/.test(value)) return "space";
  // 자모만 따로 걸러 낸다. 그 밖의 허용 밖 글자는 특수문자로 묶는다
  const disallowed = value.replace(/[가-힣A-Za-z0-9_]/g, "");
  if (disallowed && /^[ㄱ-ㅎㅏ-ㅣ]+$/.test(disallowed)) return "composing";
  if (disallowed) return "symbol";
  if (value.length < 2 || value.length > 10) return "length";
  return undefined;
}

/**
 * 시안 문구 `닉네임에 {공백}을 사용할 수 없어요.` 의 `{공백}` 은 자리표시다.
 * 받침에 따라 조사가 바뀌므로(`공백을` / `특수문자를`) 조사까지 같이 넣는다.
 *
 * 길이·자모 문구는 시안에 없다 — 디자이너 확인 필요(선배 가이드 §7 #3).
 */
export function describeNicknameProblem(problem: NicknameProblem): string {
  switch (problem) {
    case "space":
      return "닉네임에 공백을 사용할 수 없어요.";
    case "symbol":
      return "닉네임에 특수문자를 사용할 수 없어요.";
    case "composing":
      return "닉네임에 자음·모음만 따로 사용할 수 없어요.";
    case "length":
      return "닉네임은 2~10자로 입력해 주세요.";
  }
}
