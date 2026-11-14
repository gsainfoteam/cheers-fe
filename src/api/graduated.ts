import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adoptIssuedTokens } from "./auth";
import { api } from "./client";
import { NicknameCheckSchema, OkResultSchema, SignupResultSchema } from "./dto";
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
    // 재학생 인증코드 확인과 같다 — 선배 본인확인 화면도 내 정보를 구독하지
    // 않으므로 "all" 이어야 새 `next_step` 이 캐시에 들어온다
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: keys.user,
        refetchType: "all",
      }),
  });
}

/**
 * 닉네임 사용 가능 여부. 가입 기본 정보의 `다음` 에서 부른다(시안 주석
 * 960:10010 "다음 버튼 눌렀을 때 중복 확인", 이슈 #43).
 *
 * - 조회만 하고 **예약하지 않는다.** 확인과 저장 사이에 다른 사람이 같은
 *   닉네임을 가져갈 수 있으므로 저장의 409 처리는 그대로 둔다.
 * - 대소문자 구분 없이 비교한다.
 * - 400 형식 오류(폼이 먼저 막는다), 403 현업자가 아님 · `next_step` 이
 *   profile 이 아님.
 *
 * 입력하는 동안 부르는 검색이 아니라 한 번 묻는 확인이라 query 가 아닌
 * 함수다 — 캐시하면 방금 다른 사람이 가져간 이름이 "사용 가능" 으로 남는다.
 */
export async function checkGraduatedNickname(
  nickname: string
): Promise<boolean> {
  const { available } = unwrap(
    await api.GET("/api/v1/user/graduated/nickname/check", {
      params: { query: { nickname } },
    }),
    NicknameCheckSchema
  );
  return available;
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
