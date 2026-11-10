/**
 * API 레이어의 공개 창구. 화면은 `@/api` 에서만 가져다 쓴다.
 *
 * 구조
 *  - openapi.json   백엔드 OpenAPI 문서. 커밋한다 (명세 변경이 diff 에 보이도록)
 *  - schema.gen.ts  openapi.json 에서 생성. 손대지 않는다
 *  - schema.ts      생성물 위의 얇은 층 — `/api/v1` 만 남긴다
 *  - dto.ts         응답 DTO 의 zod 스키마. 응답 타입의 단일 출처
 *  - client.ts      토큰 주입 + 401 자동 갱신이 붙은 타입 세이프 클라이언트
 *  - auth.ts        refresh 단일화(탭 안 · 탭 사이), 가입 완료 시 토큰 교체
 *  - tokens.ts      토큰 저장소 (localStorage, 탭 간 동기화)
 *  - user / student / graduated / company / cheers / file — 명세의 섹션과 1:1
 *
 * 요청은 생성, 응답은 손으로. 경계가 갈린 이유는 dto.ts 머리말에 있다.
 *
 * 명세가 바뀌면:
 *   bun run api:sync      받기 → 생성 → dto.ts 대조
 * 대조가 실패하면 dto.ts 를 고친다. 기계가 짚어준 자리만 고치면 된다.
 */

export { api } from "./client";
export { onUnauthenticated, refreshAccessToken } from "./auth";
export {
  ApiError,
  ContractError,
  isApiError,
  isContractError,
  isEmailAlreadyRegistered,
  remainingAttemptsOf,
  retryAvailableAtOf,
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
  studentInterestsQuery,
  useSendStudentVerifyCode,
  useSubmitStudentInfo,
  useVerifyStudentCode,
} from "./student";
export { useSubmitGraduatedInfo, useVerifyBusinessCard } from "./graduated";
export { companySearchQuery } from "./company";
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
