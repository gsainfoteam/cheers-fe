import { describe, expect, test } from "bun:test";
import {
  attachmentRequestsOf,
  attachmentValuesOf,
  studentContactDefaults,
  studentContactSchema,
  ATTACHMENT_MAX,
} from "@/features/profile/student-form";

describe("studentContactSchema — 연락 수단 하나 이상 필수 (가이드 D2-2)", () => {
  const base = { kakao: false, email: false, phone: "", emailAddress: "" };
  test("둘 다 끄면 실패", () => {
    expect(studentContactSchema.safeParse(base).success).toBe(false);
  });
  test("이메일만 켜고 주소가 맞으면 통과", () => {
    expect(studentContactSchema.safeParse({ ...base, email: true, emailAddress: "a@gm.gist.ac.kr" }).success).toBe(true);
  });
  test("이메일을 켰는데 형식이 틀리면 실패", () => {
    expect(studentContactSchema.safeParse({ ...base, email: true, emailAddress: "abc" }).success).toBe(false);
  });
  test("알림톡을 켰는데 번호가 없으면 실패", () => {
    expect(studentContactSchema.safeParse({ ...base, kakao: true }).success).toBe(false);
  });
});

describe("studentContactDefaults — 처음엔 이메일 체크 + 인증한 메일 (가이드 2.6.3)", () => {
  test("저장된 값이 없으면 이메일만 켬", () => {
    expect(studentContactDefaults(null, "me@gm.gist.ac.kr")).toEqual({
      kakao: false,
      email: true,
      phone: "",
      emailAddress: "me@gm.gist.ac.kr",
    });
  });
  test("저장된 값이 있으면 그대로, 주소가 없으면 인증한 메일", () => {
    expect(
      studentContactDefaults(
        { kakao_enabled: true, email_enabled: false, phone: "01012345678", email: null },
        "me@gm.gist.ac.kr"
      )
    ).toEqual({ kakao: true, email: false, phone: "010-1234-5678", emailAddress: "me@gm.gist.ac.kr" });
  });
});

describe("첨부 — 폼 값 ↔ 명세 (가이드 2.6.2)", () => {
  test("최대 3개", () => expect(ATTACHMENT_MAX).toBe(3));

  test("내 정보의 첨부를 폼 값으로 — key 없는 파일은 지킬 수 없어 버린다", () => {
    expect(
      attachmentValuesOf([
        { kind: "cv", source: "file", key: "k1", url: "https://s3/x", file_name: "이력서.pdf" },
        { kind: "portfolio", source: "link", key: null, url: "https://me.dev", file_name: null },
        { kind: "portfolio", source: "file", key: null, url: "https://s3/y", file_name: "고아.pdf" },
      ])
    ).toEqual([
      { kind: "cv", source: "file", key: "k1", fileName: "이력서.pdf", href: "https://s3/x" },
      { kind: "portfolio", source: "link", url: "https://me.dev" },
    ]);
  });

  test("폼 값을 요청 본문으로 — 링크는 url 만, 파일은 key·file_name 만", () => {
    expect(
      attachmentRequestsOf([
        { kind: "portfolio", source: "file", key: "k2", fileName: "포트폴리오.pdf", href: "blob:x" },
        { kind: "portfolio", source: "link", url: "https://me.dev" },
      ])
    ).toEqual([
      { kind: "portfolio", source: "file", key: "k2", file_name: "포트폴리오.pdf" },
      { kind: "portfolio", source: "link", url: "https://me.dev" },
    ]);
  });
});
