import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { adoptIssuedTokens } from "./auth";
import { api } from "./client";
import {
  DepartmentListSchema,
  InterestListSchema,
  OkResultSchema,
  SendCodeResultSchema,
  SignupResultSchema,
} from "./dto";
import { unwrap } from "./errors";
import { keys } from "./keys";
import type { Body } from "./types";

/** 인증한 gist 이메일의 학교에 속한 학과 목록 */
export function studentDepartmentsQuery() {
  return queryOptions({
    queryKey: keys.studentDepartments(),
    queryFn: async ({ signal }) =>
      unwrap(
        await api.GET("/api/v1/user/student/departments", { signal }),
        DepartmentListSchema
      ),
    select: (data) => data.departments,
    // 학과 목록은 거의 바뀌지 않는다. 추가 정보 화면에서 매번 받을 이유가 없다
    staleTime: 60 * 60_000,
  });
}

/**
 * 고를 수 있는 관심 분야 목록.
 *
 * 어드민이 관리하는 값이라 프론트에 상수로 박아둘 수 없다. 추가 정보 저장은
 * 이름 문자열을 그대로 돌려보내므로 id 매핑이 따로 필요하지 않다.
 */
export function studentInterestsQuery() {
  return queryOptions({
    queryKey: keys.studentInterests(),
    queryFn: async ({ signal }) =>
      unwrap(
        await api.GET("/api/v1/user/student/interests", { signal }),
        InterestListSchema
      ),
    select: (data) => data.interests,
    // 학과 목록과 같은 이유로 자주 바뀌지 않는다
    staleTime: 60 * 60_000,
  });
}

/**
 * gist 이메일로 6자리 인증코드 발송. 재전송도 같은 API 를 쓴다.
 *
 * 응답의 `resend_available_at` 까지는 다시 보낼 수 없다(429). 화면에서 이 값으로
 * 재전송 버튼을 잠가야 한다 — 자동 재시도에 맡기면 쿨다운만 늘어난다.
 */
export function useSendStudentVerifyCode() {
  return useMutation({
    mutationFn: async (
      body: Body<"/api/v1/user/student/verify/send-code", "post">
    ) =>
      unwrap(
        await api.POST("/api/v1/user/student/verify/send-code", { body }),
        SendCodeResultSchema
      ),
  });
}

/**
 * 인증코드 확인.
 *
 * 틀리면 400 과 함께 남은 시도 횟수가 온다 — `remainingAttemptsOf(error)` 로
 * 꺼내 쓴다. 5번 틀리면 코드가 무효가 되어 404 로 바뀐다.
 */
export function useVerifyStudentCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      body: Body<"/api/v1/user/student/verify/code", "post">
    ) =>
      unwrap(
        await api.POST("/api/v1/user/student/verify/code", { body }),
        OkResultSchema
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.user }),
  });
}

/**
 * 재학생 추가 정보 저장. 가입 시 입력과 마이페이지 수정에 모두 쓴다.
 *
 * 전체 교체 방식이라 바꾸지 않은 항목까지 모두 보내야 한다. 수정 화면은
 * `userInfoQuery` 로 받은 현재 값을 폼 기본값으로 채운 뒤 그대로 돌려보낼 것.
 */
export function useSubmitStudentInfo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: Body<"/api/v1/user/student/info", "post">) =>
      unwrap(
        await api.POST("/api/v1/user/student/info", { body }),
        SignupResultSchema
      ),
    onSuccess: (data) => {
      // 이 호출로 가입이 끝났다면 새 토큰이 함께 온다
      adoptIssuedTokens(data);
      return queryClient.invalidateQueries({ queryKey: keys.user });
    },
  });
}
