/**
 * 백엔드 OpenAPI 문서를 받아 `src/api/openapi.json` 에 저장한다.
 *
 * 서버는 한 줄짜리 JSON 을 주는데, 그대로 커밋하면 명세가 바뀔 때마다 diff 가
 * "한 줄이 바뀜" 으로만 보여서 리뷰가 불가능하다. 들여써서 저장하는 이유다.
 *
 *   bun run api:pull                     스테이징에서 받기
 *   API_DOCS_URL=... bun run api:pull    다른 서버에서 받기
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const URL_ =
  process.env.API_DOCS_URL ?? "https://api.stg.cheers.gistory.me/api-docs-json";
const OUT = fileURLToPath(new URL("../src/api/openapi.json", import.meta.url));

const response = await fetch(URL_);
if (!response.ok) {
  console.error(`${URL_} → HTTP ${response.status}`);
  process.exit(1);
}

const spec = await response.json();
if (!spec?.openapi || !spec?.paths) {
  console.error(`${URL_} 가 OpenAPI 문서가 아닙니다`);
  process.exit(1);
}

writeFileSync(OUT, JSON.stringify(spec, null, 2) + "\n");

const v1 = Object.keys(spec.paths).filter((p) => p.startsWith("/api/v1"));
console.log(
  `${URL_} → src/api/openapi.json  (openapi ${spec.openapi}, 전체 ${Object.keys(spec.paths).length}개 중 /api/v1 ${v1.length}개)`
);
