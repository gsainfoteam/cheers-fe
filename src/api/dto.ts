import { z } from "zod";

/**
 * 응답 DTO의 단일 출처.
 *
 * 백엔드가 OpenAPI 를 내보낸다 (`/api-docs-json`). 그래도 타입만 생성해 오지
 * 않고 zod 스키마를 적는 이유는 런타임 검사 때문이다 — 생성된 타입은 응답이
 * 실제로 그 모양인지 확인해주지 않는다. 타입은 `z.infer` 로 파생시키므로
 * 한 군데만 고치면 타입과 검사가 함께 따라온다.
 *
 * **명세가 바뀌면 `/api-docs-json` 을 받아 이 파일과 대조할 것.**
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

/**
 * 첨부 — **남이 보는 쪽** (명세의 `AttachmentDto`).
 * 현업자가 받은 요청에서 재학생의 이력서 · 포트폴리오를 볼 때의 모양이다.
 *
 * `key` 가 없다. 남의 파일 key 를 쥐여줄 이유가 없어 서버가 빼고 준다.
 */
export const AttachmentSchema = z.object({
  kind: z.enum(["cv", "portfolio"]),
  source: z.enum(["link", "file"]),
  /** `source = file` 이면 presigned 조회 URL */
  url: z.string(),
  file_name: z.string().nullable(),
});

/**
 * 첨부 — **내 것** (명세의 `StudentAttachmentDto`). `GET /user/info` 가 준다.
 *
 * `key` 가 더 붙는다. 추가 정보는 전체 교체 방식이라 수정할 때 기존 첨부를
 * 그대로 돌려보내야 하는데, 파일 첨부 요청이 받는 건 `url` 이 아니라 `key` 다.
 * 이 값이 없으면 프로필을 고칠 때마다 올려둔 파일이 사라진다.
 */
export const StudentAttachmentSchema = AttachmentSchema.extend({
  /** `source = file` 일 때만 값이 있다. 링크 첨부는 null */
  key: z.string().nullable(),
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
  attachments: z.array(StudentAttachmentSchema),
  /** 아직 연락 설정을 저장하지 않았으면 null */
  contact: ContactSchema.nullable(),
});

export const StudentInfoSchema = z.object({
  /** 인증을 마친 gist 이메일. 인증 전이면 null */
  email: z.string().nullable(),
  verified: z.boolean(),
  profile: StudentProfileSchema.nullable(),
});

export const GraduatedProfileSchema = z.object({
  nickname: z.string(),
  /**
   * 회사 검색 결과의 `company_id`. 정보 수정에서 회사를 바꾸지 않으면 이 값을
   * 그대로 돌려보낸다 — 이름(`company_name`)으로 보내면 표기가 어드민 확인
   * 대기 중인 회사로 갈릴 수 있다.
   */
  company_id: z.number(),
  company: z.string(),
  /**
   * 회사 로고 presigned GET URL. 로고가 없으면 null. `CheersCardDto` 와 같은
   * 값이라 마이페이지 사원증도 둘러보기와 같은 로고를 그린다 (명세 2026-11-15
   * 갱신, 이슈 #46)
   */
  company_logo_url: z.string().nullable(),
  /**
   * 선택 입력이라 없으면 null (명세 2026-11-14 갱신, 이슈 #43). 06장 시안에서
   * `공개 사원증 정보` 로 옮겨 와 사원증 부서 줄에 찍힌다 — 다른 회원에게도
   * `CheersCardDto.department` 로 보인다(#46)
   */
  department: z.string().nullable(),
  job: z.string(),
  hashtags: z.array(z.string()),
  links: z.array(z.string()),
  /** 아직 연락 설정을 저장하지 않았으면 null */
  contact: ContactSchema.nullable(),
});

/**
 * 닉네임 중복 확인(`GET /user/graduated/nickname/check`). 대소문자 구분 없이
 * 이미 쓰는 닉네임이면 false. 조회만 하고 예약하지 않는다 — 저장할 때 다른
 * 사람이 먼저 가져갈 수 있다.
 */
