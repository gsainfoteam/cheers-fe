import { create } from "zustand";

/**
 * 학생 가입의 마지막 단계(기본 정보 → 추가 정보)가 나눠 쓰는 임시 보관함.
 *
 * **왜 필요한가.** 서버의 `next_step` 은 `profile` 하나인데 화면은 둘이고,
 * 저장은 마지막 화면에서 `POST /user/student/info` **한 번**으로 끝난다
 * (`lib/onboarding-steps.ts` 머리말 참고). 그래서 기본 정보 화면이 모은
 * 학과·관심 분야를 추가 정보 화면까지 들고 가야 한다.
 *
 * **왜 저장소에 남기지 않는가.** 새로고침하면 사라지는 게 맞다. 서버는 아직
 * 아무것도 모르는 상태이고, 되살려 둔 값이 그 사이 바뀐 학과 목록과 어긋나면
 * 저장할 때 400 으로 되돌아온다. 사라지면 추가 정보 화면이 기본 정보로
 * 돌려보낸다(`hasBasics`).
 */

export type StudentSignupDraft = {
  /** 내 정보에 이름이 없을 때(첫 저장)만 쓴다 */
  name: string;
  departmentId: number | null;
  interests: string[];
  activities: string[];
  /** 이력서·포트폴리오 링크. 비어 있으면 첨부를 보내지 않는다 */
  portfolioUrl: string;
  emailEnabled: boolean;
  kakaoEnabled: boolean;
  phone: string;
};

/** 시안의 연락 설정은 `이메일` 이 켜진 채로 그려져 있다 */
const EMPTY: StudentSignupDraft = {
  name: "",
  departmentId: null,
  interests: [],
  activities: [],
  portfolioUrl: "",
  emailEnabled: true,
  kakaoEnabled: false,
  phone: "",
};

type Store = {
  draft: StudentSignupDraft;
  patch: (values: Partial<StudentSignupDraft>) => void;
  reset: () => void;
};

export const useStudentSignupDraft = create<Store>((set) => ({
  draft: EMPTY,
  patch: (values) => set((state) => ({ draft: { ...state.draft, ...values } })),
  reset: () => set({ draft: EMPTY }),
}));

/**
 * 기본 정보가 채워졌는지. 서버가 필수로 받는 둘(`department_id`,
 * `interests`)이 기준이다 — 이게 비어 있으면 저장이 성립하지 않는다.
 */
export function hasBasics(draft: StudentSignupDraft): boolean {
  return draft.departmentId !== null && draft.interests.length > 0;
}
