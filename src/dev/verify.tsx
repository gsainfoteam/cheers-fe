import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { z } from "zod";
import {
  ApiError,
  api,
  createQueryClient,
  getTokens,
  isApiError,
  isContractError,
  remainingAttemptsOf,
  schemas,
  type Tokens,
  useLogout,
  useSubmitGraduatedInfo,
  useSubmitStudentInfo,
  userInfoQuery,
} from "@/api";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import type { Role } from "@/lib/session";

/**
 * 개발용 API 응답 확인 페이지 (`/verify.html`).
 *
 * `dto.ts` 를 `/api-docs-json` 을 보고 손으로 옮겨 유지하는 상황이라,
 * "명세대로 적은 스키마가 진짜 응답과 맞는가" 를 확인할 수단이 필요하다.
 * 명세와 배포가 어긋나는 일이 실제로 있었다 (이슈 #17).
 *
 * 대부분의 엔드포인트는 가입을 마쳐야 열리므로 가입 단계를 직접 밟을 수 있게
 * 해뒀다. **실제 메일이 나가고 실제 계정 상태가 바뀐다.** 그래서 단계마다
 * 버튼을 따로 두고 연쇄 실행하지 않는다.
 *
 * 현업자 경로(받은 요청 · 연락처 공유)는 재학생이 보낸 요청이 있어야 열리고,
 * 공유 결과는 재학생 쪽에서만 보인다. 두 계정을 오가며 확인하도록 로그아웃
 * 버튼을 두고, 보고서는 계정을 바꿔도 지우지 않는다.
 *
 * 라우터에 등록하지 않았고 `vite build` 진입점도 아니라서 배포물에는 들어가지
 * 않는다. 필요 없어지면 이 파일과 `verify.html` 을 지우면 된다.
 */

type Check = {
  label: string;
  /** "2xx" 는 훅을 거쳐 실제 코드를 알 수 없는 경우. 숫자를 지어내지 않는다 */
  status: number | "throw" | "2xx";
  schema: "pass" | "fail" | "skipped";
  issues: string[];
  body: unknown;
};

/** 개인정보가 담긴 값은 가린다. 우리가 확인할 건 값이 아니라 모양이다 */
const SENSITIVE = new Set([
  "name",
  "email",
  "phone",
  "student_name",
  "shared_email",
  "shared_phone",
  "access_token",
  "refresh_token",
  "url",
  "key",
  "links",
  "message",
]);

/** ContractError.detail 을 줄 단위로 쪼갠다 */
const lines = (text: string) => text.split(/\r?\n/).filter(Boolean);

/** 쉼표로 구분한 입력을 배열로 */
const csv = (text: string) =>
  text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

function redact(value: unknown, key?: string): unknown {
  if (value === null) return null;
  if (Array.isArray(value)) return value.map((item) => redact(item, key));
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        redact(v, k),
      ])
    );
  }
  if (key && SENSITIVE.has(key) && typeof value === "string") {
    return `<${typeof value}:${value.length}>`;
  }
  return value;
}

/**
 * 호출 한 건을 검사한다. 스키마가 어긋나도 **원본 본문을 남긴다** —
 * 계약서를 고치려면 실제로 무엇이 왔는지 봐야 한다.
 */
async function check<T>(
  label: string,
  run: () => Promise<{ data?: T; error?: unknown; response: Response }>,
  schema: z.ZodType<T>
): Promise<Check> {
  try {
    const { data, error, response } = await run();
    if (!response.ok) {
      return {
        label,
        status: response.status,
        schema: "skipped",
        issues: [],
        // 에러 본문은 가리지 않는다. 서버가 쓴 메시지라 개인정보가 없고,
        // 403 이 "단계 불일치" 인지 "역할 불일치" 인지 구분하려면 꼭 필요하다
        body: error,
      };
    }
    const parsed = schema.safeParse(data);
    return {
      label,
      status: response.status,
      schema: parsed.success ? "pass" : "fail",
      issues: parsed.success
        ? []
        : parsed.error.issues.map(
            (issue) =>
              `${issue.path.map(String).join(".") || "(root)"}: ${issue.message}`
          ),
      body: redact(data),
    };
  } catch (error) {
    return {
      label,
      status: "throw",
      schema: "skipped",
      issues: [error instanceof Error ? error.message : String(error)],
      body: null,
    };
  }
}

/**
 * 가입 완료 훅이 성공했을 때의 보고. 훅은 Response 를 돌려주지 않으므로
 * 상태 코드 대신 "토큰이 실제로 교체됐는가" 를 남긴다
 */
function signupSuccess(
  label: string,
  before: Tokens | null,
  data: unknown
): Check {
  const after = getTokens();
  return {
    label,
    status: "2xx",
    schema: "pass",
    issues: [
      "상태 코드 미확인: 훅이 Response 를 돌려주지 않는다 (unwrap 은 response.ok 로만 판단)",
      `토큰 교체: ${
        before?.accessToken !== after?.accessToken
          ? "발생함 ✅ (가입 완료 응답의 새 토큰을 반영)"
          : "없음 (마이페이지 수정이거나 토큰 미발급)"
      }`,
    ],
    body: redact(data),
  };
}

