import { z } from "zod";
import type { Body, StudentAttachment, UserInfo } from "@/api";
import { PHONE, digitsOf } from "@/lib/profile-form";

/**
 * 학생 프로필 폼 — 가입 기본 정보 · 추가 정보와 정보 수정이 같은 스키마를
 * 나눠 쓴다(이슈 #10). 화면은 이 스키마로 `useForm` 을 세우고
 * `student-fields.tsx` 의 칸 묶음을 `FormProvider` 안에 늘어놓기만 한다.
 *
 * 규칙의 근거는 명세 `SaveStudentInfoRequestDto` 다 — 관심 분야 1~20개,
 * 활동 최대 20개 · 각 50자 · 중복 불가, 재학생은 연락 방법 "둘 다 끔" 이 400.
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
      .array(z.string())
      .min(1, "하나 이상 선택해 주세요.")
      .max(20, "20개까지 고를 수 있어요."),
  });
}

/** 폼이 들고 있는 값(입력 타입). 학과는 고르기 전까지 null 이다 */
export type StudentBasicsValues = z.input<ReturnType<typeof studentBasicsSchema>>;

/* ───────────────── 추가 정보 ───────────────── */

/**
 * 활동은 `{ value }` 묶음의 배열이다 — `useFieldArray` 가 원시값 배열을 다루지
 * 못한다. 보낼 때 `activitiesOf` 로 풀어 빈 줄과 중복을 거른다.
 */
const extraShape = {
  activities: z
    .array(z.object({ value: z.string().max(50, "50자까지 쓸 수 있어요.") }))
    .max(20),
  /**
   * 시안은 이력서와 포트폴리오를 **한 칸**으로 받는다. 학생 화면은 처음부터
   * `https://` 로 시작하는 주소만 받았다 — 선배 LinkedIn 처럼 스킴을 붙여
   * 주지 않는 이유는 도움말이 그렇게 안내하기 때문이다.
   */
  portfolioUrl: z
    .string()
    .trim()
    .max(2048)
    .refine(
      (url) => url === "" || url.startsWith("https://"),
      "https:// 로 시작하는 주소만 저장할 수 있어요."
    ),
  emailEnabled: z.boolean(),
  kakaoEnabled: z.boolean(),
  phone: z.string(),
};

type ContactFields = {
  emailEnabled: boolean;
  kakaoEnabled: boolean;
  phone: string;
};

/**
 * 연락 설정 규칙. 객체 하나에 걸린 규칙이라 칸 단위 스키마가 아니라 여기서
 * 따로 건다 — 기본 정보와 합친 정보 수정 스키마에도 그대로 붙인다.
 */
function contactRules<T extends ContactFields>(values: T, ctx: z.RefinementCtx) {
  // 재학생은 둘 다 끄는 선택("희망하지 않음")이 허용되지 않는다 — 명세 400
  if (!values.emailEnabled && !values.kakaoEnabled) {
    ctx.addIssue({
      code: "custom",
      path: ["emailEnabled"],
      message: "연락 방법을 하나 이상 선택해 주세요.",
    });
  }
  if (values.kakaoEnabled && !PHONE.test(digitsOf(values.phone))) {
    ctx.addIssue({
      code: "custom",
      path: ["phone"],
      message: "숫자만 10~11자리로 입력해 주세요.",
    });
  }
}

export const studentExtraSchema = z.object(extraShape).superRefine(contactRules);

export type StudentExtraValues = z.input<typeof studentExtraSchema>;

/* ───────────────── 정보 수정 ───────────────── */

/**
 * 정보 수정은 기본 정보와 추가 정보를 **한 화면**에서 고친다. 이름은 가입
 * 뒤로 바뀌지 않으므로 검사하지 않는다(`nameRequired = false`).
 */
export const studentEditSchema = studentBasicsSchema(false)
  .extend(extraShape)
  .superRefine(contactRules);

export type StudentEditValues = z.input<typeof studentEditSchema>;

/** 정보 수정 폼의 처음 값 — 지금 내 정보 그대로 */
export function studentEditDefaults(me: UserInfo): StudentEditValues {
  const profile = me.student?.profile;
  const link = profile?.attachments.find((a) => a.source === "link");
  return {
    name: me.name ?? "",
    departmentId: profile?.department.id ?? null,
    interests: profile?.interests ?? [],
    // 시안에 칸이 하나 그려져 있다 — 비어 있어도 한 줄은 보여준다
    activities: profile?.activities.length
      ? profile.activities.map((value) => ({ value }))
      : [{ value: "" }],
    portfolioUrl: link?.url ?? "",
    emailEnabled: profile?.contact?.email_enabled ?? true,
    kakaoEnabled: profile?.contact?.kakao_enabled ?? false,
    phone: profile?.contact?.phone ?? "",
  };
}

/* ───────────────── 저장 본문 ───────────────── */

type StudentInfoBody = Body<"/api/v1/user/student/info", "post">;

/** 빈 줄을 버리고, 같은 값이 두 번 들어가면 하나로 — `uniqueItems` 라 400 이다 */
export function activitiesOf(rows: { value: string }[]): string[] {
  return [...new Set(rows.map((row) => row.value.trim()).filter(Boolean))];
}

/**
 * 저장할 첨부. **전체 교체 방식**이라 이 화면에 보이지 않는 첨부도 다시
 * 보내야 지워지지 않는다.
 *
 * - 링크 칸 하나는 `portfolio` / `link` 로 보낸다.
 * - 파일 첨부(가입 뒤 올린 이력서 등)는 화면에 칸이 없지만 내 정보가 준
 *   `key` · `file_name` 그대로 돌려보낸다(명세: 기존 파일 유지).
 */
export function attachmentsOf(
  portfolioUrl: string,
  existing: StudentAttachment[] = []
): NonNullable<StudentInfoBody["attachments"]> {
  const files = existing
    .filter((a) => a.source === "file" && a.key && a.file_name)
    .map((a) => ({
      kind: a.kind,
      source: "file" as const,
      key: a.key!,
      file_name: a.file_name!,
    }));
  const link = portfolioUrl.trim();
  return [
    ...(link ? [{ kind: "portfolio" as const, source: "link" as const, url: link }] : []),
    ...files,
  ];
}

/** 연락 설정. 빈 문자열은 400 이라 값이 없으면 키를 뺀다 */
export function studentContactOf(
  values: ContactFields,
  contactEmail: string
): StudentInfoBody["contact"] {
  const phone = digitsOf(values.phone);
  return {
    email_enabled: values.emailEnabled,
    kakao_enabled: values.kakaoEnabled,
    ...(values.emailEnabled && contactEmail ? { email: contactEmail } : {}),
    ...(values.kakaoEnabled && phone ? { phone } : {}),
  };
}

/**
 * 연락받을 이메일. 시안의 읽기 전용 이메일 칸에 인증을 마친 학교 이메일이
 * 선다 — 가입 추가 정보와 정보 수정, 마이페이지가 같은 값을 보여줘야 한다.
 */
export function studentContactEmailOf(me: UserInfo): string {
  return me.student?.email ?? me.email ?? "";
}
