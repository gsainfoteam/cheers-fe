/**
 * API 레이어의 공개 창구. 화면은 `@/api` 에서만 가져다 쓴다.
 *
 * 구조
 *  - dto.ts       응답 DTO 의 zod 스키마. 타입은 여기서 파생된다 (단일 출처)
 *  - schema.ts    경로 · 쿼리 · 요청 본문 (`paths`)
 *  - client.ts    토큰 주입 + 401 자동 갱신이 붙은 타입 세이프 클라이언트
 *  - auth.ts      refresh 단일화(탭 안 · 탭 사이), 가입 완료 시 토큰 교체
 *  - tokens.ts    토큰 저장소 (localStorage, 탭 간 동기화)
 *  - user / student / graduated / cheers / file — 명세의 섹션과 1:1
 *
 * 백엔드가 OpenAPI 를 내보내지 않으므로 `dto.ts` 와 `schema.ts` 는 손으로
 * 유지한다. 명세가 바뀌면 같은 PR 에서 함께 고칠 것.
 */

export { api } from "./client";
export { onUnauthenticated, refreshAccessToken } from "./auth";
export {
  ApiError,
  ContractError,
  isApiError,
  isContractError,
  remainingAttemptsOf,
  unwrap,
} from "./errors";
export { createQueryClient } from "./query-client";
export { keys } from "./keys";
export type { PageParams } from "./keys";
export {
  clearTokens,
  getAccessToken,
  getTokens,
  setTokens,
  subscribeTokens,
} from "./tokens";
export type { Tokens } from "./tokens";

/** 응답 스키마. 목 데이터를 계약에 맞춰 만들 때 쓴다 */
export * as schemas from "./dto";

export {
  consentListQuery,
  useLogin,
  useLogout,
  useSubmitConsent,
  useWithdraw,
  userInfoQuery,
} from "./user";
export {
  studentDepartmentsQuery,
  useSendStudentVerifyCode,
  useSubmitStudentInfo,
  useVerifyStudentCode,
} from "./student";
export { useSubmitGraduatedInfo, useVerifyBusinessCard } from "./graduated";
export {
  cheersListQuery,
  receivedRequestQuery,
  receivedRequestsQuery,
  sentRequestQuery,
  sentRequestsQuery,
  useRequestCheers,
  useShareContact,
} from "./cheers";
export { uploadFile, useUploadFile } from "./file";
export type { UploadedFile, UploadPurpose } from "./file";

export type * from "./types";
