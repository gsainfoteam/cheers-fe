import { useId, useState } from "react";
import {
  createFileRoute,
  redirect,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { isApiError, useSubmitStudentInfo, userInfoQuery } from "@/api";
import { PageContainer } from "@/components/layout/page-container";
import { SignupProgress } from "@/components/signup-progress";
import { action } from "@/components/ui/action";
import { Choice } from "@/components/ui/choice";
import { Field } from "@/components/ui/field";
import { hasBasics, useStudentSignupDraft } from "@/lib/student-signup-draft";
import { cn } from "@/lib/utils";

/**
 * 학생 추가 정보. 피그마 `Cheers / 학생 추가 정보`(335:7095 / 335:6954).
 *
 * 가입의 마지막 화면이다. 앞 화면이 담아 둔 기본 정보와 여기서 받은 값이
 * 합쳐져 `POST /user/student/info` **한 번**으로 저장되고, 그 응답에 새
 * 토큰이 실려 온다(`useSubmitStudentInfo` 가 받아 넣는다).
 *
 * 저장이 끝나면 `next_step` 이 null 이 되므로 라우터를 다시 평가시키기만
 * 하면 `/onboarding` 가드가 `/home` 으로 보낸다.
 */
export const Route = createFileRoute("/onboarding/student/extra")({
  /**
   * 새로고침하면 앞 화면의 값이 사라진다. 그 상태로 저장을 누르면 학과도
   * 관심 분야도 없이 요청이 나가 400 이 돌아오므로, 먼저 기본 정보로
   * 되돌려 보낸다.
   */
  beforeLoad: () => {
    if (!hasBasics(useStudentSignupDraft.getState().draft)) {
      throw redirect({ to: "/onboarding/student/profile" });
    }
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(userInfoQuery()),
  component: RouteComponent,
});

/** 명세의 `^01\d{8,9}$`. 저장은 숫자만 보낸다 */
const PHONE = /^01\d{8,9}$/;

function digitsOf(phone: string): string {
  return phone.replace(/\D/g, "");
}

function RouteComponent() {
  const router = useRouter();
  const navigate = useNavigate();
  const { data: me } = useSuspenseQuery(userInfoQuery());
  const { draft, patch, reset } = useStudentSignupDraft();
  const submit = useSubmitStudentInfo();
  const contactLabelId = useId();

  /** 시안에 칸이 하나 그려져 있다 — 비어 있어도 한 줄은 보여준다 */
  const [activities, setActivities] = useState<string[]>(
    draft.activities.length > 0 ? draft.activities : [""]
  );
  const [link, setLink] = useState(draft.portfolioUrl);
  const [emailEnabled, setEmailEnabled] = useState(draft.emailEnabled);
  const [kakaoEnabled, setKakaoEnabled] = useState(draft.kakaoEnabled);
  const [phone, setPhone] = useState(draft.phone);

  /** 시안의 읽기 전용 이메일 칸. 인증을 마친 학교 이메일이 선다 */
  const contactEmail = me.student?.email ?? me.email ?? "";

  const linkInvalid =
    link.trim().length > 0 && !link.trim().startsWith("https://");
  const phoneInvalid = kakaoEnabled && !PHONE.test(digitsOf(phone));
  /** 재학생은 둘 다 끄는 선택("희망하지 않음")이 허용되지 않는다 — 명세 400 */
  const contactChosen = emailEnabled || kakaoEnabled;

  const current = () => ({
    activities: activities.map((v) => v.trim()).filter(Boolean),
    portfolioUrl: link.trim(),
    emailEnabled,
    kakaoEnabled,
    phone: digitsOf(phone),
  });

  const back = () => {
    patch(current());
    void navigate({ to: "/onboarding/student/profile" });
  };

  const finish = () => {
    const extras = current();
    if (draft.departmentId === null) return; // beforeLoad 가 막아주지만 타입을 위해

    submit.mutate(
      {
        // 명세상 `name` 은 내 정보의 이름이 null 일 때만 받는다
        ...(me.name ? {} : { name: draft.name }),
        department_id: draft.departmentId,
        interests: draft.interests,
        // uniqueItems 라 같은 값이 두 번 들어가면 400 이다
        activities: [...new Set(extras.activities)],
        attachments: extras.portfolioUrl
          ? [
              {
                // 시안은 이력서와 포트폴리오를 **한 칸**으로 받는다. 명세는
                // 둘을 가르므로 링크 하나는 `portfolio` 로 보낸다 —
                // 파일로 올리는 이력서(`source: "file"`)는 이 화면에 없다
                kind: "portfolio" as const,
                source: "link" as const,
                url: extras.portfolioUrl,
              },
            ]
          : [],
        contact: {
          email_enabled: extras.emailEnabled,
          kakao_enabled: extras.kakaoEnabled,
          // 빈 문자열은 400 이다. 안 보내거나 값을 보내거나 둘 중 하나
          ...(extras.emailEnabled && contactEmail
            ? { email: contactEmail }
            : {}),
          ...(extras.kakaoEnabled && extras.phone
            ? { phone: extras.phone }
            : {}),
        },
      },
      {
        onSuccess: () => {
          // 가입이 끝났으니 임시 보관함을 비운다. 남겨두면 다음 가입(계정
          // 전환)에서 남의 값이 폼에 올라온다
          reset();
          void router.invalidate();
        },
      }
    );
  };

  const canSubmit =
    contactChosen && !linkInvalid && !phoneInvalid && !submit.isPending;

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
              참여 활동과 포트폴리오는 나중에 입력해도 괜찮아요.
            </p>
          </div>
        </div>

        {/* 피그마 `Content` — 카드 껍데기는 데스크톱에만 있다 */}
        <form
          className="lg:border-line lg:bg-surface lg:shadow-work flex flex-col gap-7 lg:w-200 lg:shrink-0 lg:rounded-lg lg:border lg:p-10"
          onSubmit={(e) => {
            e.preventDefault();
            finish();
          }}
        >
          {/*
           * 피그마에는 활동 칸이 하나뿐이지만 명세는 20개까지 받는다.
           * 줄 사이는 12 로 좁힌다 — 시안의 28 은 묶음과 묶음 사이 간격이고,
           * 같은 묶음이 반복되는 자리에 쓰면 한 덩어리로 안 읽힌다.
           */}
          <div className="flex flex-col gap-3">
            {activities.map((activity, i) => (
              <Field
                // 줄은 늘기만 하고 지우는 자리가 없으므로 순서가 곧 정체성이다
                key={i}
                label={i === 0 ? "참여 활동 (선택)" : `참여 활동 ${i + 1}`}
                labelHidden={i > 0}
                maxLength={50}
                placeholder="예) 학부 연구생"
                value={activity}
                onChange={(e) =>
                  setActivities((rows) =>
                    rows.map((row, at) => (at === i ? e.target.value : row))
                  )
                }
              />
            ))}
          </div>

          {/* 피그마 `+ 활동 추가` — 글자만 있는 자리지만 동작은 버튼이다 */}
          {activities.length < 20 ? (
            <button
              type="button"
              onClick={() => setActivities((rows) => [...rows, ""])}
              className="text-label text-brand self-start"
            >
              + 활동 추가
            </button>
          ) : null}

          <Field
            label="이력서 / 포트폴리오 링크 (선택)"
            type="url"
            inputMode="url"
            maxLength={2048}
            placeholder="입력해 주세요"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            hint="https://로 시작하는 링크를 입력해 주세요."
            error={
              linkInvalid
                ? "https:// 로 시작하는 주소만 저장할 수 있어요."
                : undefined
            }
          />

          <div className="bg-line h-px" />

          {/* 피그마 `연락 설정` */}
          <div className="flex flex-col gap-3">
            <h2 id={contactLabelId} className="text-card-title text-ink">
              연락 설정
            </h2>
            <p className="text-body-sm text-ink-soft">
              커피챗 소식을 받을 방법을 선택해 주세요.
            </p>
            {/*
             * 시안에는 `희망하지 않음` 칩이 하나 더 있다. **학생에게는 두지
             * 않았다** — 명세가 재학생의 "둘 다 false" 를 400 으로 막는다.
             * 누르면 저장이 안 되는 칸을 보여주느니 빼는 쪽을 골랐다.
             * (선배 화면에서는 허용되므로 거기서 다시 등장한다.)
             */}
            <div
              role="group"
              aria-labelledby={contactLabelId}
              className="flex flex-wrap gap-2"
            >
              <Choice
                selected={emailEnabled}
                onClick={() => setEmailEnabled((on) => !on)}
              >
                이메일
              </Choice>
              <Choice
                selected={kakaoEnabled}
                onClick={() => setKakaoEnabled((on) => !on)}
              >
                카카오 알림톡
              </Choice>
            </div>

            {!contactChosen ? (
              <p role="alert" className="text-body-sm text-danger">
                연락 방법을 하나 이상 선택해 주세요.
              </p>
            ) : null}

            {emailEnabled ? (
              <Field label="이메일" value={contactEmail} readOnly />
            ) : null}

            {/*
             * 시안에 없는 칸이다. 명세의 `contact.phone` 은 알림톡을 켤 때만
             * 의미가 있는데 받을 자리가 그려져 있지 않아 여기서 만들었다.
             */}
            {kakaoEnabled ? (
              <Field
                label="휴대폰 번호"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={13}
                placeholder="01012345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                hint="알림톡을 받을 번호예요."
                error={
                  phone.length > 0 && phoneInvalid
                    ? "숫자만 10~11자리로 입력해 주세요."
                    : undefined
                }
              />
            ) : null}
          </div>

          {submit.error ? (
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

function describeSubmitError(error: unknown): string {
  if (!isApiError(error)) return "저장하지 못했습니다. 다시 시도해 주세요.";

  if (error.status === 404) return "학교 이메일 인증을 먼저 마쳐 주세요.";
  if (error.status === 403) return "지금은 이 단계를 저장할 수 없어요.";
  if (error.status === 400) return "입력한 내용을 다시 확인해 주세요.";
  return "저장하지 못했습니다. 다시 시도해 주세요.";
}
