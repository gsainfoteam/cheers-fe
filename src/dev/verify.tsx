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
  useSubmitStudentInfo,
  userInfoQuery,
} from "@/api";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import type { Role } from "@/lib/session";

/**
 * 개발용 API 응답 확인 페이지 (`/verify.html`).
 *
 * 백엔드가 OpenAPI 를 내보내지 않아 `dto.ts` 를 손으로 유지하는 상황이라,
 * "명세서대로 적은 스키마가 진짜 응답과 맞는가" 를 확인할 수단이 필요하다.
 *
 * 대부분의 엔드포인트는 가입을 마쳐야 열리므로 가입 단계를 직접 밟을 수 있게
 * 해뒀다. **실제 메일이 나가고 실제 계정 상태가 바뀐다.** 그래서 단계마다
 * 버튼을 따로 두고 연쇄 실행하지 않는다.
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

const STEP_LABEL: Record<string, string> = {
  consent: "1. 약관 동의",
  verify: "2. gist 이메일 인증",
  profile: "3. 추가 정보 입력",
};

export function App() {
  const queryClient = useQueryClient();
  const submitStudentInfo = useSubmitStudentInfo();

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

  // 가입 완료 후 추가 검증 입력값
  const [attachmentUrl, setAttachmentUrl] = useState(
    "https://example.com/portfolio"
  );
  const [requestMessage, setRequestMessage] = useState(
    "[검증용] API 연동 테스트로 보낸 요청입니다. 응답하지 않으셔도 됩니다."
  );

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
        interests: interests
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
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
      try {
        const data = await submitStudentInfo.mutateAsync(body);
        const after = getTokens();
        record([
          {
            label: "POST /api/v1/user/student/info (useSubmitStudentInfo)",
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
          },
        ]);
      } catch (error) {
        record([
          {
            label: "POST /api/v1/user/student/info (useSubmitStudentInfo)",
            status: isApiError(error) ? error.status : "throw",
            schema: isContractError(error) ? "fail" : "skipped",
            issues: isContractError(error)
              ? lines(error.detail)
              : [error instanceof Error ? error.message : String(error)],
            body: isApiError(error) ? error.body : null,
          },
        ]);
      }
      queryClient.clear();
      await refreshMe();
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

      // 전체 교체 방식이라 현재 값을 모두 다시 보낸다
      const links = profile.attachments.filter((a) => a.source === "link");
      const files = profile.attachments.filter((a) => a.source === "file");
      if (files.length) {
        record([
          {
            label: "POST /api/v1/user/student/info (수정 · 링크 첨부 추가)",
            status: "throw",
            schema: "skipped",
            issues: [
              `파일 첨부 ${files.length}건은 되돌려 보낼 수 없어 전송을 중단했습니다 (전체 교체 방식이라 삭제됨)`,
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
            label: "POST /api/v1/user/student/info (수정 · 링크 첨부 추가)",
            status: "2xx",
            schema: "pass",
            issues: [
              `응답에 토큰: ${data.access_token ? "있음 ⚠️ (수정인데 재발급?)" : "없음 ✅ (명세대로)"}`,
              `저장된 토큰: ${before?.accessToken !== after?.accessToken ? "바뀜 ⚠️" : "그대로 ✅ (adoptIssuedTokens 가 올바르게 아무것도 안 함)"}`,
              ...(files.length
                ? [
                    `⚠️ 파일 첨부 ${files.length}건은 되돌려 보낼 수 없어 사라집니다 — 응답은 url 을, 요청은 key 를 받습니다`,
                  ]
                : []),
            ],
            body: redact(data),
          },
        ]);
      } catch (error) {
        record([
          {
            label: "POST /api/v1/user/student/info (수정 · 링크 첨부 추가)",
            status: isApiError(error) ? error.status : "throw",
            schema: isContractError(error) ? "fail" : "skipped",
            issues: isContractError(error)
              ? lines(error.detail)
              : [error instanceof Error ? error.message : String(error)],
            body: isApiError(error) ? error.body : null,
          },
        ]);
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
      const { data: list } = await api.GET("/api/v1/cheers", {
        params: { query: { size: 10 } },
      });
      const target = list?.items.find((item) => item.can_request);
      if (!target) {
        record([
          {
            label: "POST /api/v1/cheers/request",
            status: "throw",
            schema: "skipped",
            issues: ["요청 가능한(can_request) 현업자가 목록에 없습니다"],
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
              {busy === "sweep" ? "확인 중…" : "6개 엔드포인트 점검"}
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
                    ? STEP_LABEL[step]
                    : "가입 완료"}
              </b>
            </p>

            <fieldset
              style={S.step}
              disabled={!me || step !== "consent" || busy !== null}
            >
              <legend>{STEP_LABEL.consent}</legend>
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
              <legend>{STEP_LABEL.verify}</legend>
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
            </fieldset>

            <fieldset
              style={S.step}
              disabled={!me || step !== "profile" || busy !== null}
            >
              <legend>{STEP_LABEL.profile}</legend>
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
              {me?.name ? null : (
                <>
                  <input
                    placeholder="이름 (최초 1회만 저장됨)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={S.input}
                  />
                  <br />
                </>
              )}
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
            </fieldset>
          </section>

          <section style={S.box}>
            <h2>가입 완료 후 추가 검증</h2>
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
                추가합니다. <code>AttachmentSchema</code> 와 "토큰이 오지 않는"
                수정 경로를 함께 봅니다.
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
                CheersRequestResult → SentRequest(목록 항목) → SentRequestDetail
                셋을 한 번에 엽니다.
              </p>
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
          </section>

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
