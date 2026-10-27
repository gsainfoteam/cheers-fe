export type Role = "student" | "mentor";

export type Session = {
  role: Role;
};

/**
 * 로그인한 사용자의 세션.
 *
 * TODO: 서버 세션(GET /me)으로 교체. 온보딩 가드가 단계를 판단할 때 쓰는
 * 소스와 반드시 같아야 한다 — 두 곳이 갈리면 role 이 어긋난다.
 */
export function useSession(): Session {
  return { role: "student" };
}
