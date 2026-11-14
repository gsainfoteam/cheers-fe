import { z } from "zod";
import type { Body, StudentAttachment, UserInfo } from "@/api";
import { contactChannelsSchema } from "@/features/profile/contact-channel-form";
import { INTEREST_MAX, INTEREST_MAX_LENGTH } from "@/features/profile/interests";
import { contactChannelsOf, type ContactChannels } from "@/lib/profile-form";

/**
 * 학생 프로필 폼 — 가입 기본 정보 · 추가 정보와 정보 수정이 같은 스키마를
 * 나눠 쓴다(이슈 #10). 화면은 이 스키마로 `useForm` 을 세우고
 * `student-fields.tsx` 의 칸 묶음을 `FormProvider` 안에 늘어놓기만 한다.
 *
 * 규칙의 근거는 명세 `SaveStudentInfoRequestDto` 와 동기화 가이드 02장이다.
 * - 관심 분야 1~20개 · 각 50자 · 중복 불가. 목록에 없는 값(기타)도 받는다(D2-3)
 * - 활동 최대 20개 · 각 50자 · 중복 불가
 * - 첨부는 화면에서 3개까지(시안 `pdf 파일을 최대 3개`, 명세 상한은 10)
 * - 연락 수단은 하나 이상 필수(D2-2) — 명세도 재학생의 "둘 다 끔" 을 400 으로 막는다
 */

/* ───────────────── 기본 정보 ───────────────── */

/**
 * `nameRequired` — 내 정보에 이름이 없을 때(첫 저장)만 이름을 받는다. 있으면
 * 고칠 수 없는 칸이라 검사하지 않는다(명세: 있으면 무시).
 */
export function studentBasicsSchema(nameRequired: boolean) {
  return z.object({
    name: nameRequired
      ? z.string().trim().min(1, "이름을 입력해 주세요.").max(64)
      : z.string(),
    departmentId: z
      .number()
      .nullable()
      .refine((id) => id !== null, "학과를 선택해 주세요."),
    interests: z
      .array(z.string().trim().min(1).max(INTEREST_MAX_LENGTH))
      .min(1, "하나 이상 선택해 주세요.")
      .max(INTEREST_MAX, `${INTEREST_MAX}개까지 고를 수 있어요.`),
  });
}

/** 폼이 들고 있는 값(입력 타입). 학과는 고르기 전까지 null 이다 */
export type StudentBasicsValues = z.input<ReturnType<typeof studentBasicsSchema>>;

/* ───────────────── 첨부 ───────────────── */

/** 시안 `pdf 파일을 최대 3개 첨부할 수 있어요.` */
export const ATTACHMENT_MAX = 3;

/**
 * 폼이 들고 있는 첨부 하나.
 *
 * - `file`: 올린 파일. `key` 가 명세에 보낼 값이고 `href` 는 화면에서 여는
 *   주소다(새로 올린 파일은 로컬 blob URL, 저장된 파일은 presigned URL).
 * - `link`: 링크 첨부. 새로 넣는 칸은 없어졌지만(가이드 2.6.2) 예전에 저장한
 *   링크는 지워지지 않게 그대로 들고 다닌다.
 */
export type StudentAttachmentValue =
  | {
      kind: "cv" | "portfolio";
      source: "file";
      key: string;
      fileName: string;
      href?: string;
    }
  | { kind: "cv" | "portfolio"; source: "link"; url: string };

const attachmentSchema = z.discriminatedUnion("source", [
  z.object({
    kind: z.enum(["cv", "portfolio"]),
    source: z.literal("file"),
    key: z.string().min(1),
    fileName: z.string().min(1),
    href: z.string().optional(),
  }),
  z.object({
    kind: z.enum(["cv", "portfolio"]),
    source: z.literal("link"),
    url: z.string().min(1),
  }),
]);

/**
 * 내 정보의 첨부 → 폼 값. `key` 가 없는 파일은 다시 보낼 방법이 없어 버린다
 * (명세: 기존 파일을 지키려면 내 정보가 준 `key` 를 그대로 보낸다).
 */
export function attachmentValuesOf(
  attachments: StudentAttachment[] = []
): StudentAttachmentValue[] {
  return attachments.flatMap((a): StudentAttachmentValue[] => {
    if (a.source === "link") return [{ kind: a.kind, source: "link", url: a.url }];
    if (!a.key) return [];
    return [
      {
        kind: a.kind,
        source: "file",
        key: a.key,
        fileName: a.file_name ?? "첨부 파일",
        href: a.url,
      },
    ];
  });
}

type StudentInfoBody = Body<"/api/v1/user/student/info", "post">;

