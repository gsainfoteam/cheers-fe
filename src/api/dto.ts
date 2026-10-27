import { z } from "zod";

/**
 * 응답 DTO의 단일 출처.
 *
 * 백엔드가 OpenAPI 를 내보내지 않으므로 타입을 생성해 올 곳이 없다. 대신
 * zod 스키마를 적고 타입은 `z.infer` 로 파생시킨다 — 한 군데만 고치면 타입과
 * 런타임 검사가 함께 따라온다.
 *
 * 전부 `z.object` 의 기본 동작(모르는 키는 버림)을 쓴다. `.strict()` 를 쓰면
 * 백엔드가 응답에 필드를 하나 더해준 날 멀쩡한 화면이 통째로 깨진다. 우리가
 * 잡고 싶은 건 "없어진 필드" 이지 "늘어난 필드" 가 아니다.
 *
 * 요청 본문은 여기 없다. 그건 컴파일 시점에 잡히므로 런타임 검사가 필요 없다.
 * `schema.ts` 를 볼 것.
 */

export const DepartmentSchema = z.object({
  id: z.number(),
  name: z.string(),
});

export const AttachmentSchema = z.object({
  kind: z.enum(["cv", "portfolio"]),
  source: z.enum(["link", "file"]),
  /** `source = file` 이면 유효기간 10분짜리 조회 URL */
  url: z.string(),
  file_name: z.string().nullable(),
});

/** 커피챗 소식을 받을 방법. 둘 다 false 면 "희망하지 않음" */
export const ContactSchema = z.object({
  email_enabled: z.boolean(),
  kakao_enabled: z.boolean(),
  email: z.string().nullable(),
  /** "-" 없는 휴대전화번호 */
  phone: z.string().nullable(),
});

export const StudentProfileSchema = z.object({
  department: DepartmentSchema,
  interests: z.array(z.string()),
  activities: z.array(z.string()),
  attachments: z.array(AttachmentSchema),
  contact: ContactSchema,
});

export const StudentInfoSchema = z.object({
  /** 인증을 마친 gist 이메일. 인증 전이면 null */
  email: z.string().nullable(),
  verified: z.boolean(),
  profile: StudentProfileSchema.nullable(),
});

export const GraduatedProfileSchema = z.object({
  nickname: z.string(),
  company: z.string(),
  /** 비공개 — 다른 회원에게 보이지 않는다 */
  department: z.string(),
  job: z.string(),
  hashtags: z.array(z.string()),
  links: z.array(z.string()),
  contact: ContactSchema,
});

export const GraduatedInfoSchema = z.object({
  verified: z.boolean(),
  profile: GraduatedProfileSchema.nullable(),
});

/**
 * 내 정보. 앱이 어느 화면으로 갈지 정하는 값이라 이 스키마가 가장 중요하다.
 * 여기가 조용히 틀리면 가입을 마친 사용자가 온보딩으로 되돌아가는 식의
 * 버그가 난다.
 */
