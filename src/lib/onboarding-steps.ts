import type { NextStep, UserType } from "@/api";

/**
 * 온보딩 단계 ↔ 경로.
 *
 * 서버의 `next_step` 은 `consent / verify / profile` 셋뿐인데 화면은 더 잘게
 * 나뉜다. `profile` 단계가 "기본정보 → 추가정보" 두 화면인데도 서버가 둘을
 * 구분하지 않는 이유는, 둘 다 하나의 `POST /user/{type}/info` 로 모여
 * 한 번에 저장되기 때문이다.
 *
 * 그래서 한 단계가 여러 경로를 허용한다. 배열의 **첫 번째가 그 단계의 진입
 * 지점**이고, 나머지는 사용자가 화면 안에서 진행해 도달하는 곳이다.
 */

/** 라우터가 실제로 아는 경로만 쓴다. 문자열을 지어내면 redirect 가 깨진다 */
export type OnboardingPath =
  | "/onboarding/terms"
  | "/onboarding/student/verify"
  | "/onboarding/student/profile"
  | "/onboarding/student/extra"
  | "/onboarding/mentor/verify"
  | "/onboarding/mentor/profile"
  | "/onboarding/mentor/extra";

const PATHS: Record<UserType, Record<NextStep, OnboardingPath[]>> = {
  student: {
    consent: ["/onboarding/terms"],
    verify: ["/onboarding/student/verify"],
    profile: ["/onboarding/student/profile", "/onboarding/student/extra"],
  },
  graduated: {
    // 약관은 유형과 무관하게 한 화면이다
    consent: ["/onboarding/terms"],
    verify: ["/onboarding/mentor/verify"],
    profile: ["/onboarding/mentor/profile", "/onboarding/mentor/extra"],
  },
};

/** 이 단계에서 머물러도 되는 경로들 */
export function stepPaths(type: UserType, step: NextStep): OnboardingPath[] {
  return PATHS[type][step];
}

/** 이 단계로 보낼 때의 진입 지점 */
export function entryPath(type: UserType, step: NextStep): OnboardingPath {
  return PATHS[type][step][0];
}

/**
 * 지금 보고 있는 경로가 현재 단계에 맞는지.
 *
 * 단계를 건너뛰는 것뿐 아니라 **유형이 어긋나는 것도** 여기서 걸린다.
 * 재학생이 `/onboarding/mentor/verify` 를 열면 그 유형의 경로 목록에 없으므로
 * 자기 단계로 되돌아간다.
 */
export function isAllowed(
  type: UserType,
  step: NextStep,
  pathname: string
): boolean {
  return stepPaths(type, step).some((path) => path === pathname);
}
