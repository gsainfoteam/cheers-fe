import { QueryClient } from "@tanstack/react-query";
import { isApiError } from "./errors";

/**
 * QueryClient 는 모듈 최상단이 아니라 이 함수로 만든다.
 * 테스트마다 깨끗한 캐시를 쓰기 위해서다.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        /**
         * 4xx 는 다시 보내도 결과가 같다. 특히 429(인증코드 재전송 대기)를
         * 자동 재시도하면 쿨다운만 길어지고, 403(가입 단계 불일치)은
         * 재시도가 아니라 라우팅으로 풀어야 하는 상황이다.
         */
        retry: (failureCount, error) => {
          if (isApiError(error) && error.status < 500) return false;
          return failureCount < 2;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}
