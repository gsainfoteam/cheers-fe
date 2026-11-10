import { create } from "zustand";
import type { GraduatedProfile } from "@/api";

/**
 * 선배 가입의 마지막 단계(기본 정보 → 추가 정보)가 나눠 쓰는 임시 보관함.
 *
 * 학생 `student-signup-draft` 와 같은 이유로 있다 — 서버의 `next_step` 은
 * `profile` 하나인데 화면은 둘이고, 저장은 마지막 화면의
 * `POST /user/graduated/info` **한 번**이다. 저장소에 남기지 않는 이유도 같다
 * (그쪽 머리말 참고).
 *
 * 학생 것과 합쳐 제네릭으로 만들지 않는다. 필드가 하나도 안 겹친다.
 */

export type MentorSignupDraft = {
  /** 내 정보에 이름이 없을 때(첫 저장)만 쓴다 */
  name: string;
  nickname: string;
  company: string;
  /** 검색 결과에서 고른 회사. 목록에 없어 직접 친 이름이면 null */
  company_id: number | null;
  /** 비공개. 다른 회원에게 보이지 않는다 */
  department: string;
  job: string;
  /** `#` 없이 담는다 — 명세 패턴 `^[^#]+$` */
  hashtags: string[];
  /** 사용자가 친 그대로. 보낼 때 스킴을 붙인다 */
  linkedin: string;
  email: string;
  phone: string;
  /**
   * 저장 응답이 "이미 쓰는 닉네임" 이라고 돌려준 값. 기본 정보로 되돌아가
   * 그 칸에 문구를 띄우는 데만 쓴다. 다른 값으로 고치면 문구가 사라진다.
   */
  takenNickname: string;
};

const EMPTY: MentorSignupDraft = {
  name: "",
  nickname: "",
  company: "",
  company_id: null,
  department: "",
  job: "",
  hashtags: [],
  linkedin: "",
  email: "",
  phone: "",
  takenNickname: "",
};

type Store = {
  draft: MentorSignupDraft;
  patch: (values: Partial<MentorSignupDraft>) => void;
  reset: () => void;
};

export const useMentorSignupDraft = create<Store>((set) => ({
  draft: EMPTY,
  patch: (values) => set((state) => ({ draft: { ...state.draft, ...values } })),
  reset: () => set({ draft: EMPTY }),
}));

/**
 * 기본 정보가 채워졌는지. 명세가 필수로 받는 셋(회사·`department`·
 * `job`)과 첫 저장에 필수인 `nickname`, 그리고 내 정보에 이름이 없으면
 * `name` 까지가 기준이다.
 */
export function hasBasics(
  draft: MentorSignupDraft,
  nameRequired: boolean
): boolean {
  return (
    Boolean(draft.company && draft.department && draft.job && draft.nickname) &&
    (!nameRequired || Boolean(draft.name))
  );
}

/**
 * 이미 프로필이 있는 선배의 값으로 초안을 채운다.
 *
 * 어드민이 명함 인증을 취소하면 가입을 마친 선배도 `verify` 로 돌아온다
 * (명세). 그 뒤 `profile` 단계로 오면 빈 폼이 아니라 원래 값이 서 있어야
 * 한다 — 저장이 전체 교체 방식이라 빈 칸은 그대로 지워진다.
 */
export function draftFromProfile(
  profile: GraduatedProfile
): Partial<MentorSignupDraft> {
  return {
    nickname: profile.nickname,
    company: profile.company,
    company_id: profile.company_id,
    department: profile.department,
    job: profile.job,
    hashtags: profile.hashtags,
    linkedin: profile.links[0] ?? "",
    email: profile.contact?.email ?? "",
    phone: profile.contact?.phone ?? "",
  };
}
