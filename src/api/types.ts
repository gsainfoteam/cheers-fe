import type { paths } from "./schema";

/** 엔드포인트의 요청 본문 타입. `Body<"/api/v1/user/consent", "post">` 처럼 쓴다 */
export type Body<
  P extends keyof paths,
  M extends keyof paths[P],
> = paths[P][M] extends {
  requestBody: { content: { "application/json": infer B } };
}
  ? B
  : never;

/** 엔드포인트의 성공 응답 타입 */
export type Data<
  P extends keyof paths,
  M extends keyof paths[P],
> = paths[P][M] extends {
  responses: { 200: { content: { "application/json": infer D } } };
}
  ? D
  : never;

/** 응답 DTO 타입은 전부 zod 스키마에서 파생된다 */
export type * from "./dto";
