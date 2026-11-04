import { useState } from "react";
import {
  createFileRoute,
  redirect,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { isApiError, useSubmitGraduatedInfo, userInfoQuery } from "@/api";
import { PageContainer } from "@/components/layout/page-container";
import { SignupProgress } from "@/components/signup-progress";
import { action } from "@/components/ui/action";
import { Field } from "@/components/ui/field";
import { MentorContactFields } from "@/components/mentor-contact-fields";
import { TagInput } from "@/components/ui/tag-input";
import {
  contactInvalid,
  contactRequestOf,
  digitsOf,
  isValidLink,
  normalizeLink,
} from "@/lib/mentor-profile-form";
import { hasBasics, useMentorSignupDraft } from "@/lib/mentor-signup-draft";
import { cn } from "@/lib/utils";

/**
 * 선배 추가 정보. 피그마 `Cheers / 선배 추가 정보`(336:7282 / 336:7141),
 * 알림 번호 형식 오류(346:9610 / 346:9521).
 *
 * 가입의 마지막 화면이다. 기본 정보 화면이 담아 둔 값과 합쳐
 * `POST /user/graduated/info` **한 번**으로 저장하고, 응답의 새 토큰은
 * `useSubmitGraduatedInfo` 가 받아 넣는다. 저장이 끝나면 `next_step` 이
 * null 이 되므로 `router.invalidate()` 만 부르면 가드가 `/mentors` 로 보낸다.
 */
export const Route = createFileRoute("/onboarding/mentor/extra")({
  /**
   * 새로고침하면 앞 화면의 값이 사라진다. 그대로 저장하면 회사·직무 없이
   * 요청이 나가 400 이 돌아오므로 먼저 기본 정보로 돌려보낸다.
   */
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(userInfoQuery());
    if (!hasBasics(useMentorSignupDraft.getState().draft, !me.name)) {
      throw redirect({ to: "/onboarding/mentor/profile" });
    }
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(userInfoQuery()),
  component: RouteComponent,
});

function RouteComponent() {
  const router = useRouter();
  const navigate = useNavigate();
  const { data: me } = useSuspenseQuery(userInfoQuery());
  const { draft, patch, reset } = useMentorSignupDraft();
  const submit = useSubmitGraduatedInfo();

  const [hashtags, setHashtags] = useState(draft.hashtags);
  const [linkedin, setLinkedin] = useState(draft.linkedin);
  /**
   * 기본값은 구글 계정 이메일이다. 시안 예시(`alumni@example.com`)로는 판단할
   * 수 없지만, 학생 화면도 학교 이메일을 기본값으로 세웠다(선배 가이드 §2.6).
   */
  const [email, setEmail] = useState(draft.email || me.email || "");
  const [phone, setPhone] = useState(draft.phone);
  const [linkTouched, setLinkTouched] = useState(false);

  const linkInvalid = linkedin.trim().length > 0 && !isValidLink(linkedin);

  const current = () => ({
    hashtags,
    linkedin: linkedin.trim(),
    email: email.trim(),
    phone: digitsOf(phone),
  });

  const back = () => {
    patch(current());
    void navigate({ to: "/onboarding/mentor/profile" });
  };

  const finish = () => {
    const extras = current();

    submit.mutate(
      {
        // 명세상 `name` 은 내 정보의 이름이 null 일 때만 받는다
        ...(me.name ? {} : { name: draft.name }),
        nickname: draft.nickname,
        company: draft.company,
        department: draft.department,
        job: draft.job,
        hashtags: extras.hashtags,
        // 시안은 LinkedIn 칸 하나, 명세는 배열(최대 5)이다
        links: extras.linkedin ? [normalizeLink(extras.linkedin)] : [],
        // 임시: 이슈 #26 — 둘 다 필수, 둘 다 켠다(`contactRequestOf` 참고)
        contact: contactRequestOf(extras.email, extras.phone),
      },
      {
        onSuccess: () => {
          // 남겨두면 다음 가입(계정 전환)에서 남의 값이 폼에 올라온다
          reset();
          void router.invalidate();
        },
        onError: (error) => {
          // 닉네임 중복은 명세에 없지만, 서버가 409 로 알려 오면 그 칸이 있는
          // 기본 정보로 되돌아가 보여준다(선배 가이드 §2.4, §7 #3)
          if (isApiError(error) && error.status === 409) {
            patch({ ...current(), takenNickname: draft.nickname });
            void navigate({ to: "/onboarding/mentor/profile" });
          }
        },
      }
    );
  };

  const canSubmit =
    !linkInvalid && !contactInvalid(email, phone) && !submit.isPending;

  return (
    <PageContainer className="flex flex-col items-center pt-8 pb-12 lg:pt-16 lg:pb-18">
      {/* 피그마 `Task workspace` — 1216 = 352 + 64 + 800 */}
      <div className="flex w-full flex-col gap-7 lg:w-304 lg:flex-row lg:items-start lg:gap-16">
        {/* 피그마 `Task introduction` */}
        <div className="flex flex-col gap-7 lg:w-88 lg:shrink-0 lg:gap-10 lg:pt-4">
          {/* 모바일은 제목 위, 데스크톱은 제목 아래 */}
          <div className="order-first lg:order-last">
            <SignupProgress current={3} />
          </div>
          <div className="flex flex-col gap-3 lg:gap-5">
            <h1 className="text-task-title text-ink">추가 정보</h1>
            <p className="text-body text-ink-soft">
              태그와 프로필 링크는 나중에 입력해도 괜찮아요.
            </p>
          </div>
        </div>

        {/* 피그마 `Content` — 카드 껍데기는 데스크톱에만 있다 */}
        <form
          noValidate
          className="lg:border-line lg:bg-surface lg:shadow-work flex flex-col gap-7 lg:w-200 lg:shrink-0 lg:rounded-lg lg:border lg:p-10"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) finish();
          }}
        >
          <TagInput
            label="해시태그 (선택)"
            placeholder="예) 전기전자"
            hint="직무, 연차 등 나를 설명하는 키워드를 최대 5개 알려주세요."
            value={hashtags}
            onChange={setHashtags}
            max={5}
            maxLength={20}
          />

          <Field
            label="LinkedIn 프로필 링크 (선택)"
            // `type="url"` 을 쓰지 않는다 — 스킴 없는 주소를 브라우저가 틀렸다고 본다
            inputMode="url"
            autoComplete="url"
            maxLength={2048}
            placeholder="linkedin.com/in/…"
            value={linkedin}
            onChange={(e) => setLinkedin(e.target.value)}
            onBlur={() => setLinkTouched(true)}
            error={
              linkTouched && linkInvalid ? "링크 주소를 확인해 주세요." : undefined
            }
          />

          <div className="bg-line h-px" />

          {/* 피그마 `Contact and notification settings` — 정보 수정과 같은 묶음 */}
          <MentorContactFields
            email={email}
            phone={phone}
            onEmailChange={setEmail}
            onPhoneChange={setPhone}
          />

          <p className="text-body-sm text-ink-soft">
            연락처와 연락 설정은 사원증에 공개되지 않아요.
          </p>

          {submit.error && !isNicknameTaken(submit.error) ? (
            <p role="alert" className="text-body-sm text-danger">
              {describeSubmitError(submit.error)}
            </p>
          ) : null}

          {/* 피그마 `Form actions` */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={back}
              className={cn(action({ variant: "secondary" }), "w-25 lg:w-26")}
            >
              이전
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={cn(action(), "flex-1 lg:w-60 lg:flex-none")}
            >
              {submit.isPending ? "저장 중…" : "가입 완료"}
            </button>
          </div>
        </form>
      </div>
    </PageContainer>
  );
}

function isNicknameTaken(error: unknown): boolean {
  return isApiError(error) && error.status === 409;
}

function describeSubmitError(error: unknown): string {
  if (!isApiError(error)) return "저장하지 못했습니다. 다시 시도해 주세요.";

  if (error.status === 400) return "입력한 내용을 다시 확인해 주세요.";
  // 현업자가 아님, 또는 `next_step` 이 profile 이 아님
  if (error.status === 403) return "지금은 이 단계를 저장할 수 없어요.";
  return "저장하지 못했습니다. 다시 시도해 주세요.";
}
