import { describe, expect, test } from "bun:test";
import {
  addCustomInterest,
  customInterestsOf,
  removeInterest,
  renameCustomInterest,
  INTEREST_MAX,
} from "../src/features/profile/interests";

const OPTIONS = ["기획", "IT/개발", "디자인"];

describe("customInterestsOf — 서버 목록에 없는 값이 사용자 칩 (가이드 2.5.3)", () => {
  test("넣은 순서를 지킨다", () => {
    expect(customInterestsOf(["경영", "기획", "법무"], OPTIONS)).toEqual(["경영", "법무"]);
  });
});

describe("addCustomInterest", () => {
  test("새 값은 뒤에 붙는다(앞뒤 공백 제거)", () => {
    expect(addCustomInterest(["기획"], "  경영 ")).toEqual({ ok: true, values: ["기획", "경영"] });
  });
  test("빈 값은 거부(문구 없이)", () => {
    expect(addCustomInterest([], "   ")).toEqual({ ok: false, error: undefined });
  });
  test("이미 있는 값은 중복 오류", () => {
    expect(addCustomInterest(["경영"], "경영")).toEqual({ ok: false, error: "이미 추가된 분야예요." });
    expect(addCustomInterest(["기획"], "기획")).toEqual({ ok: false, error: "이미 추가된 분야예요." });
  });
  test("고정 칩과 같은 이름이면 그 칩을 선택한다", () => {
    expect(addCustomInterest([], "디자인")).toEqual({ ok: true, values: ["디자인"] });
  });
  test("50자 초과 거부", () => {
    expect(addCustomInterest([], "가".repeat(51)).ok).toBe(false);
  });
  test("20개가 차면 거부", () => {
    const full = Array.from({ length: INTEREST_MAX }, (_, i) => `분야${i}`);
    expect(addCustomInterest(full, "하나 더")).toEqual({ ok: false, error: "20개까지 고를 수 있어요." });
  });
});

describe("renameCustomInterest", () => {
  test("자리를 지키며 이름만 바꾼다", () => {
    expect(renameCustomInterest(["경영", "기획", "법무"], OPTIONS, "경영", "마케팅")).toEqual({ ok: true, values: ["마케팅", "기획", "법무"] });
  });
  test("같은 이름이면 그대로", () => {
    expect(renameCustomInterest(["경영"], OPTIONS, "경영", " 경영 ")).toEqual({ ok: true, values: ["경영"] });
  });
  test("다른 값과 겹치면 오류", () => {
    expect(renameCustomInterest(["경영", "법무"], OPTIONS, "경영", "법무")).toEqual({ ok: false, error: "이미 추가된 분야예요." });
  });
  test("고정 칩 이름으로 바꾸면 사용자 칩을 지우고 고정 칩을 선택", () => {
    expect(renameCustomInterest(["경영"], OPTIONS, "경영", "기획")).toEqual({ ok: true, values: ["기획"] });
  });
  test("빈 값은 거부", () => {
    expect(renameCustomInterest(["경영"], OPTIONS, "경영", "").ok).toBe(false);
  });
});

test("removeInterest", () => {
  expect(removeInterest(["경영", "기획"], "경영")).toEqual(["기획"]);
});
