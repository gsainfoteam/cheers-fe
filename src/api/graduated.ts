import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adoptIssuedTokens } from "./auth";
import { api } from "./client";
import { OkResultSchema, SignupResultSchema } from "./dto";
import { unwrap } from "./errors";
import { keys } from "./keys";
import type { Body } from "./types";

/**
 * 명함 사진 등록. `uploadFile({ purpose: "business_card" })` 로 받은 key 를 보낸다.
 * 별도 검수 없이 등록 즉시 인증이 완료된다.
 */
export function useVerifyBusinessCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      body: Body<"/api/v1/user/graduated/verify/business-card", "post">
    ) =>
      unwrap(
        await api.POST("/api/v1/user/graduated/verify/business-card", { body }),
        OkResultSchema
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.user }),
  });
}

/**
 * 현업자 추가 정보 저장. 가입 시 입력과 마이페이지 수정에 모두 쓴다.
 *
 * `nickname` 은 가입 시에만 의미가 있다 — 이후에 보내면 서버가 무시한다.
 * 전체 교체 방식이라 바꾸지 않은 항목까지 모두 보내야 한다.
 */
export function useSubmitGraduatedInfo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: Body<"/api/v1/user/graduated/info", "post">) =>
      unwrap(
        await api.POST("/api/v1/user/graduated/info", { body }),
        SignupResultSchema
      ),
    onSuccess: (data) => {
      // 이 호출로 가입이 끝났다면 새 토큰이 함께 온다
      adoptIssuedTokens(data);
      return queryClient.invalidateQueries({ queryKey: keys.user });
    },
  });
}
