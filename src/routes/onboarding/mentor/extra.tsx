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
import { TagInput } from "@/components/ui/tag-input";
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

/** 명세의 `^01\d{8,9}$`. 저장은 숫자만 보낸다 */
const PHONE = /^01\d{8,9}$/;
/** 브라우저의 `type="email"` 검사와 같은 수준. 나머지는 서버가 본다 */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function digitsOf(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * 모바일 시안의 placeholder 가 `linkedin.com/in/…` 처럼 **스킴 없이** 적혀
 * 있어 사용자도 그렇게 칠 것이다. 명세는 `format: uri` 라 그대로 보내면
 * 400 이므로 스킴이 없으면 `https://` 를 붙인다.
 */
function normalizeLink(link: string): string {
  const trimmed = link.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function isValidLink(link: string): boolean {
  try {
    const url = new URL(normalizeLink(link));
    return url.hostname.includes(".");
  } catch {
    return false;
  }
}

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
  const [touched, setTouched] = useState({
    linkedin: false,
    email: false,
    phone: false,
  });
  const touch = (field: keyof typeof touched) =>
    setTouched((t) => ({ ...t, [field]: true }));

  const linkInvalid = linkedin.trim().length > 0 && !isValidLink(linkedin);
  const emailInvalid = !EMAIL.test(email.trim());
  // 임시: 이슈 #26 — 이메일·휴대폰 둘 다 필수. 비어 있어도 저장을 막는다
  const phoneInvalid = !PHONE.test(digitsOf(phone));

  /**
   * 오류 문구는 한 번 쳐 보고 칸을 떠난 뒤에만 띄운다. 빈 칸은 문구 없이
   * 버튼만 막는다 — 아직 아무것도 안 쳤는데 빨간 칸이 서지 않게.
   */
  const show = (field: keyof typeof touched, value: string, invalid: boolean) =>
    touched[field] && value.trim().length > 0 && invalid;

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
        // 임시: 이슈 #26 — 둘 다 필수. 시안의 "공유할 이메일 / 알림 받을
        // 휴대폰" 을 `email_enabled` · `kakao_enabled` 에 어떻게 매핑할지
        // 답이 오기 전까지 둘 다 켠다. 답이 나오면 이 블록을 걷어낸다
        contact: {
          email_enabled: true,
          kakao_enabled: true,
          email: extras.email,
          phone: extras.phone,
        },
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
    !linkInvalid && !emailInvalid && !phoneInvalid && !submit.isPending;

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
            onBlur={() => touch("linkedin")}
            error={
              show("linkedin", linkedin, linkInvalid)
                ? "링크 주소를 확인해 주세요."
                : undefined
            }
          />

          <div className="bg-line h-px" />

          {/* 피그마 `Contact and notification settings` */}
          <div className="flex flex-col gap-6">
            {/* 피그마 `Shared contact` */}
            <div className="flex flex-col gap-3">
              <h2 className="text-card-title text-ink">공유할 연락처</h2>
              <Field
                label="이메일"
                type="email"
                inputMode="email"
                autoComplete="email"
                maxLength={255}
                placeholder="alumni@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => touch("email")}
                hint="연락처 공유를 선택한 학생에게만 이름과 함께 전달돼요."
                error={
                  show("email", email, emailInvalid)
                    ? "이메일 형식을 확인해 주세요."
                    : undefined
                }
              />
            </div>

            <div className="bg-line h-px" />

            {/* 피그마 `Private Alimtalk recipient` */}
            <div className="flex flex-col gap-3">
              <h2 className="text-card-title text-ink">신청 알림</h2>
              <p className="text-body-sm text-ink-soft">
                새 커피챗 신청을 카카오 알림톡으로 알려드려요.
              </p>
              <Field
                // 임시: 이슈 #26 — 둘 다 필수. 시안 라벨의 `(선택)` 을 뗐다
                label="알림 받을 휴대전화번호"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={13}
                placeholder="010-0000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={() => touch("phone")}
                hint="등록한 번호로 신청 알림을 보내요. 학생에게 공유되지 않아요."
                error={
                  show("phone", phone, phoneInvalid)
                    ? "휴대전화번호 형식을 확인해 주세요."
                    : undefined
                }
              />
            </div>
          </div>

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
