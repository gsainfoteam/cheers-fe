import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "./client";
import {
  ConsentListSchema,
  OkResultSchema,
  TokenPairSchema,
  UserInfoSchema,
} from "./dto";
import { unwrap } from "./errors";
import { keys } from "./keys";
import { clearTokens, getTokens, setTokens } from "./tokens";
import type { Body } from "./types";

/**
 * 내 정보. 앱 진입 시 항상 호출해서 `next_step` 으로 이동할 화면을 정한다.
 *
 * 라우트 가드와 화면이 반드시 같은 데이터를 봐야 하므로, 양쪽 모두 이
 * queryOptions 하나를 쓴다. 가드에서는
 * `queryClient.ensureQueryData(userInfoQuery())`, 화면에서는
 * `useSuspenseQuery(userInfoQuery())`.
 */
export function userInfoQuery() {
  return queryOptions({
    queryKey: keys.userInfo(),
    queryFn: async ({ signal }) =>
      unwrap(await api.GET("/api/v1/user/info", { signal }), UserInfoSchema),
    staleTime: 5 * 60_000,
  });
}

/** 모든 약관의 최신 버전과 내 동의 여부 */
export function consentListQuery() {
  return queryOptions({
    queryKey: keys.consentList(),
    queryFn: async ({ signal }) =>
      unwrap(
        await api.GET("/api/v1/user/consent/list", { signal }),
        ConsentListSchema
      ),
    select: (data) => data.consents,
    staleTime: 10 * 60_000,
  });
}

/**
 * OAuth 로그인.
 *
 * 성공하면 캐시를 통째로 비운다. 계정을 바꿔 로그인했을 때 이전 사용자의
 * 내 정보나 커피챗 목록이 한 프레임이라도 보이면 안 된다.
 */
export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: Body<"/api/v1/user/oauth/login", "post">) =>
      unwrap(
        await api.POST("/api/v1/user/oauth/login", { body }),
        TokenPairSchema
      ),
    onSuccess: (data) => {
      queryClient.clear();
      setTokens({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
      });
    },
  });
}

/** 약관 동의. 가입 단계와 마이페이지 수정에 모두 쓴다 */
export function useSubmitConsent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: Body<"/api/v1/user/consent", "post">) =>
      unwrap(await api.POST("/api/v1/user/consent", { body }), OkResultSchema),
    // next_step 과 consent_required 가 함께 바뀐다. 다음 화면으로 넘어가기 전에
    // 새 값을 받아둬야 가드가 방금 끝낸 단계로 되돌려보내지 않는다
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.user }),
  });
}

/**
 * 로그아웃.
 *
 * 서버 호출이 실패해도 로컬 세션은 반드시 지운다. 지우지 않으면 사용자는
 * 로그아웃을 눌렀는데 여전히 로그인 상태인 화면을 보게 된다.
 */
export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const tokens = getTokens();
      if (!tokens) return;
      await api
        .POST("/api/v1/user/logout", {
          body: { refresh_token: tokens.refreshToken },
        })
        .catch(() => undefined);
    },
    onSettled: () => {
      clearTokens();
      queryClient.clear();
    },
  });
}

/** 회원 탈퇴. 성공 여부와 무관하게 로컬 세션을 정리한다 */
export function useWithdraw() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () =>
      unwrap(await api.POST("/api/v1/user/withdraw"), OkResultSchema),
    onSettled: () => {
      clearTokens();
      queryClient.clear();
    },
  });
}
