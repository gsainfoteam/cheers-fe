import { useMentorSignupDraft } from "./mentor-signup-draft";
import { useStudentSignupDraft } from "./student-signup-draft";

/**
 * 로그아웃 · 탈퇴 · 가입 중단 때 **브라우저 쪽에 남은 계정 흔적**을 지운다.
 *
 * 토큰과 쿼리 캐시는 `useLogout` / `useWithdraw` 가 이미 비운다. 여기서는
 * 그 훅이 모르는 둘을 맡는다(`api/` 는 `lib/` 를 모르게 두려고 따로 뺐다).
 *
 * 1. **가입 임시 보관함.** zustand 메모리 저장소라 새로고침 없이 화면만 옮기면
 *    살아남는다. 비우지 않으면 다른 구글 계정으로 다시 가입할 때 앞사람이
 *    치던 이름·학과·전화번호가 기본 정보 화면에 미리 채워진다.
 *
 * 2. **구글 자동 선택.** `disableAutoSelect` 는 구글이 로그아웃 때 부르라고
 *    안내하는 함수다. 다음 로그인 때 구글이 직전 계정으로 저절로 들어가지
 *    않게 막는다.
 *
 * ── "세션 초기화" 와 `prompt=select_account` 중 무엇을 하나 ──
 *
 * **둘 다 하지만, 반드시 필요한 건 우리 세션 초기화 쪽이다.**
 *
 * - 우리 세션(토큰)을 지우지 않으면 랜딩·로그인 가드가 곧장 `/onboarding`
 *   으로 되돌려 보낸다. 다른 계정은 고사하고 로그인 화면에도 못 간다.
 * - `prompt=select_account` 는 OAuth 리다이렉트/팝업 방식의 파라미터라
 *   지금 쓰는 GIS(구글 로그인 버튼)에는 **그 옵션이 없다.** GIS 에서 그
 *   역할을 하는 게 `disableAutoSelect` 이고, 2번이 그것이다. 계정 선택은
 *   구글 버튼이 직접 제공한다(구글에 로그인된 브라우저에서는 개인화 버튼의
 *   계정 목록에서 다른 계정을 고를 수 있다).
 * - 구글 계정 자체를 로그아웃시키지는 않는다. 사용자의 Gmail 등 다른
 *   서비스까지 끊기기 때문이다.
 */
export function forgetLocalAccount() {
  useStudentSignupDraft.getState().reset();
  useMentorSignupDraft.getState().reset();

  // 스크립트가 아직 안 받아졌다면(온보딩에서 새로고침한 경우) 자동 선택이
  // 일어날 일도 없다 — 버튼을 그리기 전에는 구글이 아무것도 하지 않고,
  // 초기화 때 `auto_select: false` 를 준다. 이것 때문에 스크립트를 받지 않는다
  try {
    window.google?.accounts?.id?.disableAutoSelect();
  } catch {
    // 구글 쪽 실패로 로그아웃이 멈추면 안 된다
  }
}
