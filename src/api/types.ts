import type { paths } from "./schema";

/**
 * 엔드포인트의 요청 본문 타입. `Body<"/api/v1/user/consent", "post">` 처럼 쓴다.
 *
 * 응답에는 짝이 되는 헬퍼가 없다. 일부러다 — 응답 타입은 `dto.ts` 의 zod
 * 스키마에서 파생된 것을 쓴다. 생성 타입에서 가져오면 런타임 검사가 빠지고,
 * 페이징 응답은 명세의 `allOf` 가 `Record<string, never>[] & T[]` 로 풀려
 * 목 데이터조차 만들 수 없다.
 */
export type Body<
  P extends keyof paths,
  M extends keyof paths[P],
> = paths[P][M] extends {
  requestBody: { content: { "application/json": infer B } };
}
  ? B
  : never;

/** 응답 DTO 타입은 전부 zod 스키마에서 파생된다 */
export type * from "./dto";
