import type { z } from "zod";

/**
 * API 가 2xx 가 아닌 응답을 줬을 때 던지는 에러.
 *
 * 화면은 대부분 `status` 로 분기한다. 명세의 에러 표가 상태 코드로만
 * 구분되기 때문이다 — 409 는 "현업자가 희망하지 않음", 429 는 "재전송 대기",
 * 410 은 "인증코드 만료" 같은 식으로.
 */
export class ApiError extends Error {
  status: number;
  /** 서버가 준 에러 본문. 형태는 엔드포인트마다 다르다 */
  body: unknown;

  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `API ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * 응답이 `dto.ts` 의 계약과 다를 때 던진다.
 *
 * 서버 장애가 아니라 **우리 계약서가 낡았다는 신호**다. 백엔드가 명세를
 * 바꿨는데 `dto.ts` 가 따라가지 못한 경우가 대부분이고, 고칠 곳은 화면이
 * 아니라 스키마다.
 */
export class ContractError extends Error {
  endpoint: string;
  detail: string;

  constructor(endpoint: string, detail: string) {
    super(`${endpoint} 응답이 계약과 다릅니다\n${detail}`);
    this.name = "ContractError";
    this.endpoint = endpoint;
    this.detail = detail;
  }
}

export function isContractError(error: unknown): error is ContractError {
  return error instanceof ContractError;
}

function endpointOf(response: Response): string {
  try {
    return new URL(response.url).pathname;
  } catch {
    return response.url || "(unknown)";
  }
}

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.map(String).join(".");
      return `  ${path || "(root)"}: ${issue.message}`;
    })
    .join("\n");
}

/**
 * openapi-fetch 의 `{ data, error, response }` 를 풀어서 data 만 돌려준다.
 * 실패하면 던진다 — TanStack Query 는 "던져야" 에러로 인식한다.
 *
 * `schema` 를 주면 응답을 계약과 대조한다. 어긋났을 때의 처리는 환경에 따라
 * 다르다:
 *  - 개발: 던진다. 계약이 밀린 걸 즉시 알아야 고치니까
 *  - 배포: 콘솔에만 남기고 원본을 그대로 통과시킨다. 백엔드가 필드 하나
 *    바꿨다고 사용자 화면이 통째로 깨지는 건 과한 대가다
 */
export function unwrap<T>(
  result: { data?: T; error?: unknown; response: Response },
  schema?: z.ZodType<T>
): T {
  if (!result.response.ok) {
    throw new ApiError(result.response.status, result.error);
  }

  const data = result.data as T;
  if (!schema) return data;

  const parsed = schema.safeParse(data);
  if (parsed.success) return parsed.data;

  const violation = new ContractError(
    endpointOf(result.response),
    formatIssues(parsed.error)
  );
  if (import.meta.env.DEV) throw violation;
  console.error(violation.message);
  return data;
}

/**
 * 인증코드 오입력(400) 응답에서 남은 시도 횟수를 꺼낸다.
 * 명세상 5번 틀리면 코드가 무효가 되므로 화면에 남은 횟수를 보여줘야 한다.
 */
export function remainingAttemptsOf(error: unknown): number | undefined {
  if (!isApiError(error) || error.status !== 400) return undefined;
  const body = error.body;
  if (typeof body !== "object" || body === null) return undefined;
  const value = (body as { remaining_attempts?: unknown }).remaining_attempts;
  return typeof value === "number" ? value : undefined;
}
