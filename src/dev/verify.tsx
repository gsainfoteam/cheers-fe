import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import type { z } from "zod";
import { api, createQueryClient, getTokens, schemas } from "@/api";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { toApiType } from "@/lib/role";
import type { Role } from "@/lib/session";

/**
 * 개발용 API 응답 확인 페이지 (`/verify.html`).
 *
 * 구글 로그인 뒤 실제 응답을 받아 `dto.ts` 의 스키마와 대조한다. 백엔드가
 * OpenAPI 를 내보내지 않아 계약서를 손으로 유지하는 상황이라, "명세서대로
 * 적은 스키마가 진짜 응답과 맞는가" 를 확인할 수단이 따로 필요하다.
 *
 * 라우터에 등록하지 않았고 `vite build` 의 진입점도 아니라서 배포물에는
 * 들어가지 않는다. 필요 없어지면 이 파일과 `verify.html` 을 지우면 된다.
 */

type Check = {
  label: string;
  status: number | "network-error";
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
      status: "network-error",
      schema: "skipped",
      issues: [error instanceof Error ? error.message : String(error)],
      body: null,
    };
  }
}

async function runAll(): Promise<Check[]> {
  const results: Check[] = [];

  results.push(
    await check(
      "GET /api/v1/user/info",
      () => api.GET("/api/v1/user/info"),
      schemas.UserInfoSchema
    )
  );
  results.push(
    await check(
      "GET /api/v1/user/consent/list",
      () => api.GET("/api/v1/user/consent/list"),
      schemas.ConsentListSchema
    )
  );
  results.push(
    await check(
      "GET /api/v1/user/student/departments",
      () => api.GET("/api/v1/user/student/departments"),
      schemas.DepartmentListSchema
    )
  );
  results.push(
    await check(
      "GET /api/v1/cheers",
      () => api.GET("/api/v1/cheers", { params: { query: { size: 3 } } }),
      schemas.CheersListSchema
    )
  );
  results.push(
    await check(
      "GET /api/v1/cheers/sent",
      () => api.GET("/api/v1/cheers/sent", { params: { query: { size: 3 } } }),
      schemas.SentListSchema
    )
  );
  results.push(
    await check(
      "GET /api/v1/cheers/received",
      () =>
        api.GET("/api/v1/cheers/received", { params: { query: { size: 3 } } }),
      schemas.ReceivedListSchema
    )
  );

  return results;
}

export function App() {
  const [role, setRole] = useState<Role>("student");
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [running, setRunning] = useState(false);
  const signedIn = getTokens() !== null;

  const run = async () => {
    setRunning(true);
    setChecks(await runAll());
    setRunning(false);
  };

  const report = checks
    ? [
        `API 응답 검증 — ${new Date().toISOString()}`,
        `유형: ${toApiType(role)}`,
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

  return (
    <main style={{ fontFamily: "monospace", padding: 24, lineHeight: 1.6 }}>
      <h1>API 응답 확인</h1>

      <section>
        <p>
          1. 유형 선택 →{" "}
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
        </p>
      </section>

      <section>
        <p>2. 구글 로그인 {signedIn ? "(이미 로그인됨)" : ""}</p>
        <GoogleSignInButton role={role} onSuccess={() => void run()} />
      </section>

      <section>
        <p>3. 검증</p>
        <button onClick={() => void run()} disabled={running}>
          {running ? "확인 중…" : "지금 확인"}
        </button>{" "}
        {report ? (
          <button onClick={() => void navigator.clipboard.writeText(report)}>
            보고서 복사
          </button>
        ) : null}
      </section>

      {report ? (
        <pre
          style={{ whiteSpace: "pre-wrap", background: "#f4f4f4", padding: 16 }}
        >
          {report}
        </pre>
      ) : null}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={createQueryClient()}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