/** 훅이 던진 에러를 보고 한 건으로. 계약 위반이면 어긋난 자리를 줄 단위로 남긴다 */
function hookFailure(label: string, error: unknown): Check {
  return {
    label,
    status: isApiError(error) ? error.status : "throw",
    schema: isContractError(error) ? "fail" : "skipped",
    issues: isContractError(error)
      ? lines(error.detail)
      : [error instanceof Error ? error.message : String(error)],
    body: isApiError(error) ? error.body : null,
  };
}

/** 읽기 전용 엔드포인트 일괄 점검. 몇 번이든 다시 돌려도 안전하다 */
async function readOnlySweep(): Promise<Check[]> {
  return [
    await check(
      "GET /api/v1/user/info",
      () => api.GET("/api/v1/user/info"),
      schemas.UserInfoSchema
    ),
    await check(
      "GET /api/v1/user/consent/list",
      () => api.GET("/api/v1/user/consent/list"),
      schemas.ConsentListSchema
    ),
    await check(
      "GET /api/v1/user/student/departments",
      () => api.GET("/api/v1/user/student/departments"),
      schemas.DepartmentListSchema
    ),
    await check(
      "GET /api/v1/user/student/interests",
      () => api.GET("/api/v1/user/student/interests"),
      schemas.InterestListSchema
    ),
    await check(
      "GET /api/v1/cheers",
      () => api.GET("/api/v1/cheers", { params: { query: { size: 3 } } }),
      schemas.CheersListSchema
    ),
    await check(
      "GET /api/v1/cheers/sent",
      () => api.GET("/api/v1/cheers/sent", { params: { query: { size: 3 } } }),
      schemas.SentListSchema
    ),
    await check(
      "GET /api/v1/cheers/received",
      () =>
        api.GET("/api/v1/cheers/received", { params: { query: { size: 3 } } }),
      schemas.ReceivedListSchema
    ),
  ];
}

const STEP_LABEL: Record<schemas.UserType, Record<schemas.NextStep, string>> = {
  student: {
    consent: "1. 약관 동의",
    verify: "2. gist 이메일 인증",
    profile: "3. 추가 정보 입력",
  },
  graduated: {
    consent: "1. 약관 동의",
    verify: "2. 명함 인증",
    profile: "3. 현업자 정보 입력",
  },
};

/** 받은 요청 목록에서 고를 때 필요한 것만. 이름은 보고서에서 가려진다 */
type ReceivedItem = Pick<
  schemas.ReceivedRequest,
  "id" | "status" | "student_withdrawn" | "created_at"
>;

