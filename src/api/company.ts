import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { api } from "./client";
import { CompanySearchResultSchema } from "./dto";
import { unwrap } from "./errors";
import { keys } from "./keys";

/**
 * 회사 검색 (현업자). 최대 10개.
 *
 * 별칭 · 표기 흔들림(대소문자 · 공백)은 서버가 맞춘다 — "마소" 로도
 * Microsoft 가 걸린다. 클라이언트는 검색어를 그대로 보낸다.
 *
 * 명세상 `q` 는 필수다. 빈 검색어로 부르지 않도록 `enabled` 로 막는다.
 * 403 은 가입 중인데 `next_step` 이 `profile` 이 아닐 때 — 회사 칸은 기본 정보
 * · 정보 수정에만 있으므로 정상 흐름에선 나지 않는다.
 */
export function companySearchQuery(q: string) {
  const query = q.trim();
  return queryOptions({
    queryKey: keys.companySearch(query),
    queryFn: async ({ signal }) =>
      unwrap(
        await api.GET("/api/v1/company", {
          params: { query: { q: query } },
          signal,
        }),
        CompanySearchResultSchema
      ),
    enabled: query.length > 0,
    // 검색어를 바꾸는 동안 결과 칩이 비었다 찼다 깜빡이지 않게 한다
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  });
}
