import { create } from "zustand";
import type { StudentAttachmentValue } from "@/features/profile/student-form";
import type { ContactChannels } from "@/lib/profile-form";

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
  /** 고정 칩 값과 학생이 직접 넣은 `기타` 값이 섞여 있다(가이드 D2-3) */
  interests: string[];
  activities: string[];
  /** 다 올라간 첨부만 담긴다. 올리는 중인 파일은 화면 안에만 있다 */
  attachments: StudentAttachmentValue[];
  /**
   * 연락 설정. `null` 이면 아직 손대지 않은 것 — 폼이 처음 값(이메일 체크 +
   * 인증한 메일, `studentContactDefaults`)으로 채운다. 보관함은 내 정보를
   * 모르므로 여기서 채우지 않는다.
   */
  contact: ContactChannels | null;
};

const EMPTY: StudentSignupDraft = {
  name: "",
  departmentId: null,
  interests: [],
  activities: [],
  attachments: [],
  contact: null,
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