export function App() {
  const queryClient = useQueryClient();
  const submitStudentInfo = useSubmitStudentInfo();
  const submitGraduatedInfo = useSubmitGraduatedInfo();
  const logout = useLogout();

  const [role, setRole] = useState<Role>("student");
  const [checks, setChecks] = useState<Check[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  // 가입 단계 입력값
  const [gistEmail, setGistEmail] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [interests, setInterests] = useState("소프트웨어");
  const [contactEmail, setContactEmail] = useState("");
  const [departments, setDepartments] = useState<
    { id: number; name: string }[]
  >([]);

  // 현업자 가입 단계 입력값
  const [businessCard, setBusinessCard] = useState<File | null>(null);
  const [nickname, setNickname] = useState("");
  const [company, setCompany] = useState("검증용 회사");
  const [graduatedDepartment, setGraduatedDepartment] = useState("검증팀");
  const [job, setJob] = useState("검증용 직무");
  const [hashtags, setHashtags] = useState("검증용");
  const [graduatedLinks, setGraduatedLinks] = useState(
    "https://example.com/profile"
  );

  // 가입 완료 후 추가 검증 입력값
  const [attachmentUrl, setAttachmentUrl] = useState(
    "https://example.com/portfolio"
  );
  const [requestMessage, setRequestMessage] = useState(
    "[검증용] API 연동 테스트로 보낸 요청입니다. 응답하지 않으셔도 됩니다."
  );
  const [targetNickname, setTargetNickname] = useState("");
  const [received, setReceived] = useState<ReceivedItem[]>([]);
  const [receivedId, setReceivedId] = useState("");

  const signedIn = getTokens() !== null;
  const record = (next: Check[]) => setChecks((prev) => [...prev, ...next]);

  /**
   * 현재 단계는 앱이 쓰는 것과 똑같은 queryOptions 로 읽는다. 직접 state 를
   * 들고 effect 로 채우면 가드와 화면이 서로 다른 걸 보는 그 구조가 된다.
   * `retry: false` 는 계약 위반(ContractError)을 두 번 더 때리지 않기 위한 것.
   */
  const meQuery = useQuery({
    ...userInfoQuery(),
    enabled: signedIn,
    retry: false,
  });
  const me = meQuery.data ?? null;
  const refreshMe = () => meQuery.refetch();

  const withBusy = async (key: string, run: () => Promise<void>) => {
    setBusy(key);
    try {
      await run();
    } finally {
      setBusy(null);
    }
  };

  /* ── 읽기 전용 점검 ──────────────────────────────────────────────────── */
  const sweep = () =>
    withBusy("sweep", async () => {
      record(await readOnlySweep());
      await refreshMe();
    });

  /* ── 1단계: 약관 동의 ────────────────────────────────────────────────── */
  const submitConsent = () =>
    withBusy("consent", async () => {
      const list = await check(
        "GET /api/v1/user/consent/list",
        () => api.GET("/api/v1/user/consent/list"),
        schemas.ConsentListSchema
      );
      record([list]);

      const { data } = await api.GET("/api/v1/user/consent/list");
      if (!data) return;

      // 필수 약관은 모두 동의, 선택 약관은 그대로 둔다
      const consents = data.consents.map((consent) => ({
        type: consent.type,
        version: consent.version,
        agreed: consent.is_required ? true : consent.agreed,
      }));

      record([
        await check(
          `POST /api/v1/user/consent (${consents.map((c) => c.type).join(", ")})`,
          () => api.POST("/api/v1/user/consent", { body: { consents } }),
          schemas.OkResultSchema
        ),
      ]);
      await refreshMe();
    });

  /* ── 2단계: gist 이메일 인증 ─────────────────────────────────────────── */
  const sendCode = () =>
    withBusy("send-code", async () => {
      record([
        await check(
          "POST /api/v1/user/student/verify/send-code",
          () =>
            api.POST("/api/v1/user/student/verify/send-code", {
              body: { email: gistEmail },
            }),
          schemas.SendCodeResultSchema
        ),
      ]);
    });

  const verifyCode = () =>
    withBusy("verify-code", async () => {
      const result = await check(
        "POST /api/v1/user/student/verify/code",
        () => api.POST("/api/v1/user/student/verify/code", { body: { code } }),
        schemas.OkResultSchema
      );
      // 400 이면 남은 시도 횟수가 함께 온다. 그 파서도 여기서 확인한다
      if (result.status === 400) {
        const attempts = remainingAttemptsOf(new ApiError(400, result.body));
        result.issues.push(
          `remainingAttemptsOf() → ${attempts ?? "읽지 못함"}`
        );
      }
      record([result]);
      await refreshMe();
    });

  /* ── 2단계 (현업자): 명함 인증 ───────────────────────────────────────────
   *
   * `uploadFile()` 과 같은 순서(발급 → S3 PUT → key 제출)를 풀어서 밟는다.
   * 그 함수를 그대로 부르면 발급 응답 본문과 단계별 상태 코드가 사라져서,
   * UploadUrlSchema 가 어긋났을 때 무엇이 왔는지 볼 수 없다.
   * PUT 에 Authorization 을 붙이지 않는 것까지 같게 둔다 (붙이면 S3 가 403).
   */
  const verifyBusinessCard = () =>
    withBusy("business-card", async () => {
      const file = businessCard;
      if (!file) return;

      // url · key 는 보고서에서 가려지므로 원본을 따로 쥐고 있는다
      const captured: { data?: schemas.UploadUrl } = {};
      const issuing = await check(
        `POST /api/v1/file/business-card/upload-url (${file.type || "형식 없음"}, ${file.size}B)`,
        async () => {
          const result = await api.POST(
            "/api/v1/file/business-card/upload-url",
            { body: { content_type: file.type, size: file.size } }
          );
          captured.data = result.data;
          return result;
        },
        schemas.UploadUrlSchema
      );
      record([issuing]);
      const issued = captured.data;
      if (!issued || issuing.schema !== "pass") return;

      const put: Check = {
        label: `${issued.method} presigned URL (S3 직접 업로드)`,
        status: "throw",
        schema: "skipped",
        issues: [],
        body: null,
      };
      let uploaded = false;
      try {
        const response = await fetch(issued.url, {
          method: issued.method,
          headers: issued.headers,
          body: file,
        });
        put.status = response.status;
        uploaded = response.ok;
        if (!uploaded) put.issues.push(await response.text().catch(() => ""));
      } catch (error) {
        // CORS 로 막히면 상태 코드 없이 여기로 온다
        put.issues.push(error instanceof Error ? error.message : String(error));
      }
      record([put]);
      if (!uploaded) return;

      record([
        await check(
          "POST /api/v1/user/graduated/verify/business-card",
          () =>
            api.POST("/api/v1/user/graduated/verify/business-card", {
              body: { key: issued.key },
            }),
          schemas.OkResultSchema
        ),
      ]);
      await refreshMe();
    });

  /* ── 3단계: 추가 정보 ────────────────────────────────────────────────── */
  const loadDepartments = () =>
    withBusy("departments", async () => {
      const result = await check(
        "GET /api/v1/user/student/departments",
        () => api.GET("/api/v1/user/student/departments"),
        schemas.DepartmentListSchema
      );
      record([result]);
      const { data } = await api.GET("/api/v1/user/student/departments");
      if (data) {
        setDepartments(data.departments);
        if (data.departments[0])
          setDepartmentId(String(data.departments[0].id));
      }
    });

  const submitProfile = () =>
    withBusy("profile", async () => {
      const before = getTokens();
      const body = {
        ...(me?.name ? {} : { name }),
        department_id: Number(departmentId),
        interests: csv(interests),
        activities: [],
        attachments: [],
        contact: {
          email_enabled: true,
          kakao_enabled: false,
          email: contactEmail || gistEmail,
          phone: null,
        },
      };

      // 여기만 실제 훅을 쓴다. 가입 완료 시 토큰이 교체되는 경로
      // (adoptIssuedTokens) 를 함께 검증하기 위해서다
      const label = "POST /api/v1/user/student/info (useSubmitStudentInfo)";
      try {
        const data = await submitStudentInfo.mutateAsync(body);
        record([signupSuccess(label, before, data)]);
      } catch (error) {
        record([hookFailure(label, error)]);
      }
      queryClient.clear();
      await refreshMe();
    });

  /* ── 3단계 (현업자): 현업자 정보 ─────────────────────────────────────────
   *
   * 재학생과 마찬가지로 실제 훅을 써서 가입 완료 시 토큰 교체를 함께 본다.
   * 저장 뒤 내 정보를 다시 받아야 GraduatedProfileSchema 가 null 이 아닌
   * 프로필로 실제로 검사된다.
   */
  const submitGraduatedProfile = () =>
    withBusy("graduated-profile", async () => {
      const before = getTokens();
      const label = "POST /api/v1/user/graduated/info (useSubmitGraduatedInfo)";
      try {
        const data = await submitGraduatedInfo.mutateAsync({
          ...(me?.name ? {} : { name }),
          nickname,
          // 검색을 거치지 않는 검증용 저장 — 직접 입력한 이름으로 보낸다
          company_name: company,
          department: graduatedDepartment,
          job,
          hashtags: csv(hashtags),
          links: csv(graduatedLinks),
          contact: {
            email_enabled: true,
            kakao_enabled: false,
            email: contactEmail || me?.email || null,
            phone: null,
          },
        });
        record([signupSuccess(label, before, data)]);
      } catch (error) {
        record([hookFailure(label, error)]);
      }
      queryClient.clear();
      await refreshMe();
      record([
        await check(
          "GET /api/v1/user/info (현업자 프로필 포함)",
          () => api.GET("/api/v1/user/info"),
          schemas.UserInfoSchema
        ),
      ]);
    });

  /* ── 추가 검증 A: 프로필 수정 (링크 첨부) ───────────────────────────────
   *
   * 두 가지를 본다.
   *  1. AttachmentSchema — 빈 배열은 z.array() 를 그냥 통과하므로 항목이
   *     하나라도 있어야 실제로 검사된다
   *  2. "마이페이지 수정" 경로 — 가입 완료와 달리 토큰이 오지 않아야 하고,
   *     adoptIssuedTokens 가 아무것도 하지 않아야 한다
   */
  const resubmitProfile = () =>
    withBusy("resubmit", async () => {
      const profile = me?.student?.profile;
      if (!profile) return;
      const label = "POST /api/v1/user/student/info (수정 · 링크 첨부 추가)";

      // 전체 교체 방식이라 현재 값을 모두 다시 보낸다
      // 명세상 contact 는 nullable 이다. 요청에서는 필수라 지어낼 수 없다
      if (!profile.contact) {
        record([
          {
            label,
            status: "throw",
            schema: "skipped",
            issues: [
              "저장된 연락 설정이 없습니다 (contact = null) — 전체 교체 요청에 넣을 값이 없어 중단했습니다",
            ],
            body: null,
          },
        ]);
        return;
      }

      const links = profile.attachments.filter((a) => a.source === "link");
      const files = profile.attachments.filter((a) => a.source === "file");
      // 파일 첨부는 응답의 key 를 그대로 돌려보내야 살아남는다.
      // key 가 null 인 파일 첨부가 있으면 되돌릴 방법이 없으므로 중단한다
      const orphaned = files.filter((a) => a.key === null);
      if (orphaned.length) {
        record([
          {
            label,
            status: "throw",
            schema: "skipped",
            issues: [
              `파일 첨부 ${orphaned.length}건에 key 가 없어 전송을 중단했습니다 (전체 교체 방식이라 삭제됨)`,
            ],
            body: null,
          },
        ]);
        return;
      }

      const attachments = [
        ...links.map((a) => ({
          kind: a.kind,
          source: "link" as const,
          url: a.url,
        })),
        ...files.map((a) => ({
          kind: a.kind,
          source: "file" as const,
          key: a.key as string,
          file_name: a.file_name ?? "",
        })),
        {
          kind: "portfolio" as const,
          source: "link" as const,
          url: attachmentUrl,
        },
      ];

      const before = getTokens();
      try {
        const data = await submitStudentInfo.mutateAsync({
          department_id: profile.department.id,
          interests: profile.interests,
          activities: profile.activities,
          attachments,
          contact: {
            email_enabled: profile.contact.email_enabled,
            kakao_enabled: profile.contact.kakao_enabled,
            email: profile.contact.email,
            phone: profile.contact.phone,
          },
        });
        const after = getTokens();
        record([
          {
            label,
            status: "2xx",
            schema: "pass",
            issues: [
              `응답에 토큰: ${data.access_token ? "있음 ⚠️ (수정인데 재발급?)" : "없음 ✅ (명세대로)"}`,
              `저장된 토큰: ${before?.accessToken !== after?.accessToken ? "바뀜 ⚠️" : "그대로 ✅ (adoptIssuedTokens 가 올바르게 아무것도 안 함)"}`,
              ...(files.length
                ? [`파일 첨부 ${files.length}건을 key 로 되돌려 보냈습니다`]
                : []),
            ],
            body: redact(data),
          },
        ]);
      } catch (error) {
        record([hookFailure(label, error)]);
      }
      await refreshMe();
      // 저장된 첨부가 실제로 어떤 모양으로 돌아오는지 — 여기서 AttachmentSchema 가 검사된다
      record([
        await check(
          "GET /api/v1/user/info (첨부 포함)",
          () => api.GET("/api/v1/user/info"),
          schemas.UserInfoSchema
        ),
      ]);
    });

  /* ── 추가 검증 B: 커피챗 요청 ───────────────────────────────────────────
   *
   * 한 번의 요청으로 스키마 셋이 열린다:
   * CheersRequestResult → SentRequest(목록 항목) → SentRequestDetail
   */
  const requestCheers = () =>
    withBusy("request", async () => {
      // 검증용 현업자 계정은 방금 가입했으므로 최근 가입순으로 찾는다
      const { data: list } = await api.GET("/api/v1/cheers", {
        params: { query: { size: 10, sort: "recent_joined" } },
      });
      const target = list?.items.find(
        (item) =>
          item.can_request &&
          (!targetNickname || item.nickname === targetNickname)
      );
      if (!target) {
        record([
          {
            label: "POST /api/v1/cheers/request",
            status: "throw",
            schema: "skipped",
            issues: [
              targetNickname
                ? `요청 가능한 "${targetNickname}" 이(가) 최근 가입 10명 안에 없습니다`
                : "요청 가능한(can_request) 현업자가 목록에 없습니다",
            ],
            body: null,
          },
        ]);
        return;
      }

      const created = await check(
        `POST /api/v1/cheers/request (→ ${target.nickname})`,
        () =>
          api.POST("/api/v1/cheers/request", {
            body: {
              graduated_id: target.graduated_id,
              message: requestMessage,
            },
          }),
        schemas.CheersRequestResultSchema
      );
      record([created]);

      // 이제 items 가 비어 있지 않으므로 SentRequestSchema 가 실제로 검사된다
      record([
        await check(
          "GET /api/v1/cheers/sent (항목 포함)",
          () =>
            api.GET("/api/v1/cheers/sent", { params: { query: { size: 3 } } }),
          schemas.SentListSchema
        ),
      ]);

      const id = (created.body as { id?: string } | null)?.id;
      if (id) {
        record([
          await check(
            "GET /api/v1/cheers/sent/{id}",
            () =>
              api.GET("/api/v1/cheers/sent/{id}", {
                params: { path: { id } },
              }),
            schemas.SentRequestDetailSchema
          ),
        ]);
      }
    });

  /* ── 추가 검증 C (재학생): 공유된 연락처 ─────────────────────────────────
   *
   * 현업자 계정에서 연락처를 공유한 뒤 재학생 계정으로 돌아와 누른다.
   * shared_contact 가 null 이 아니어야 SharedContactSchema 가 실제로 검사된다.
   */
  const checkSharedContact = () =>
    withBusy("shared-contact", async () => {
      const list = await check(
        "GET /api/v1/cheers/sent (연락처 공유 찾기)",
        () =>
          api.GET("/api/v1/cheers/sent", { params: { query: { size: 10 } } }),
        schemas.SentListSchema
      );
      record([list]);

      const label = "GET /api/v1/cheers/sent/{id} (연락처 공유됨)";
      const items =
        (list.body as { items?: { id: string; status: string }[] } | null)
          ?.items ?? [];
      const target = items.find((item) => item.status === "contact_shared");
      if (!target) {
        record([
          {
            label,
            status: "throw",
            schema: "skipped",
            issues: [
              "contact_shared 상태인 요청이 최근 10건에 없습니다 — 현업자 계정에서 먼저 연락처를 공유하세요",
            ],
            body: null,
          },
        ]);
        return;
      }

      const detail = await check(
        label,
        () =>
          api.GET("/api/v1/cheers/sent/{id}", {
            params: { path: { id: target.id } },
          }),
        schemas.SentRequestDetailSchema
      );
      if (detail.schema === "pass") {
        detail.issues.push(
          (detail.body as { shared_contact?: unknown }).shared_contact
            ? "shared_contact 채워짐 ✅ — SharedContactSchema 가 실제로 검사됨"
            : "shared_contact = null ⚠️ — status 는 contact_shared 인데 연락처가 비어 있습니다"
        );
      }
      record([detail]);
    });

  /* ── 현업자 A: 받은 요청 목록 ───────────────────────────────────────────
   *
   * 읽기 전용. 항목이 있어야 ReceivedRequestSchema 가 실제로 검사된다.
   * 여기서 고른 요청으로 B · C 를 진행한다.
   */
  const loadReceived = () =>
    withBusy("received", async () => {
      const result = await check(
        "GET /api/v1/cheers/received (항목 포함)",
        () =>
          api.GET("/api/v1/cheers/received", {
            params: { query: { size: 10 } },
          }),
        schemas.ReceivedListSchema
      );
      const items =
        (result.body as { items?: ReceivedItem[] } | null)?.items ?? [];
      if (result.schema === "pass" && items.length === 0) {
        result.issues.push(
          "받은 요청이 없어 ReceivedRequestSchema 는 검사되지 않았습니다 — 재학생 계정에서 이 현업자에게 커피챗 요청을 먼저 보내세요"
        );
      }
      record([result]);
      setReceived(items);
      // 탈퇴한 재학생의 요청은 상세가 410 으로 막혀 있으므로 고르지 않는다
      setReceivedId(items.find((item) => !item.student_withdrawn)?.id ?? "");
    });

  /* ── 현업자 B: 받은 요청 상세 ───────────────────────────────────────────
   *
   * 부수효과가 있는 GET 이다 — 첫 호출이 requested → viewed 로 기록한다.
   * 재학생 첨부가 있어야 그 안의 AttachmentSchema 까지 검사된다.
   */
  const openReceived = () =>
    withBusy("received-detail", async () => {
      const listed = received.find((item) => item.id === receivedId)?.status;
      const result = await check(
        `GET /api/v1/cheers/received/{id} (목록상 status: ${listed ?? "?"})`,
        () =>
          api.GET("/api/v1/cheers/received/{id}", {
            params: { path: { id: receivedId } },
          }),
        schemas.ReceivedRequestDetailSchema
      );
      if (result.schema === "pass") {
        const detail = result.body as {
          status?: string;
          student?: { attachments?: unknown[] };
        };
        result.issues.push(`조회 후 status: ${detail.status}`);
        if (!detail.student?.attachments?.length) {
          result.issues.push(
            "재학생 첨부가 없어 AttachmentSchema 는 검사되지 않았습니다"
          );
        }
      }
      record([result]);
    });

  /* ── 현업자 C: 연락처 공유 ──────────────────────────────────────────────
   *
   * ShareContactResult 를 받은 뒤 상세를 다시 불러 반영됐는지까지 본다.
   * 재학생 쪽 shared_contact 는 계정을 바꿔 재학생 C 에서 확인한다.
   */
  const shareContact = () =>
    withBusy("share", async () => {
      const path = { params: { path: { id: receivedId } } };
      record([
        await check(
          "POST /api/v1/cheers/received/{id}/share-contact",
          () => api.POST("/api/v1/cheers/received/{id}/share-contact", path),
          schemas.ShareContactResultSchema
        ),
      ]);

      const detail = await check(
        "GET /api/v1/cheers/received/{id} (공유 후)",
        () => api.GET("/api/v1/cheers/received/{id}", path),
        schemas.ReceivedRequestDetailSchema
      );
      if (detail.schema === "pass") {
        const body = detail.body as {
          status?: string;
          contact_shared_at?: string | null;
        };
        detail.issues.push(
          body.status === "contact_shared" && body.contact_shared_at
            ? "status = contact_shared, contact_shared_at 채워짐 ✅"
            : `공유가 반영되지 않았습니다 ⚠️ (status=${body.status}, contact_shared_at=${body.contact_shared_at})`
        );
      }
      record([detail]);
    });

  /* ── 로그아웃 (계정 전환) ────────────────────────────────────────────── */
  const switchAccount = () =>
    withBusy("logout", async () => {
      setReceived([]);
      setReceivedId("");
      await logout.mutateAsync();
    });

  /* ── 보고서 ──────────────────────────────────────────────────────────── */
  const report = checks.length
    ? [
        `API 응답 검증 — ${new Date().toISOString()}`,
        `계정: type=${me?.type ?? "?"} status=${me?.status ?? "?"} next_step=${me?.next_step ?? "null"}`,
        "",
        ...checks.map((c) =>
          [
            `── ${c.label}`,
            `   status: ${c.status}   schema: ${c.schema}`,
            ...c.issues.map((i) => `   ! ${i}`),
            `   body: ${JSON.stringify(c.body)}`,
          ].join("\n")
        ),
      ].join("\n")
    : "";

  const step = me?.next_step ?? null;
  const graduated = me?.type === "graduated";
  const labels = STEP_LABEL[me?.type ?? "student"];
  const nameInput = me?.name ? null : (
    <>
      <input
        placeholder="이름 (최초 1회만 저장됨)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={S.input}
      />
      <br />
    </>
  );

  return (
    <main style={S.page}>
      <h1>API 응답 확인 (개발용)</h1>

      <section style={S.box}>
        <h2>로그인</h2>
        {signedIn ? (
          <p>
            로그인됨 — type=<b>{me?.type ?? "?"}</b> status=
            <b>{me?.status ?? "?"}</b> next_step=
            <b>{me ? String(me.next_step) : "?"}</b>
            {meQuery.error ? (
              <>
                <br />
                <span style={S.warn}>
                  내 정보를 불러오지 못했습니다: {String(meQuery.error)}
                </span>
              </>
            ) : null}
            <br />
            <button
              onClick={() => void switchAccount()}
              disabled={busy !== null}
            >
              로그아웃 (계정 전환)
            </button>{" "}
            <span style={S.note}>
              보고서는 지우지 않습니다 — 두 계정의 결과를 한 보고서에 모읍니다.
            </span>
          </p>
        ) : (
          <>
            <label>
              <input
                type="radio"
                checked={role === "student"}
                onChange={() => setRole("student")}
              />
              재학생
            </label>{" "}
            <label>
              <input
                type="radio"
                checked={role === "mentor"}
                onChange={() => setRole("mentor")}
              />
              현업자
            </label>
            <GoogleSignInButton role={role} onSuccess={() => void sweep()} />
          </>
        )}
      </section>

      {signedIn ? (
        <>
          <section style={S.box}>
            <h2>읽기 전용 점검</h2>
            <p style={S.note}>몇 번이든 다시 돌려도 안전합니다.</p>
            <button onClick={() => void sweep()} disabled={busy !== null}>
              {busy === "sweep" ? "확인 중…" : "7개 엔드포인트 점검"}
            </button>
          </section>

          <section style={S.box}>
            <h2>가입 단계 진행</h2>
            <p style={S.warn}>
              ⚠️ 실제 메일이 발송되고 계정 상태가 바뀝니다. 되돌릴 수 없습니다.
            </p>
            <p style={S.note}>
              현재 단계:{" "}
              <b>
                {!me
                  ? meQuery.isPending
                    ? "불러오는 중…"
                    : "확인 불가"
                  : step
                    ? labels[step]
                    : "가입 완료"}
              </b>
            </p>

            <fieldset
              style={S.step}
              disabled={!me || step !== "consent" || busy !== null}
            >
              <legend>{labels.consent}</legend>
              <p style={S.note}>
                목록을 받아 필수 약관을 모두 동의로 보냅니다.
              </p>
              <button onClick={() => void submitConsent()}>
                약관 동의 보내기
              </button>
            </fieldset>

            <fieldset
              style={S.step}
              disabled={!me || step !== "verify" || busy !== null}
            >
              <legend>{labels.verify}</legend>
              {graduated ? (
                <>
                  <p style={S.note}>
                    발급(UploadUrl) → S3 PUT → 인증 요청을 차례로 밟습니다. jpeg
                    · png · heic · heif, 10MB 이하. 심사 없이 즉시 인증됩니다.
                  </p>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/heic,image/heif"
                    onChange={(e) =>
                      setBusinessCard(e.target.files?.[0] ?? null)
                    }
                    style={S.input}
                  />
                  <button
                    onClick={() => void verifyBusinessCard()}
                    disabled={!businessCard}
                  >
                    명함 올리고 인증 요청
                  </button>
                </>
              ) : (
                <>
                  <input
                    placeholder="gist 이메일 (예: id@gm.gist.ac.kr)"
                    value={gistEmail}
                    onChange={(e) => setGistEmail(e.target.value)}
                    style={S.input}
                  />
                  <button onClick={() => void sendCode()}>인증코드 발송</button>
                  <br />
                  <input
                    placeholder="6자리 코드"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    style={S.input}
                  />
                  <button onClick={() => void verifyCode()}>코드 확인</button>
                </>
              )}
            </fieldset>

            <fieldset
              style={S.step}
              disabled={!me || step !== "profile" || busy !== null}
            >
              <legend>{labels.profile}</legend>
              {graduated ? (
                <>
                  <p style={S.warn}>
                    ⚠️ 가입을 마치면 재학생의 현업자 목록에 노출됩니다.
                  </p>
                  {nameInput}
                  <input
                    placeholder="닉네임 (최초 1회만 저장됨)"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    style={S.input}
                  />
                  <br />
                  <input
                    placeholder="회사"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    style={S.input}
                  />
                  <input
                    placeholder="부서 (비공개)"
                    value={graduatedDepartment}
                    onChange={(e) => setGraduatedDepartment(e.target.value)}
                    style={S.input}
                  />
                  <input
                    placeholder="직무"
                    value={job}
                    onChange={(e) => setJob(e.target.value)}
                    style={S.input}
                  />
                  <br />
                  <input
                    placeholder="해시태그 (쉼표 구분, # 없이, 최대 5개)"
                    value={hashtags}
                    onChange={(e) => setHashtags(e.target.value)}
                    style={S.input}
                  />
                  <input
                    placeholder="링크 (쉼표 구분)"
                    value={graduatedLinks}
                    onChange={(e) => setGraduatedLinks(e.target.value)}
                    style={S.input}
                  />
                  <br />
                  <input
                    placeholder="연락받을 이메일 (비우면 로그인 이메일)"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    style={S.input}
                  />
                  <br />
                  <button onClick={() => void submitGraduatedProfile()}>
                    현업자 정보 저장 (가입 완료 · 토큰 교체)
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => void loadDepartments()}>
                    학과 목록 받기
                  </button>
                  <br />
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    style={S.input}
                  >
                    <option value="">학과 선택</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  <br />
                  {nameInput}
                  <input
                    placeholder="관심 분야 (쉼표 구분)"
                    value={interests}
                    onChange={(e) => setInterests(e.target.value)}
                    style={S.input}
                  />
                  <br />
                  <input
                    placeholder="연락받을 이메일 (비우면 gist 이메일)"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    style={S.input}
                  />
                  <br />
                  <button onClick={() => void submitProfile()}>
                    추가 정보 저장 (가입 완료 · 토큰 교체)
                  </button>
                </>
              )}
            </fieldset>
          </section>

          {graduated ? (
            <section style={S.box}>
              <h2>가입 완료 후 추가 검증 (현업자)</h2>
              <p style={S.note}>
                순서: 재학생 계정 B 로 이 현업자에게 요청 → 로그아웃 → 현업자
                계정 A → B → C → 로그아웃 → 재학생 계정 C. 받은 요청이 없으면 빈
                배열이라 항목 스키마가 검사되지 않습니다.
              </p>

              <fieldset
                style={S.step}
                disabled={me?.status !== "active" || busy !== null}
              >
                <legend>A. 받은 요청 목록</legend>
                <p style={S.note}>
                  읽기 전용입니다. ReceivedList · ReceivedRequest 를 보고, 고른
                  요청으로 B · C 를 진행합니다.
                </p>
                <button onClick={() => void loadReceived()}>
                  받은 요청 불러오기
                </button>
                <br />
                <select
                  value={receivedId}
                  onChange={(e) => setReceivedId(e.target.value)}
                  style={S.input}
                >
                  <option value="">요청 선택</option>
                  {received.map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                      disabled={item.student_withdrawn}
                    >
                      {item.created_at} · {item.status}
                      {item.student_withdrawn ? " · 탈퇴" : ""}
                    </option>
                  ))}
                </select>
              </fieldset>

              <fieldset
                style={S.step}
                disabled={
                  me?.status !== "active" || !receivedId || busy !== null
                }
              >
                <legend>B. 받은 요청 상세</legend>
                <p style={S.warn}>
                  ⚠️ 첫 호출이 status 를 requested → viewed 로 바꿉니다.
                </p>
                <p style={S.note}>
                  ReceivedRequestDetail · RequestStudent 를 봅니다. 목록의
                  status 가 바뀐 것은 A 를 다시 눌러 확인하세요.
                </p>
                <button onClick={() => void openReceived()}>상세 열기</button>
              </fieldset>

              <fieldset
                style={S.step}
                disabled={
                  me?.status !== "active" || !receivedId || busy !== null
                }
              >
                <legend>C. 연락처 공유</legend>
                <p style={S.warn}>
                  ⚠️ 재학생에게 <b>실제 알림과 내 연락처가 전달됩니다.</b>{" "}
                  되돌릴 수 없습니다.
                </p>
                <p style={S.note}>
                  ShareContactResult 를 보고, 상세를 다시 불러 반영됐는지
                  확인합니다. 같은 요청에 다시 눌러도 알림은 다시 가지 않습니다.
                </p>
                <button onClick={() => void shareContact()}>연락처 공유</button>
              </fieldset>
            </section>
          ) : (
            <section style={S.box}>
              <h2>가입 완료 후 추가 검증 (재학생)</h2>
              <p style={S.note}>
                빈 배열은 스키마를 그냥 통과합니다. 항목이 하나라도 있어야 항목
                스키마가 실제로 검사됩니다.
              </p>

              <fieldset
                style={S.step}
                disabled={me?.status !== "active" || busy !== null}
              >
                <legend>A. 프로필 수정 + 링크 첨부</legend>
                <p style={S.note}>
                  현재 프로필을 그대로 다시 보내면서 포트폴리오 링크를 하나
                  추가합니다. <code>AttachmentSchema</code> 와 "토큰이 오지
                  않는" 수정 경로를 함께 봅니다.
                </p>
                <input
                  placeholder="포트폴리오 링크"
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  style={S.input}
                />
                <button onClick={() => void resubmitProfile()}>
                  프로필 다시 저장
                </button>
              </fieldset>

              <fieldset
                style={S.step}
                disabled={me?.status !== "active" || busy !== null}
              >
                <legend>B. 커피챗 요청</legend>
                <p style={S.warn}>
                  ⚠️ 목록의 현업자에게 <b>실제 알림이 발송됩니다.</b>
                </p>
                <p style={S.note}>
                  CheersRequestResult → SentRequest(목록 항목) →
                  SentRequestDetail 셋을 한 번에 엽니다.
                </p>
                <input
                  placeholder="받을 현업자 닉네임 (비우면 최근 가입 중 첫 번째)"
                  value={targetNickname}
                  onChange={(e) => setTargetNickname(e.target.value)}
                  style={S.input}
                />
                <br />
                <input
                  placeholder="질문 내용"
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  style={{ ...S.input, minWidth: 420 }}
                />
                <button onClick={() => void requestCheers()}>
                  커피챗 요청 보내기
                </button>
              </fieldset>

              <fieldset
                style={S.step}
                disabled={me?.status !== "active" || busy !== null}
              >
                <legend>C. 공유받은 연락처 확인</legend>
                <p style={S.note}>
                  현업자 계정에서 연락처를 공유한 뒤 돌아와 누릅니다.
                  contact_shared 인 요청의 상세를 열어 SharedContact 를 봅니다.
                  첫 조회가 "확인함" 으로 기록됩니다.
                </p>
                <button onClick={() => void checkSharedContact()}>
                  공유받은 연락처 확인
                </button>
              </fieldset>
            </section>
          )}

          <section style={S.box}>
            <h2>보고서</h2>
            {report ? (
              <button
                onClick={() => void navigator.clipboard.writeText(report)}
              >
                보고서 복사
              </button>
            ) : (
              <p style={S.note}>아직 실행한 검사가 없습니다.</p>
            )}
            <button onClick={() => setChecks([])} disabled={!checks.length}>
              비우기
            </button>
            {report ? <pre style={S.pre}>{report}</pre> : null}
          </section>
        </>
      ) : null}
    </main>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { fontFamily: "ui-monospace, monospace", padding: 24, lineHeight: 1.7 },
  box: {
    border: "1px solid #ddd",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  step: {
    border: "1px solid #eee",
    borderRadius: 6,
    padding: 12,
    marginTop: 12,
  },
  note: { color: "#666", fontSize: 13 },
  warn: { color: "#a33", fontSize: 13 },
  input: { margin: "4px 8px 4px 0", padding: 4, minWidth: 260 },
  pre: {
    whiteSpace: "pre-wrap",
    background: "#f4f4f4",
    padding: 16,
    fontSize: 12,
  },
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={createQueryClient()}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
