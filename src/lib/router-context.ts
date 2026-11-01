import type { QueryClient } from "@tanstack/react-query";

/**
 * 모든 라우트가 받는 컨텍스트.
 *
 * 가드에서 `context.queryClient.ensureQueryData(userInfoQuery())` 로 내 정보를
 * 받는다. 화면이 쓰는 캐시와 같은 것이라, 가드와 화면이 서로 다른 role 을
 * 보는 일이 구조적으로 생기지 않는다.
 */
export type RouterContext = {
  queryClient: QueryClient;
};