export const UserInfoSchema = z.object({
  id: z.string(),
  type: z.enum(["student", "graduated"]),
  status: z.enum(["pending", "active"]),
  /** 가입 중일 때 다음 단계. 가입을 마쳤으면 null */
  next_step: z.enum(["consent", "verify", "profile"]).nullable(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  /** 개정된 필수 약관에 다시 동의해야 하면 true */
  consent_required: z.boolean(),
  student: StudentInfoSchema.nullable(),
  graduated: GraduatedInfoSchema.nullable(),
});

export const TokenPairSchema = z.object({
  access_token: z.string(),
  /** JWT 가 아닌 opaque token. 호출할 때마다 새로 발급된다 */
  refresh_token: z.string(),
});

export const OkResultSchema = z.object({
  result: z.string(),
});

/**
 * 가입 완료 시에만 토큰이 함께 온다.
 *
 * 토큰이 빠진 채로 통과시키면 기존 토큰이 이미 무효라 전부 401 로 떨어진다.
 * 그래서 "둘 중 하나만 온" 상태를 계약 위반으로 잡는다.
 */
export const SignupResultSchema = OkResultSchema.extend({
  access_token: z.string().optional(),
  refresh_token: z.string().optional(),
}).refine(
  (value) =>
    (value.access_token === undefined) === (value.refresh_token === undefined),
  { message: "access_token 과 refresh_token 은 항상 함께 와야 합니다" }
);

export const ConsentSchema = z.object({
  type: z.string(),
  version: z.string(),
  is_required: z.boolean(),
  url: z.string(),
  agreed: z.boolean(),
});

export const ConsentListSchema = z.object({
  consents: z.array(ConsentSchema),
});

export const DepartmentListSchema = z.object({
  departments: z.array(DepartmentSchema),
});

export const SendCodeResultSchema = z.object({
  /** 인증코드 만료 시각 (ISO 8601) */
  expires_at: z.string(),
  /** 재전송이 가능해지는 시각 (ISO 8601) */
  resend_available_at: z.string(),
});

export const UploadUrlSchema = z.object({
  url: z.string(),
  method: z.literal("PUT"),
  /** 업로드 후 기능 API 에 보낼 값 */
  key: z.string(),
  /** PUT 요청에 그대로 붙일 헤더 */
  headers: z.record(z.string(), z.string()),
  /** `url` 유효 시간 (초) */
  expires_in: z.number(),
});

export const CheersStatusSchema = z.enum([
  "requested",
  "viewed",
  "contact_shared",
]);

export const CheersCardSchema = z.object({
  graduated_id: z.string(),
  nickname: z.string(),
  company: z.string(),
  job: z.string(),
  hashtags: z.array(z.string()),
  links: z.array(z.string()),
  last_active_at: z.string(),
  /** 현업자가 "희망하지 않음" 이면 false — 요청 버튼을 비활성화한다 */
  can_request: z.boolean(),
});

export const CheersListSchema = z.object({
  items: z.array(CheersCardSchema),
  page: z.number(),
  size: z.number(),
  total: z.number(),
});

export const CheersRequestResultSchema = z.object({
  id: z.string(),
  created_at: z.string(),
});

export const RequestGraduatedSchema = z.object({
  graduated_id: z.string(),
  nickname: z.string(),
  company: z.string(),
  job: z.string(),
});

export const SentRequestSchema = z.object({
  id: z.string(),
  graduated: RequestGraduatedSchema,
  message: z.string(),
  status: CheersStatusSchema,
  created_at: z.string(),
});

export const SentListSchema = z.object({
  items: z.array(SentRequestSchema),
  page: z.number(),
  size: z.number(),
  total: z.number(),
});

export const SharedContactSchema = z.object({
  /** 현업자 이름 */
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  shared_at: z.string(),
});

export const SentRequestDetailSchema = SentRequestSchema.extend({
  shared_contact: SharedContactSchema.nullable(),
});

export const ReceivedRequestSchema = z.object({
  id: z.string(),
  student_name: z.string(),
  /** 요청 당시 재학생 학과명 */
  department: z.string(),
  status: CheersStatusSchema,
  created_at: z.string(),
});

export const ReceivedListSchema = z.object({
  items: z.array(ReceivedRequestSchema),
  page: z.number(),
  size: z.number(),
  total: z.number(),
});

/** 학과 · 관심 분야 · 활동 · 첨부는 요청 당시 값, 연락처는 현재 값 */
export const RequestStudentSchema = z.object({
  name: z.string(),
  department: z.string(),
  interests: z.array(z.string()),
  activities: z.array(z.string()),
  attachments: z.array(AttachmentSchema),
  email: z.string().nullable(),
  phone: z.string().nullable(),
});

export const ReceivedRequestDetailSchema = z.object({
  id: z.string(),
  message: z.string(),
  status: z.enum(["viewed", "contact_shared"]),
  created_at: z.string(),
  contact_shared_at: z.string().nullable(),
  student: RequestStudentSchema,
});

export const ShareContactResultSchema = z.object({
  contact_shared_at: z.string(),
  shared_email: z.string().nullable(),
  shared_phone: z.string().nullable(),
});

/* 타입은 전부 스키마에서 파생된다 — 따로 적지 않는다 */

export type Department = z.infer<typeof DepartmentSchema>;
export type Attachment = z.infer<typeof AttachmentSchema>;
export type Contact = z.infer<typeof ContactSchema>;
export type StudentProfile = z.infer<typeof StudentProfileSchema>;
export type StudentInfo = z.infer<typeof StudentInfoSchema>;
export type GraduatedProfile = z.infer<typeof GraduatedProfileSchema>;
export type GraduatedInfo = z.infer<typeof GraduatedInfoSchema>;
export type UserInfo = z.infer<typeof UserInfoSchema>;
export type NextStep = NonNullable<UserInfo["next_step"]>;
export type UserType = UserInfo["type"];
export type TokenPair = z.infer<typeof TokenPairSchema>;
export type OkResult = z.infer<typeof OkResultSchema>;
export type SignupResult = z.infer<typeof SignupResultSchema>;
export type Consent = z.infer<typeof ConsentSchema>;
export type ConsentList = z.infer<typeof ConsentListSchema>;
export type DepartmentList = z.infer<typeof DepartmentListSchema>;
export type SendCodeResult = z.infer<typeof SendCodeResultSchema>;
export type UploadUrl = z.infer<typeof UploadUrlSchema>;
export type CheersStatus = z.infer<typeof CheersStatusSchema>;
export type CheersCard = z.infer<typeof CheersCardSchema>;
export type CheersList = z.infer<typeof CheersListSchema>;
export type CheersRequestResult = z.infer<typeof CheersRequestResultSchema>;
export type RequestGraduated = z.infer<typeof RequestGraduatedSchema>;
export type SentRequest = z.infer<typeof SentRequestSchema>;
export type SentList = z.infer<typeof SentListSchema>;
export type SharedContact = z.infer<typeof SharedContactSchema>;
export type SentRequestDetail = z.infer<typeof SentRequestDetailSchema>;
export type ReceivedRequest = z.infer<typeof ReceivedRequestSchema>;
export type ReceivedList = z.infer<typeof ReceivedListSchema>;
export type RequestStudent = z.infer<typeof RequestStudentSchema>;
export type ReceivedRequestDetail = z.infer<typeof ReceivedRequestDetailSchema>;
export type ShareContactResult = z.infer<typeof ShareContactResultSchema>;
