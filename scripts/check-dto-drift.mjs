/**
 * `dto.ts` 의 zod 스키마가 `openapi.json` 과 어긋났는지 검사한다.
 *
 * 왜 필요한가
 *  - 경로 · 요청 본문은 `schema.gen.ts` 로 생성하므로 드리프트가 구조적으로 없다
 *  - 응답은 손으로 적은 zod 다. 런타임 검사와 주석(= 데인 기록)을 지키려고
 *    생성하지 않는 대신, 어긋남은 여기서 기계가 잡는다
 *
 * 검사하는 것: 필드 이름 · nullable · optional · enum 값, 그리고 명세에 새로
 * 생긴 응답 DTO 가 dto.ts 에 빠지지 않았는지.
 *
 *   bun run api:check
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const spec = JSON.parse(
  readFileSync(fileURLToPath(new URL("../src/api/openapi.json", import.meta.url)), "utf8")
);
const dto = await import(new URL("../src/api/dto.ts", import.meta.url).href);
const S = spec.components.schemas;

/**
 * 명세의 DTO ↔ dto.ts 의 zod 스키마.
 *
 * **명세에 응답 DTO 가 새로 생기면 여기에 한 줄을 더해야 한다.** 빠뜨리면
 * "매핑되지 않은 DTO" 로 잡힌다.
 */
const MAP = {
  DepartmentDto: "DepartmentSchema",
  AttachmentDto: "AttachmentSchema",
  StudentAttachmentDto: "StudentAttachmentSchema",
  ContactDto: "ContactSchema",
  StudentProfileDto: "StudentProfileSchema",
  StudentInfoDto: "StudentInfoSchema",
  GraduatedProfileDto: "GraduatedProfileSchema",
  GraduatedInfoDto: "GraduatedInfoSchema",
  UserInfoDto: "UserInfoSchema",
  LoginResponseDto: "TokenPairSchema",
  RefreshResponseDto: "AccessTokenSchema",
  BaseResultDto: "OkResultSchema",
  SignupCompleteResponseDto: "SignupResultSchema",
  ConsentDto: "ConsentSchema",
  ConsentListResponseDto: "ConsentListSchema",
  DepartmentListResponseDto: "DepartmentListSchema",
  InterestListResponseDto: "InterestListSchema",
  SendCodeResponseDto: "SendCodeResultSchema",
  UploadUrlResponseDto: "UploadUrlSchema",
  CompanySearchItemDto: "CompanySearchItemSchema",
  CheersCardDto: "CheersCardSchema",
  CreateRequestResponseDto: "CheersRequestResultSchema",
  RequestGraduatedDto: "RequestGraduatedSchema",
  SentRequestDto: "SentRequestSchema",
  SharedContactDto: "SharedContactSchema",
  SentRequestDetailDto: "SentRequestDetailSchema",
  ReceivedRequestDto: "ReceivedRequestSchema",
  RequestStudentDto: "RequestStudentSchema",
  ReceivedRequestDetailDto: "ReceivedRequestDetailSchema",
  ShareContactResponseDto: "ShareContactResultSchema",
};

/**
 * 페이징 응답은 명세에서 `allOf: [PageResponseDto, { items: X[] }]` 인라인이라
 * 이름이 붙은 DTO 가 없다. zod 쪽은 펼쳐 적었으므로 따로 짝을 짓는다.
 */
const PAGED = {
  CheersListSchema: "CheersCardDto",
  SentListSchema: "SentRequestDto",
  ReceivedListSchema: "ReceivedRequestDto",
};

/** 에러 본문은 화면이 `status` 로 분기하므로 zod 로 검사하지 않는다 */
const ERROR_DTOS = new Set([
  "ErrorResponseDto",
  "EmailAlreadyRegisteredErrorDto",
  "SendCodeRateLimitErrorDto",
  "VerifyCodeErrorDto",
]);

const problems = [];
const fail = (msg) => problems.push(msg);

/* ── /api/v1 의 2xx 응답에서 닿을 수 있는 DTO 를 모은다 ──────────────────── */

const reachable = new Set();
function walk(node) {
  if (!node || typeof node !== "object") return;
  if (node.$ref) {
    const name = node.$ref.split("/").pop();
    if (reachable.has(name)) return;
    reachable.add(name);
    walk(S[name]);
    return;
  }
  for (const key of ["items", "additionalProperties"]) walk(node[key]);
  for (const list of ["allOf", "oneOf", "anyOf"]) (node[list] ?? []).forEach(walk);
  for (const v of Object.values(node.properties ?? {})) walk(v);
}

for (const [path, ops] of Object.entries(spec.paths)) {
  if (!path.startsWith("/api/v1")) continue;
  for (const op of Object.values(ops)) {
    if (typeof op !== "object") continue;
    for (const [code, res] of Object.entries(op.responses ?? {})) {
      if (!/^2\d\d$/.test(code)) continue;
      walk(res.content?.["application/json"]?.schema);
    }
  }
}

