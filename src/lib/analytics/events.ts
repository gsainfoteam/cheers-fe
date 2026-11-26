/**
 * Amplitude 로 보내는 커스텀 이벤트의 **단일 목록**.
 *
 * 이름은 `대상 + 과거형 동사` (`Coffee Chat Requested`). 대시보드를 만드는
 * 쪽이 이 파일 하나만 보면 되도록, 이벤트를 추가하면 여기에 먼저 적는다.
 *
 * **속성에 개인정보를 넣지 않는다.** 이름 · 이메일 · 전화번호 · 학과 · 회사명 ·
 * 질문 본문은 어떤 형태로도 보내지 않는다. 사람과 신청은 서버가 준 불투명
 * ID(`mentor_id`, `request_id`)로만 가리키고, 본문은 길이만 센다. 타입을
 * 이렇게 좁게 잡은 이유도 같다 — 임의 객체를 받지 않아야 실수로 사용자 입력이
 * 섞여 나가지 않는다.
 *
 * 자동 수집되는 `[Amplitude] ...` 이벤트(페이지뷰, 세션, 클릭, 좌절 클릭,
 * 웹 바이탈)는 여기에 없다. 설정은 `index.ts` 에 있다.
 */

/** API 의 `type` 과 같은 값. 화면의 role(`mentor`)이 아니라 서버 용어를 쓴다 */
export type UserTypeProp = "student" | "graduated";

export type AnalyticsEvents = {
  /** 랜딩에서 학생/선배 중 하나를 골라 로그인으로 넘어갔다. 퍼널의 첫 단계 */
  "Role Selected": {
    user_type: UserTypeProp;
    /** 눌린 버튼의 위치 */
    placement: "hero" | "closing";
  };

  /** 구글 로그인이 서버에서 통과했다 (가입 중이든 가입 완료든) */
  "Login Succeeded": { provider: "google"; user_type: UserTypeProp };
  "Login Failed": {
    provider: "google";
    user_type: UserTypeProp;
    /** HTTP 상태. 네트워크 오류 등 응답이 없으면 생략 */
    status?: number;
  };

  /**
   * 가입 단계 하나를 마쳤다. 서버의 `next_step` 이 바뀐 순간 한 번만 발생한다
   * (화면별 submit 이 아니라 결과를 본다 — 새로고침·재시도에 중복되지 않는다).
   * `profile` 은 기본정보 + 추가정보 두 화면을 묶은 단계다. `verify`(학교 메일
   * 인증)는 학생만 거치고, 선배는 `consent` → `profile` 이다.
   */
  "Onboarding Step Completed": {
    step: "consent" | "verify" | "profile";
    user_type: UserTypeProp;
  };
  /** 마지막 단계(`profile`)까지 끝나 `next_step` 이 비었다 */
  "Signup Completed": { user_type: UserTypeProp };

  /** 학교 메일 인증 코드를 보냈다 (재전송 포함) */
  "Verify Code Sent": Record<string, never>;
  /** 입력한 인증 코드가 거절됐다 */
  "Verify Code Failed": { status?: number };
  /**
   * 선배가 명함 이미지를 제출해 인증이 통과했다. 가입 단계가 아니라, 어드민이
   * 인증을 취소해 돌아온 선배의 **재인증**이다
   */
  "Business Card Submitted": Record<string, never>;
  "Business Card Submit Failed": { status?: number };

  /** 선배 둘러보기 목록을 봤다 */
  "Mentor List Viewed": { result_count: number; viewer_type: UserTypeProp };
  /** 커피챗 신청 화면이 열렸다 */
  "Coffee Chat Apply Started": { mentor_id: string };
  "Coffee Chat Requested": { mentor_id: string; message_length: number };
  "Coffee Chat Request Failed": { mentor_id: string; status?: number };
  /** 신청 화면의 자주 묻는 질문 링크 */
  "FAQ Clicked": { placement: "apply" };

  /** 선배가 연락처를 학생에게 공유했다. 받은 신청은 수락 단계 없이 바로 열린다 */
  "Contact Shared": { request_id: string };

  /** 마이페이지에서 프로필을 저장했다 */
  "Profile Updated": { user_type: UserTypeProp };
  "Logged Out": Record<string, never>;
  "Account Withdrawn": Record<string, never>;
};

export type AnalyticsEventName = keyof AnalyticsEvents;