export const NicknameCheckSchema = z.object({
  available: z.boolean(),
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
  /**
   * 다음 단계. 가입을 마쳤으면 null.
   *
   * `status = active` 인데도 값이 올 수 있다 — 어드민이 명함 인증을 취소한
   * 현업자는 `verify` 로 돌아온다. 가드가 `status` 가 아니라 이 값만 보는 이유다.
   */
  next_step: z.enum(["consent", "verify", "profile"]).nullable(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  /**
   * 구글 로그인 때 받은 프로필 이미지 URL. 없으면 null. 화면에는 쓰지 않는다
   * — `로그인 정보` 구획을 만들지 않기로 했다(05장 D5-2)
   */
  picture_url: z.string().nullable(),
  /** 개정된 필수 약관에 다시 동의해야 하면 true */
  consent_required: z.boolean(),
  student: StudentInfoSchema.nullable(),
  graduated: GraduatedInfoSchema.nullable(),
});

/** 로그인 · 가입 완료 때만 온다. refresh 는 access token 만 돌려준다 */
export const TokenPairSchema = z.object({
  access_token: z.string(),
  /** JWT 가 아닌 opaque token. 발급 후 기본 180일 */
  refresh_token: z.string(),
});

/**
 * `POST /user/refresh` 의 응답.
 *
 * **refresh token 은 들어 있지 않다.** 재발급도 연장도 없고, 원래 받은 걸
 * 만료될 때까지 계속 쓴다. 여기서 `TokenPairSchema` 를 쓰면 파싱이 실패해
 * 멀쩡한 세션이 로그아웃된다.
 */
export const AccessTokenSchema = z.object({
  access_token: z.string(),
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

export const InterestListSchema = z.object({
  interests: z.array(z.string()),
});

export const SendCodeResultSchema = z.object({
  /** 인증코드 만료 시각 (ISO 8601) */
  expires_at: z.string(),
  /** 재전송이 가능해지는 시각 (ISO 8601) */
  resend_available_at: z.string(),
});

export const UploadUrlSchema = z.object({
  url: z.string(),
  /** 명세상 `string` — 지금은 늘 "PUT" 이지만 리터럴로 묶지 않는다 */
  method: z.string(),
  /** 업로드 후 기능 API 에 보낼 값 */
  key: z.string(),
  /** PUT 요청에 그대로 붙일 헤더 */
  headers: z.record(z.string(), z.string()),
  /** `url` 유효 시간 (초) */
  expires_in: z.number(),
});

/**
 * 회사 검색 결과 하나 (`GET /api/v1/company`).
 *
 * 별칭 · 표기 흔들림(대소문자 · 공백)은 서버가 맞춘다. 그래서 `name` 은
 * 검색어와 전혀 달라 보일 수 있다 — "마소" 로 찾으면 `name` 은 "Microsoft",
 * `matched_name` 이 "마소" 다.
 */
export const CompanySearchItemSchema = z.object({
  company_id: z.number(),
  /** 화면에 나갈 회사 이름 */
  name: z.string(),
  /** 로고 presigned GET URL. 로고가 없으면 null */
  logo_url: z.string().nullable(),
  /** 검색어와 맞은 표기 */
  matched_name: z.string(),
});

/** 명세상 페이징 없는 맨 배열이다. 서버가 최대 10개로 자른다 */
export const CompanySearchResultSchema = z.array(CompanySearchItemSchema);

/**
 * 보낸 요청(재학생)의 상태. **`accepted` 가 없다** — 선배가 수락해도 학생에게는
 * `viewed` 로 보이고, 연락처를 공유해야 `contact_shared` 가 된다(이슈 #46).
 */
export const SentStatusSchema = z.enum(["requested", "viewed", "contact_shared"]);

/**
 * 받은 요청(현업자)의 상태. 순서는 requested → viewed → accepted →
 * contact_shared. 상세 응답에는 requested 가 오지 않는다(첫 조회가 viewed 로
 * 바꾼다). 공유는 수락 뒤에만 되고, 수락 API 이전에 공유한 요청은 마이그레이션
 * 에서 수락된 것으로 채워졌다(명세 2026-11-15 갱신, 이슈 #46).
 */
export const ReceivedStatusSchema = z.enum([
  "requested",
  "viewed",
  "accepted",
  "contact_shared",
]);

export const CheersCardSchema = z.object({
  graduated_id: z.string(),
  nickname: z.string(),
  company: z.string(),
  /** 회사 로고 presigned GET URL. 로고가 없으면 null */
  company_logo_url: z.string().nullable(),
  /** 선택 입력이라 없으면 null — 사원증 부서 줄을 그리지 않는다 (명세 2026-11-15 갱신, 이슈 #46) */
  department: z.string().nullable(),
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
  /**
   * 선택 입력이라 없으면 null. 선배가 탈퇴했거나 유예기간 중이면 null
   * (명세 2026-11-15 갱신, 이슈 #46)
   */
  department: z.string().nullable(),
  job: z.string(),
  /** 선배가 탈퇴했거나 유예기간 중이면 [] (명세 2026-11-15 갱신, 이슈 #46) */
  hashtags: z.array(z.string()),
});

export const SentRequestSchema = z.object({
  id: z.string(),
  graduated: RequestGraduatedSchema,
  /**
   * 상대 현업자가 탈퇴했거나 탈퇴 유예기간 중이면 true.
   *
   * 탈퇴해도 커피챗 기록은 남으므로, 목록에서 "탈퇴한 사용자" 를 표시하거나
   * 재요청 버튼을 막는 근거가 이 값이다.
   */
  graduated_withdrawn: z.boolean(),
  message: z.string(),
  status: SentStatusSchema,
  created_at: z.string(),
});

export const SentListSchema = z.object({
  items: z.array(SentRequestSchema),
  page: z.number(),
  size: z.number(),
  total: z.number(),
});

export const SharedContactSchema = z.object({
  /** 현업자 이름. 탈퇴했거나 유예기간 중이면 "탈퇴한 계정" 이 온다 */
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  shared_at: z.string(),
});

/**
 * 보낸 신청 **상세**의 선배. 목록(`RequestGraduatedDto`)에 로고 · 링크가 더해진다.
 *
 * BE 는 2026-11-15(CRB-87)부터 내려 주지만 `declare graduated` 로 선언돼
 * Swagger 명세에는 여전히 `RequestGraduatedDto` 로 나온다. 명세만 믿고 빼면
 * zod 가 이 두 필드를 지워 버린다(이슈 #46)
 */
export const RequestGraduatedDetailSchema = RequestGraduatedSchema.extend({
  /** 회사 로고 presigned GET URL. 로고가 없거나 선배가 탈퇴했으면 null */
  company_logo_url: z.string().nullable(),
  /** links[0] 이 LinkedIn. 선배가 탈퇴했거나 유예기간 중이면 [] */
  links: z.array(z.string()),
});

export const SentRequestDetailSchema = SentRequestSchema.extend({
  graduated: RequestGraduatedDetailSchema,
  shared_contact: SharedContactSchema.nullable(),
});

export const ReceivedRequestSchema = z.object({
  id: z.string(),
  /** 재학생이 탈퇴했으면 "탈퇴한 학생의 신청서입니다" 가 온다 */
  student_name: z.string(),
  /** 요청 당시 재학생 학과명 */
  department: z.string(),
  /**
   * 요청 당시 관심 분야 · 활동. 활동이 없으면 []. 상세를 열면 읽음 처리되므로
   * 목록 행은 이 값으로 그린다 (명세 2026-11-15 갱신, 이슈 #46)
   */
  interests: z.array(z.string()),
  activities: z.array(z.string()),
  /**
   * 재학생이 탈퇴했거나 탈퇴 유예기간 중이면 true. `SentRequestDto` 의
   * `graduated_withdrawn` 과 대칭이다.
   *
   * true 면 상세가 410 으로 막히므로 목록에서 클릭 자체를 막아야 한다.
   */
  student_withdrawn: z.boolean(),
  status: ReceivedStatusSchema,
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
  /**
   * **수락 전에는 늘 null 이다**(이슈 #46). 수락 뒤에는 재학생이 연락 수단으로
   * 고른 것만 값이 있고 고르지 않은 것은 null. phone 은 하이픈 없는 숫자
   */
  email: z.string().nullable(),
  phone: z.string().nullable(),
});

export const ReceivedRequestDetailSchema = z.object({
  id: z.string(),
  message: z.string(),
  status: ReceivedStatusSchema,
  created_at: z.string(),
  /** 수락한 시각. 수락 전이면 null */
  accepted_at: z.string().nullable(),
  contact_shared_at: z.string().nullable(),
  student: RequestStudentSchema,
});

/**
 * 커피챗 수락(`POST /cheers/received/{id}/accept`). 이미 수락한 요청에 다시
 * 부르면 처음 결과를 그대로 돌려준다.
 *
 * 명세는 `student` 를 속성 없는 `object` 로만 적어 두었다. 모양은 BE 안내
 * (2026-11-15)를 따른다 — 상세의 `student.email` · `phone` 과 같은 값이다.
 */
export const AcceptResultSchema = z.object({
  accepted_at: z.string(),
  student: z.object({
    email: z.string().nullable(),
    phone: z.string().nullable(),
  }),
});

export const ShareContactResultSchema = z.object({
  contact_shared_at: z.string(),
  shared_email: z.string().nullable(),
  shared_phone: z.string().nullable(),
});

/* 타입은 전부 스키마에서 파생된다 — 따로 적지 않는다 */

export type Department = z.infer<typeof DepartmentSchema>;
export type Attachment = z.infer<typeof AttachmentSchema>;
export type StudentAttachment = z.infer<typeof StudentAttachmentSchema>;
export type Contact = z.infer<typeof ContactSchema>;
export type StudentProfile = z.infer<typeof StudentProfileSchema>;
export type StudentInfo = z.infer<typeof StudentInfoSchema>;
export type GraduatedProfile = z.infer<typeof GraduatedProfileSchema>;
export type GraduatedInfo = z.infer<typeof GraduatedInfoSchema>;
export type UserInfo = z.infer<typeof UserInfoSchema>;
export type NextStep = NonNullable<UserInfo["next_step"]>;
export type UserType = UserInfo["type"];
export type TokenPair = z.infer<typeof TokenPairSchema>;
export type AccessToken = z.infer<typeof AccessTokenSchema>;
export type OkResult = z.infer<typeof OkResultSchema>;
export type SignupResult = z.infer<typeof SignupResultSchema>;
export type Consent = z.infer<typeof ConsentSchema>;
export type ConsentList = z.infer<typeof ConsentListSchema>;
export type DepartmentList = z.infer<typeof DepartmentListSchema>;
export type InterestList = z.infer<typeof InterestListSchema>;
export type SendCodeResult = z.infer<typeof SendCodeResultSchema>;
export type UploadUrl = z.infer<typeof UploadUrlSchema>;
export type CompanySearchItem = z.infer<typeof CompanySearchItemSchema>;
export type SentStatus = z.infer<typeof SentStatusSchema>;
export type ReceivedStatus = z.infer<typeof ReceivedStatusSchema>;
export type CheersCard = z.infer<typeof CheersCardSchema>;
export type CheersList = z.infer<typeof CheersListSchema>;
export type CheersRequestResult = z.infer<typeof CheersRequestResultSchema>;
export type RequestGraduated = z.infer<typeof RequestGraduatedSchema>;
export type RequestGraduatedDetail = z.infer<typeof RequestGraduatedDetailSchema>;
export type SentRequest = z.infer<typeof SentRequestSchema>;
export type SentList = z.infer<typeof SentListSchema>;
export type SharedContact = z.infer<typeof SharedContactSchema>;
export type SentRequestDetail = z.infer<typeof SentRequestDetailSchema>;
export type ReceivedRequest = z.infer<typeof ReceivedRequestSchema>;
export type ReceivedList = z.infer<typeof ReceivedListSchema>;
export type RequestStudent = z.infer<typeof RequestStudentSchema>;
export type ReceivedRequestDetail = z.infer<typeof ReceivedRequestDetailSchema>;
export type ShareContactResult = z.infer<typeof ShareContactResultSchema>;
export type AcceptResult = z.infer<typeof AcceptResultSchema>;
