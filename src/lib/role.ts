import type { Role } from "./session";

/**
 * 화면의 role 과 API 의 type 은 이름이 다르다. 한 곳에서만 변환한다.
 */
export function toApiType(role: Role): "student" | "graduated" {
  return role === "mentor" ? "graduated" : "student";
}

export function toRole(type: "student" | "graduated"): Role {
  return type === "graduated" ? "mentor" : "student";
}

const STORAGE_KEY = "cheers.role";

/**
 * 랜딩에서 고른 유형을 기억해 둔다.
 *
 * `/login` 은 유형을 묻지 않는데 `POST /user/oauth/login` 은 `type` 을 필수로
 * 받는다. 가입을 마친 유저에게는 서버가 이 값을 무시하지만, **가입 중인
 * (`pending`) 유저에게는 무시하지 않는다** — 다른 유형으로 로그인하면 인증과
 * 추가 정보가 지워지고 처음부터 다시 시작된다.
 *
 * 그래서 마지막으로 고른 유형을 들고 다닌다. 완벽하진 않다: 저장소가 비면
 * (다른 기기, 시크릿창) 기본값으로 떨어진다. 그 경우 pending 유저가 유형을
 * 잃을 수 있어서, 장기적으로는 `/login` 에서도 유형을 묻거나 서버가 `type`
 * 없는 로그인을 허용하는 편이 안전하다.
 */
export function rememberRole(role: Role) {
  try {
    window.localStorage.setItem(STORAGE_KEY, role);
  } catch {
    // 저장이 막혀도 로그인 자체는 진행돼야 한다
  }
}

export function lastRole(): Role | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "student" || value === "mentor" ? value : null;
  } catch {
    return null;
  }
}
