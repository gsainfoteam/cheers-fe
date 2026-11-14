import { describe, expect, test } from "bun:test";
import { isSchoolEmail } from "../src/lib/school-email";
import { formatWait } from "../src/lib/countdown";

describe("isSchoolEmail — 허용 도메인 gist.ac.kr (하위 도메인 포함, 가이드 D2-4)", () => {
  test.each([
    "gildong@gm.gist.ac.kr",
    "staff@gist.ac.kr",
    "  Upper@GM.GIST.AC.KR  ",
  ])("통과: %s", (value) => expect(isSchoolEmail(value)).toBe(true));

  test.each([
    "naver@naver.com",
    "abc",
    "",
    "a@gist.ac.kr.evil.com",
    "a@notgist.ac.kr",
    "a+1@gm.gist.ac.kr", // 서버가 plus 주소를 400 으로 막는다
    "a b@gist.ac.kr",
    "@gm.gist.ac.kr",
  ])("거부: %s", (value) => expect(isSchoolEmail(value)).toBe(false));
});

describe("formatWait — 429 대기 표기 (가이드 2.4.3)", () => {
  test("1시간 미만은 mm:ss", () => {
    expect(formatWait(0)).toBe("00:00");
    expect(formatWait(65)).toBe("01:05");
    expect(formatWait(3599)).toBe("59:59");
  });
  test("1시간 이상은 n시간 m분", () => {
    expect(formatWait(3600)).toBe("1시간 0분");
    expect(formatWait(7500)).toBe("2시간 5분");
  });
});
