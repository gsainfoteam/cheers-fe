import { z } from "zod";
import type { GraduatedProfile, UserInfo } from "@/api";
import { describeNicknameProblem, nicknameProblem } from "@/lib/nickname";
import { EMAIL, PHONE, digitsOf, formatPhone, isValidLink } from "@/lib/profile-form";

/**
 * 선배 프로필 폼 — 가입 기본 정보 · 추가 정보와 정보 수정이 같은 스키마를
 * 나눠 쓴다(이슈 #10). 근거는 명세 `GraduatedInfoRequestDto` 와 선배 가이드
 * §2.4 · §2.6 · §2.7.
 */

/* ───────────────── 회사 · 부서 · 직무 (가입 · 수정 공통) ───────────────── */

const workShape = {
  // 회사명은 검색 칸에서 고르거나, 결과가 없으면 친 이름 그대로 확정한다(선배 가이드 §2.4a)
  company: z.string().trim().min(1, "회사명을 선택해 주세요.").max(128),
  /**
   * 검색 결과에서 골랐으면 그 회사의 id, 목록에 없어 직접 친 이름이면 null.
   * 보낼 때 `company_id` / `company_name` 을 가르는 값이다(`companyRequestOf`).
   */
  company_id: z.number().nullable(),
  department: z.string().trim().min(1, "부서를 입력해 주세요.").max(128),
  job: z.string().trim().min(1, "직무를 입력해 주세요.").max(128),
};

/* ───────────────── 가입 기본 정보 ───────────────── */

/**
 * - `nameRequired` — 내 정보에 이름이 없을 때만 받는다(학생과 같은 규칙).
 * - `nicknameLocked` — 명함 재인증으로 돌아온 선배는 이미 닉네임이 있다.
 *   첫 저장 뒤로는 서버가 무시하므로 검사하지 않는다.
 * - `takenNickname` — 저장 응답이 "이미 쓰는 닉네임" 이라고 돌려준 값.
 *   확인 API 가 없어 이 경로뿐이다(선배 가이드 §7 #3).
 */
export function mentorBasicsSchema({
  nameRequired,
  nicknameLocked,
  takenNickname,
}: {
  nameRequired: boolean;
  nicknameLocked: boolean;
  takenNickname: string;
}) {
  return z.object({
    name: nameRequired
      ? z.string().trim().min(1, "이름을 입력해 주세요.").max(64)
      : z.string(),
    nickname: nicknameLocked
      ? z.string()
      : z.string().superRefine((value, ctx) => {
          // 걸린 이유 하나만 — 공백 → 그 밖의 글자 → 길이 순(lib/nickname.ts)
          const problem = nicknameProblem(value);
          if (problem) {
            ctx.addIssue({ code: "custom", message: describeNicknameProblem(problem) });
          } else if (takenNickname && value === takenNickname) {
            ctx.addIssue({ code: "custom", message: "이미 사용 중인 닉네임이에요." });
          }
        }),
    ...workShape,
  });
}

export type MentorBasicsValues = z.input<ReturnType<typeof mentorBasicsSchema>>;

/* ───────────────── 추가 정보 (가입 · 수정 공통) ───────────────── */

const extraShape = {
  /** `#` 없이 담는다(명세 `^[^#]+$`). 최대 5개 · 각 20자 — `TagInput` 이 막는다 */
  hashtags: z.array(z.string().max(20)).max(5),
  /** 스킴이 없어도 받는다 — 보낼 때 `https://` 를 붙인다(`normalizeLink`) */
  linkedin: z
    .string()
    .trim()
    .max(2048)
    .refine((link) => link === "" || isValidLink(link), "링크 주소를 확인해 주세요."),
  email: z.string().trim().max(255).regex(EMAIL, "이메일 형식을 확인해 주세요."),
  // 임시: 이슈 #26 — 이메일 · 휴대폰 둘 다 필수(선배 가이드 §2.7)
  phone: z
    .string()
    .refine((phone) => PHONE.test(digitsOf(phone)), "휴대전화번호 형식을 확인해 주세요."),
};

export const mentorExtraSchema = z.object(extraShape);

export type MentorExtraValues = z.input<typeof mentorExtraSchema>;

/* ───────────────── 정보 수정 ───────────────── */

/**
 * 정보 수정은 회사 · 부서 · 직무와 추가 정보를 한 화면에서 고친다. 이름 ·
 * 닉네임은 가입 뒤로 바뀌지 않아 폼에 넣지 않는다(읽기 전용 칸으로만 선다).
 */
export const mentorEditSchema = z.object({ ...workShape, ...extraShape });

export type MentorEditValues = z.input<typeof mentorEditSchema>;

/** 정보 수정 폼의 처음 값 — 지금 내 정보 그대로 */
export function mentorEditDefaults(
  me: UserInfo,
  profile: GraduatedProfile
): MentorEditValues {
  return {
    company: profile.company,
    company_id: profile.company_id,
    department: profile.department,
    job: profile.job,
    hashtags: profile.hashtags,
    linkedin: profile.links[0] ?? "",
    email: profile.contact?.email ?? me.email ?? "",
    // 서버는 숫자만 준다. 시안처럼 `010-0000-0000` 으로 보여주고, 보낼 때 다시 숫자만 남긴다
    phone: formatPhone(profile.contact?.phone ?? ""),
  };
}

/** 폼이 들고 있는 모든 이름. 칸 묶음이 `useFormContext` 로 읽는 타입이다 */
export type MentorFormValues = MentorBasicsValues & MentorExtraValues;
