import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "./client";
import {
  AcceptResultSchema,
  CheersListSchema,
  CheersRequestResultSchema,
  ReceivedListSchema,
  ReceivedRequestDetailSchema,
  SentListSchema,
  SentRequestDetailSchema,
  ShareContactResultSchema,
  type SentRequestDetail,
} from "./dto";
import { unwrap } from "./errors";
import { keys, type PageParams } from "./keys";
import type { Body } from "./types";

type CheersListParams = PageParams & {
  sort?: "recent_joined" | "recent_active" | "random";
};

/**
 * 현업자 정보 카드 목록.
 *
 * `sort: "random"` 은 서버가 시간 기준으로 섞는다. 페이지를 넘길 때마다 순서가
 * 흔들릴 수 있으니, 랜덤 정렬에서는 무한스크롤보다 "새로고침" UI 가 맞다.
 */
export function cheersListQuery(params: CheersListParams = {}) {
  return queryOptions({
    queryKey: keys.cheersList(params),
    queryFn: async ({ signal }) =>
      unwrap(
        await api.GET("/api/v1/cheers", { params: { query: params }, signal }),
        CheersListSchema
      ),
    // 페이지를 넘기는 동안 목록이 빈 화면으로 깜빡이지 않게 한다
    placeholderData: keepPreviousData,
  });
}

/** 내가 보낸 커피챗 요청 목록 (재학생) */
export function sentRequestsQuery(params: PageParams = {}) {
  return queryOptions({
    queryKey: keys.sentList(params),
    queryFn: async ({ signal }) =>
      unwrap(
        await api.GET("/api/v1/cheers/sent", {
          params: { query: params },
          signal,
        }),
        SentListSchema
      ),
    placeholderData: keepPreviousData,
  });
}

/**
 * 보낸 요청 상세 (재학생).
 *
 * 부수효과가 있는 GET 이다 — 연락처가 공유된 뒤 처음 호출하면 "확인함" 으로
 * 기록된다. 다시 호출해도 결과는 같으므로 재조회 자체는 안전하다.
 */
export function sentRequestQuery(id: string) {
  return queryOptions({
    queryKey: keys.sentDetail(id),
    queryFn: async ({ signal }) =>
      // 명세의 `graduated` 에는 로고 · 링크가 빠져 있어(dto.ts
      // `RequestGraduatedDetailSchema` 참고) 타입을 명세가 아닌 스키마에 맞춘다
      unwrap(
        await api.GET("/api/v1/cheers/sent/{id}", {
          params: { path: { id } },
          signal,
        }),
        SentRequestDetailSchema
      ) as SentRequestDetail,
  });
}

/** 내가 받은 커피챗 요청 목록 (현업자) */
export function receivedRequestsQuery(params: PageParams = {}) {
  return queryOptions({
    queryKey: keys.receivedList(params),
    queryFn: async ({ signal }) =>
      unwrap(
        await api.GET("/api/v1/cheers/received", {
          params: { query: params },
          signal,
        }),
        ReceivedListSchema
      ),
    placeholderData: keepPreviousData,
  });
}

/**
 * 받은 요청 상세 (현업자).
 *
 * 첫 호출이 status 를 requested → viewed 로 바꾼다. 목록에 "확인 안 함" 배지를
 * 띄운다면, 이 상세를 열고 나서 `keys.received` 를 무효화해야 배지가 사라진다.
 */
export function receivedRequestQuery(id: string) {
  return queryOptions({
    queryKey: keys.receivedDetail(id),
    queryFn: async ({ signal }) =>
      unwrap(
        await api.GET("/api/v1/cheers/received/{id}", {
          params: { path: { id } },
          signal,
        }),
        ReceivedRequestDetailSchema
      ),
  });
}

/**
 * 커피챗 요청 (재학생).
 *
 * 409 는 현업자가 연락 설정을 "희망하지 않음" 으로 바꾼 경우다. 목록의
 * `can_request` 가 false 면 버튼을 미리 막되, 목록을 받은 뒤 설정이 바뀔 수
 * 있으니 409 처리도 함께 둬야 한다.
 */
export function useRequestCheers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: Body<"/api/v1/cheers/request", "post">) =>
      unwrap(
        await api.POST("/api/v1/cheers/request", { body }),
        CheersRequestResultSchema
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.sent }),
  });
}

/**
 * 커피챗 수락 (현업자). body 없음.
 *
 * - 수락하면 받은 요청 상세의 `student.email` · `phone` 이 채워진다(수락 전에는
 *   늘 null). 연락처 화면은 상세만으로 그리므로 **상세를 다시 받은 뒤에** 끝난
 *   것으로 친다 — `onSuccess` 가 무효화를 기다리게 해서, 버튼의 처리 중 상태가
 *   연락처가 실제로 보일 때까지 이어진다.
 * - 이미 수락한 요청에 다시 부르면 처음 결과를 그대로 준다. 중복 클릭에 안전하다.
 * - 수락만으로는 메일 · 알림톡이 나가지 않고, 재학생에게도 수락 사실이 보이지
 *   않는다(보낸 요청은 계속 `viewed`).
 *
 * 에러: 400 id 형식, 403 가입 미완료 · 현업자 아님 · 명함 인증 취소,
 * 404 없거나 내가 받은 요청이 아님, 410 재학생 탈퇴(유예 포함).
 */
export function useAcceptRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) =>
      unwrap(
        await api.POST("/api/v1/cheers/received/{id}/accept", {
          params: { path: { id } },
        }),
        AcceptResultSchema
      ),
    onSuccess: (_data, id) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: keys.receivedDetail(id) }),
        queryClient.invalidateQueries({ queryKey: keys.received }),
      ]),
  });
}

/**
 * 연락처 공유 (현업자). 재학생에게 내 연락 수단이 메일 · 알림톡으로 간다.
 *
 * **수락한 요청에서만 부를 수 있다.** 409 가 두 가지라 `message` 로 가른다
 * (`isNotAcceptedError`): 수락하지 않은 요청(`Coffee chat is not accepted`),
 * 내 연락 설정이 "희망하지 않음"(`No contact to share`).
 *
 * 이미 공유한 요청에 다시 호출해도 알림을 다시 보내지 않고 처음 결과를
 * 그대로 돌려준다. 버튼 중복 클릭을 서버가 받아주므로 낙관적 업데이트까지는
 * 필요 없다.
 */
export function useShareContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) =>
      unwrap(
        await api.POST("/api/v1/cheers/received/{id}/share-contact", {
          params: { path: { id } },
        }),
        ShareContactResultSchema
      ),
    onSuccess: (_data, id) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: keys.receivedDetail(id) }),
        queryClient.invalidateQueries({ queryKey: keys.received }),
      ]),
  });
}
