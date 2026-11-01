/**
 * 쿼리 키를 한곳에 모아둔다.
 *
 * 무효화는 앞부분이 겹치는 키를 통째로 지우는 식으로 동작하므로
 * (`["cheers"]` 를 무효화하면 그 아래 목록 · 상세가 모두 날아간다)
 * 계층을 흩뜨리지 않는 게 중요하다.
 */

export type PageParams = {
  page?: number;
  size?: number;
};

export const keys = {
  user: ["user"] as const,
  userInfo: () => ["user", "info"] as const,
  consentList: () => ["user", "consent", "list"] as const,
  studentDepartments: () => ["user", "student", "departments"] as const,

  cheers: ["cheers"] as const,
  cheersList: (params: { sort?: string; page?: number; size?: number }) =>
    ["cheers", "list", params] as const,

  sent: ["cheers", "sent"] as const,
  sentList: (params: PageParams) => ["cheers", "sent", "list", params] as const,
  sentDetail: (id: string) => ["cheers", "sent", "detail", id] as const,

  received: ["cheers", "received"] as const,
  receivedList: (params: PageParams) =>
    ["cheers", "received", "list", params] as const,
  receivedDetail: (id: string) => ["cheers", "received", "detail", id] as const,
};
