import type { paths as generated } from "./schema.gen";

/**
 * 백엔드 API 계약 — 경로 · 쿼리 · 요청 본문.
 *
 * 손으로 적지 않는다. `schema.gen.ts` 가 `openapi.json` 에서 생성되고, 이
 * 파일은 그 위에 얇게 덧대 프론트가 쓰는 구간만 남긴다.
 *
 *   bun run api:sync     명세를 받아 다시 생성한다
 *
 * 역할 나누기
 *  - 이 파일 · schema.gen.ts   경로 · 쿼리 · 요청 본문. 컴파일 시점에만 쓰인다
 *  - dto.ts                    응답 모양. zod 라서 런타임에도 검사된다
 *
 * 응답을 생성 타입에서 가져오지 않는 이유는 dto.ts 머리말에 적어뒀다. 요약하면
 * 명세가 서버와 어긋난 적이 실제로 있었고(이슈 #17), 그걸 잡는 건 타입이 아니라
 * 런타임 검사다.
 */

/**
 * 프론트가 호출하는 `/api/v1` 구간만.
 *
 * 어드민은 서버 쪽에서 만들기 때문에 `/api/manager/v1` 28개는 쓸 일이 없다.
 * 타입에서 걷어내야 `api.GET(` 자동완성이 쓸 수 있는 경로만 보여준다.
 */
export type paths = {
  [K in keyof generated as K extends `/api/v1/${string}`
    ? K
    : never]: generated[K];
};
