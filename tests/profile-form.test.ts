import { describe, expect, test } from "bun:test";
import { normalizeKoreanMobilePhone } from "@/lib/profile-form";

describe("normalizeKoreanMobilePhone — Chrome +82 자동 완성", () => {
  test.each([
    ["+82 10 1234 5678", "010-1234-5678"],
    ["+82-10-1234-5678", "010-1234-5678"],
    ["+821012345678", "010-1234-5678"],
    ["+82 010 1234 5678", "010-1234-5678"],
  ])("%s 를 국내 형식으로 변환", (input, expected) => {
    expect(normalizeKoreanMobilePhone(input)).toBe(expected);
  });

  test.each(["010-1234-5678", "+1 415 555 0123", "+82 2 1234 5678"])("%s 는 지원 범위 밖이라 그대로 둠", (input) => {
    expect(normalizeKoreanMobilePhone(input)).toBe(input);
  });
});
