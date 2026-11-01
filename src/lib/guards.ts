import type { QueryClient } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";
import {
  clearTokens,
  getTokens,
  isApiError,
  userInfoQuery,
  type UserInfo,
} from "@/api";

/**
 * 라우트 가드의 공통 부분.
 *
 * 세션은 `userInfoQuery` 하나에서만 읽는다. 가드와 화면이 같은 캐시를 보므로
 * "가드는 학생이라는데 화면은 선배로 그려지는" 종류의 어긋남이 생기지 않는다.
 */

/** TanStack 의 ParsedLocation 중 가드가 쓰는 부분만 */
type Location = {
  href: string;
  pathname: string;
};

/**
 * 로그인 화면에 왜 왔는지 알려준다.
 *
 * 알림톡 링크로 신청 내용을 보러 왔다가 튕긴 경우가 가장 흔하고, 그때는
 * "로그인하세요" 보다 "신청 내용을 보려면 로그인을 해주세요" 가 맞다.
 */
function reasonFor(pathname: string): "application" | undefined {
  return pathname.startsWith("/applications") ? "application" : undefined;
}

function toLogin(location: Location): never {
  throw redirect({
    to: "/login",
    search: {
      // 랜딩(`/`)이 아니라 로그인으로 보낸다. 딥링크로 들어온 사람에게
      // 유형 선택 화면을 보여줄 이유가 없고, 이렇게 두면 모든 딥링크가
      // 복귀 지점을 얻는다
      redirect: location.href,
      reason: reasonFor(location.pathname),
      switchAccount: false,
    },
  });
}

/**
 * 로그인이 필요한 구간의 입구. 세션이 없으면 로그인으로 보낸다.
 *
 * 401 은 `client.ts` 가 이미 refresh 를 한 번 시도한 뒤의 결과다. 여기까지
 * 왔다는 건 갱신도 실패했다는 뜻이라 세션을 정리한다. 반대로 서버 장애(5xx)나
 * 네트워크 오류는 세션 문제가 아니므로 그대로 올려보내 에러 화면이 뜨게 한다.
 */
export async function requireSession(
  queryClient: QueryClient,
  location: Location
): Promise<UserInfo> {
  if (!getTokens()) toLogin(location);

  try {
    return await queryClient.ensureQueryData(userInfoQuery());
  } catch (error) {
    if (isApiError(error) && error.status === 401) {
      clearTokens();
      toLogin(location);
    }
    throw error;
  }
}

/**
 * 로그인·랜딩 화면의 입구. 이미 세션이 있으면 제자리로 보낸다.
 *
 * 로그인을 마친 사람이 뒤로가기로 랜딩에 돌아왔을 때 "학생으로 시작 / 선배로
 * 시작" 을 다시 보여주면, 유형을 바꿔 누르는 순간 가입 중인 사용자는 인증과
 * 추가 정보를 잃는다.
 */
export async function redirectIfSignedIn(queryClient: QueryClient) {
  if (!getTokens()) return;

  let me: UserInfo;
  try {
    me = await queryClient.ensureQueryData(userInfoQuery());
  } catch (error) {
    // 토큰이 죽었으면 정리하고 로그인 화면을 그대로 보여준다.
    // 서버 장애라면 토큰은 멀쩡하므로 건드리지 않는다
    if (isApiError(error) && error.status === 401) clearTokens();
    return;
  }

  if (me.next_step) throw redirect({ to: "/onboarding" });
  throw redirect({ to: "/home" });
}