for (const name of reachable) {
  if (ERROR_DTOS.has(name) || name === "PageResponseDto") continue;
  if (!MAP[name]) {
    fail(`명세에 응답 DTO \`${name}\` 가 있는데 dto.ts 에 짝이 없습니다 (MAP 에 추가하고 스키마를 작성할 것)`);
  }
}

/* ── 필드 단위 대조 ─────────────────────────────────────────────────────── */

const shapeOf = (z) => {
  const s = z?._def?.shape ?? z?.def?.shape ?? z?.shape;
  return typeof s === "function" ? s() : s;
};
const deref = (d) => (d?.$ref ? S[d.$ref.split("/").pop()] : d);

function compare(label, zod, props, required) {
  const shape = shapeOf(zod);
  if (!shape) return fail(`${label}: zod 스키마의 shape 를 읽지 못했습니다`);

  const zKeys = Object.keys(shape);
  const sKeys = Object.keys(props ?? {});

  for (const k of sKeys) if (!zKeys.includes(k)) fail(`${label}.${k}: 명세에만 있습니다`);
  for (const k of zKeys) if (!sKeys.includes(k)) fail(`${label}.${k}: dto.ts 에만 있습니다`);

  for (const [k, prop] of Object.entries(props ?? {})) {
    const field = shape[k];
    if (!field) continue;

    const zNullable = field.safeParse(null).success;
    const sNullable = !!deref(prop)?.nullable || !!prop.nullable;
    if (zNullable !== sNullable) {
      fail(`${label}.${k}: nullable 이 다릅니다 (dto.ts=${zNullable}, 명세=${sNullable})`);
    }

    const zOptional = field.safeParse(undefined).success;
    const sOptional = !(required ?? []).includes(k);
    if (zOptional !== sOptional) {
      fail(`${label}.${k}: optional 이 다릅니다 (dto.ts=${zOptional}, 명세=${sOptional})`);
    }

    const sEnum = deref(prop)?.enum;
    if (sEnum) {
      const inner = field.def?.innerType ?? field;
      const zEnum = inner.def?.entries ? Object.values(inner.def.entries) : null;
      const sorted = [...sEnum].sort();
      const mismatch = zEnum
        ? JSON.stringify([...zEnum].sort()) !== JSON.stringify(sorted)
        : !sEnum.every((v) => field.safeParse(v).success);
      if (mismatch) {
        fail(`${label}.${k}: enum 이 다릅니다 (dto.ts=${JSON.stringify(zEnum)}, 명세=${JSON.stringify(sorted)})`);
      }
    }
  }
}

for (const [dtoName, zodName] of Object.entries(MAP)) {
  const d = S[dtoName];
  const z = dto[zodName];
  if (!d) { fail(`명세에 \`${dtoName}\` 가 없습니다 (MAP 에서 지울 것)`); continue; }
  if (!z) { fail(`dto.ts 가 \`${zodName}\` 를 내보내지 않습니다`); continue; }
  compare(zodName, z, d.properties, d.required);
}

/* ── 페이징 응답 ────────────────────────────────────────────────────────── */

const page = S.PageResponseDto;
for (const [zodName, itemDto] of Object.entries(PAGED)) {
  const z = dto[zodName];
  if (!z) { fail(`dto.ts 가 \`${zodName}\` 를 내보내지 않습니다`); continue; }
  compare(zodName, z, page.properties, page.required);

  const shape = shapeOf(z);
  const sample = { items: [], page: 1, size: 20, total: 0 };
  if (!z.safeParse(sample).success) fail(`${zodName}: 빈 페이지를 받지 못합니다`);
  if (!shape?.items) fail(`${zodName}: items 가 없습니다`);
}

// 명세의 페이징 래핑이 그대로인지 — 백엔드가 모양을 바꾸면 여기서 걸린다
for (const [path, ops] of Object.entries(spec.paths)) {
  if (!path.startsWith("/api/v1")) continue;
  const schema = ops.get?.responses?.["200"]?.content?.["application/json"]?.schema;
  if (!schema?.allOf) continue;
  const [base, override] = schema.allOf;
  if (base?.$ref !== "#/components/schemas/PageResponseDto") {
    fail(`GET ${path}: 페이징 래핑이 PageResponseDto 가 아닙니다`);
  }
  const item = override?.properties?.items?.items?.$ref?.split("/").pop();
  const expected = Object.values(PAGED);
  if (item && !expected.includes(item)) {
    fail(`GET ${path}: items 가 \`${item}\` 인데 PAGED 에 없습니다`);
  }
}

/* ── 보고 ───────────────────────────────────────────────────────────────── */

if (problems.length) {
  console.error(`dto.ts 가 명세와 어긋납니다 — ${problems.length}건\n`);
  for (const p of problems) console.error(`  · ${p}`);
  console.error(`\n고친 뒤 다시 실행하세요: bun run api:check`);
  process.exit(1);
}

console.log(
  `dto.ts ↔ openapi.json 일치 — 응답 DTO ${Object.keys(MAP).length}개 + 페이징 ${Object.keys(PAGED).length}개 (필드 · nullable · optional · enum)`
);
