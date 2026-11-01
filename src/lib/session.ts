import { useSuspenseQuery } from "@tanstack/react-query";
import { userInfoQuery } from "@/api";
import { toRole } from "./role";

export type Role = "student" | "mentor";

export type Session = {
  role: Role;
};

/**
 * 로그인한 사용자의 세션.
 *
 * 가드가 `ensureQueryData(userInfoQuery())` 로 이미 받아둔 **같은 캐시**를
 * 읽는다. 두 곳이 갈리면 role 이 어긋나므로, 출처를 하나로 묶는 게 이 함수의
 * 존재 이유다.
 *
 * `useSuspenseQuery` 를 쓸 수 있는 건 가드를 통과한 화면에서만 호출되기
 * 때문이다. 가드가 이미 데이터를 캐시에 넣어둬서 실제로는 멈추지 않는다.
 */
export function useSession(): Session {
  const { data } = useSuspenseQuery(userInfoQuery());
  return { role: toRole(data.type) };
}