/**
 * 폼 값 → 저장할 첨부. **전체 교체 방식**이라 화면의 목록이 곧 저장될 목록이다.
 * 링크는 `url` 만, 파일은 `key` · `file_name` 만 보낸다(섞으면 400).
 */
export function attachmentRequestsOf(
  values: StudentAttachmentValue[]
): NonNullable<StudentInfoBody["attachments"]> {
  return values.map((a) =>
    a.source === "file"
      ? { kind: a.kind, source: "file" as const, key: a.key, file_name: a.fileName }
      : { kind: a.kind, source: "link" as const, url: a.url }
  );
}

/* ───────────────── 연락(알림) 설정 ───────────────── */

/**
 * 채널별 형식 검사(`contactChannelsSchema`, 선배와 같은 규칙) + **하나 이상**.
 * 오류는 `kakao` 자리에 건다 — 화면은 두 체크박스가 모두 꺼졌을 때 체크박스
 * 아래에 문구를 띄운다(`ContactChannelFields` 의 `requireOne`).
 */
export const studentContactSchema = contactChannelsSchema.superRefine((value, ctx) => {
  if (!value.kakao && !value.email) {
    ctx.addIssue({
      code: "custom",
      path: ["kakao"],
      message: "연락 방법을 하나 이상 선택해 주세요.",
    });
  }
});

/**
 * 연락 설정의 처음 값(가이드 2.6.3).
 *
 * - 저장된 설정이 있으면 그대로(정보 수정). 주소가 비어 있으면 인증한 메일
 * - 없으면(가입) **이메일만 켜고 인증할 때 쓴 학교 이메일을 채운다.** 아무것도
 *   건드리지 않아도 `가입 완료` 를 누를 수 있다. 선배(두 채널 모두 켬)와 다르다
 */
export function studentContactDefaults(
  saved: Parameters<typeof contactChannelsOf>[0],
  verifiedEmail: string
): ContactChannels {
  if (!saved) {
    return { kakao: false, email: true, phone: "", emailAddress: verifiedEmail };
  }
  return contactChannelsOf(saved, verifiedEmail);
}

/**
 * 인증을 마친 학교 이메일. 알림 이메일 칸의 처음 값이다.
 */
export function studentContactEmailOf(me: UserInfo): string {
  return me.student?.email ?? me.email ?? "";
}

/**
 * 선배에게 전달되는 이메일 — 알림 설정에서 이메일을 켰을 때의 주소(명세
 * `RequestStudentDto.email`: 끄면 null). 칸을 고칠 수 있게 되면서(가이드
 * 2.6.3) 학교 이메일과 다를 수 있다. 연락 설정이 아직 없으면 인증한 메일.
 */
export function studentSharedEmailOf(me: UserInfo): string | null {
  const contact = me.student?.profile?.contact;
  if (!contact) return studentContactEmailOf(me) || null;
  if (!contact.email_enabled) return null;
  return contact.email ?? (studentContactEmailOf(me) || null);
}

/* ───────────────── 추가 정보 ───────────────── */

const extraShape = {
  /** 값에는 `#` 이 없다. 화면에만 붙인다(`TagInput`) */
  activities: z.array(z.string().max(50, "50자까지 쓸 수 있어요.")).max(20),
  attachments: z.array(attachmentSchema).max(ATTACHMENT_MAX),
  contact: studentContactSchema,
};

export const studentExtraSchema = z.object(extraShape);

export type StudentExtraValues = z.input<typeof studentExtraSchema>;

/* ───────────────── 정보 수정 ───────────────── */

/**
 * 정보 수정은 기본 정보와 추가 정보를 **한 화면**에서 고친다. 이름은 가입
 * 뒤로 바뀌지 않으므로 검사하지 않는다(`nameRequired = false`).
 */
export const studentEditSchema = studentBasicsSchema(false).extend(extraShape);

export type StudentEditValues = z.input<typeof studentEditSchema>;

/** 정보 수정 폼의 처음 값 — 지금 내 정보 그대로 */
export function studentEditDefaults(me: UserInfo): StudentEditValues {
  const profile = me.student?.profile;
  return {
    name: me.name ?? "",
    departmentId: profile?.department.id ?? null,
    interests: profile?.interests ?? [],
    activities: profile?.activities ?? [],
    attachments: attachmentValuesOf(profile?.attachments),
    contact: studentContactDefaults(profile?.contact ?? null, studentContactEmailOf(me)),
  };
}

/* ───────────────── 저장 본문 ───────────────── */

/** 빈 값을 버리고, 같은 값이 두 번 들어가면 하나로 — `uniqueItems` 라 400 이다 */
export function activitiesOf(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
