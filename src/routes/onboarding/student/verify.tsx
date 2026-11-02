import { useEffect, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
  isApiError,
  remainingAttemptsOf,
  retryAvailableAtOf,
  useSendStudentVerifyCode,
  useVerifyStudentCode,
} from "@/api";
import { PageContainer } from "@/components/layout/page-container";
import { SignupProgress } from "@/components/signup-progress";
import { action } from "@/components/ui/action";
import { Field } from "@/components/ui/field";
import { cn } from "@/lib/utils";

/**
 * 본인 확인. 피그마 `Cheers / 학교 이메일 인증`(334:6585 / 334:6495)과
 * `Cheers / 인증번호 입력`(334:6781 / 334:6675, 만료·불일치 포함).
 *
 * **두 화면이지만 라우트는 하나다.** 서버의 `next_step` 은 `verify` 하나이고
 * (`lib/onboarding-steps.ts` 참고), 인증번호를 받고 나면 같은 단계에 머문다.
 * 경로를 나누면 새로고침했을 때 코드를 받은 상태가 사라진다 — 지금은 보낸
 * 결과(`expires_at`)가 있으면 입력 화면, 없으면 이메일 화면이다.
 */
export const Route = createFileRoute("/onboarding/student/verify")({
  component: RouteComponent,
});

/**
 * 주어진 시각까지 남은 초. 1초마다 줄어든다.
 *
 * 남은 초를 state 에 담지 않고 **렌더할 때마다 계산한다.** 타이머는 다시
 * 그리라고 깨우는 역할만 한다. 이렇게 두면 `until` 이 바뀌었을 때 state 를
 * 따로 맞춰줄 일이 없다 — 다음 렌더가 이미 새 값을 본다.
 */
function useCountdown(until: string | undefined): number {
  const [, tick] = useState(0);

  useEffect(() => {
    if (!until) return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [until]);

  return secondsUntil(until);
}

function secondsUntil(iso: string | undefined): number {
  if (!iso) return 0;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 1000));
}

function mmss(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function RouteComponent() {
  const router = useRouter();
  const send = useSendStudentVerifyCode();
  const verify = useVerifyStudentCode();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  /** 코드를 보낸 적이 있으면 입력 화면으로 넘어간다 */
  const sent = send.data;

  const expiresIn = useCountdown(sent?.expires_at);
  const resendIn = useCountdown(sent?.resend_available_at);
  const expired = Boolean(sent) && expiresIn === 0;

  const sendCode = () => {
    setCode("");
    verify.reset();
    send.mutate({ email });
  };

  const submitCode = () =>
    // 다음 화면은 가드가 정한다. 인증이 끝나면 `next_step` 이 바뀌므로
    // 라우터를 다시 평가시키면 `/onboarding` 가드가 알아서 보낸다
    verify.mutate({ code }, { onSuccess: () => void router.invalidate() });

  return (
    <PageContainer className="flex flex-col items-center pt-8 pb-12 lg:pt-16 lg:pb-18">
      {/* 피그마 `Task workspace` */}
      <div className="flex w-full flex-col gap-7 lg:w-244 lg:flex-row lg:items-start lg:gap-16">
        {/* 피그마 `Task introduction` */}
        <div className="flex flex-col gap-7 lg:w-88 lg:shrink-0 lg:gap-10 lg:pt-4">
          <div className="order-first lg:order-last">
            <SignupProgress current={1} />
          </div>
          <div className="flex flex-col gap-3 lg:gap-5">
            <h1 className="text-task-title text-ink">
              {sent ? "인증번호 입력" : "학교 이메일 인증"}
            </h1>
            <p className="text-body text-ink-soft">
              {sent
                ? "학교 이메일로 보낸 6자리 번호를 입력해 주세요."
                : "GIST 학교 이메일로 인증번호를 보내드려요."}
            </p>
          </div>
        </div>

        {/* 피그마 `Content` — 카드 껍데기는 데스크톱에만 있다 */}
        <div className="lg:border-line lg:bg-surface lg:shadow-work flex flex-col gap-7 lg:w-140 lg:shrink-0 lg:rounded-lg lg:border lg:p-10">
          {sent ? (
            <CodeStep
              email={email}
              code={code}
              onCodeChange={setCode}
              expiresIn={expiresIn}
              expired={expired}
              error={describeVerifyError(verify.error)}
              busy={verify.isPending}
              onBack={() => send.reset()}
              onSubmit={expired ? sendCode : submitCode}
              resendIn={resendIn}
            />
          ) : (
            <EmailStep
              email={email}
              onEmailChange={setEmail}
              error={describeSendError(send.error)}
              busy={send.isPending}
              onSubmit={sendCode}
            />
          )}
        </div>
      </div>
    </PageContainer>
  );
}

/* ───────────────── 1단계: 학교 이메일 ───────────────── */

function EmailStep({
  email,
  onEmailChange,
  error,
  busy,
  onSubmit,
}: {
  email: string;
  onEmailChange: (value: string) => void;
  error?: string;
  busy: boolean;
  onSubmit: () => void;
}) {
  return (
    <form
      className="flex flex-col gap-7"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <Field
        label="학교 이메일"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="student@gm.gist.ac.kr"
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
        hint="GIST 학교 이메일을 입력해 주세요."
        error={error}
      />
      <FormActions
        submitLabel={busy ? "보내는 중…" : "인증번호 보내기"}
        submitDisabled={!email || busy}
      />
    </form>
  );
}

/* ───────────────── 2단계: 인증번호 ───────────────── */

function CodeStep({
  email,
  code,
  onCodeChange,
  expiresIn,
  expired,
  error,
  busy,
  onBack,
  onSubmit,
  resendIn,
}: {
  email: string;
  code: string;
  onCodeChange: (value: string) => void;
  expiresIn: number;
  expired: boolean;
  error?: string;
  busy: boolean;
  onBack: () => void;
  onSubmit: () => void;
  resendIn: number;
}) {
  /**
   * 만료가 틀린 코드보다 먼저다. 시간이 지났으면 그 코드로는 무엇을 해도
   * 안 되므로, "일치하지 않아요" 대신 "새로 받으세요" 를 보여준다.
   */
  const message = expired
    ? "인증 시간이 지났어요. 새 인증번호를 받아주세요."
    : error;

  return (
    <form
      className="flex flex-col gap-7"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      {/* 어느 주소로 보냈는지 보여주되 고치지는 못하게 한다 (시안 ReadOnly) */}
      <Field label="학교 이메일" value={email} readOnly />

      <Field
        label="인증번호"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="6자리 숫자"
        value={code}
        onChange={(e) => onCodeChange(e.target.value.replace(/\D/g, ""))}
        // 만료 전에는 남은 시간이 도움말 자리에 선다
        hint={expired ? undefined : `남은 시간 ${mmss(expiresIn)}`}
        error={message}
      />

      <FormActions
        onBack={onBack}
        submitLabel={
          expired
            ? resendIn > 0
              ? `다시 받기 (${mmss(resendIn)})`
              : "인증번호 다시 받기"
            : busy
              ? "확인 중…"
              : "인증 확인"
        }
        submitDisabled={
          expired ? resendIn > 0 : code.length !== 6 || busy
        }
      />
    </form>
  );
}

/**
 * 피그마 `Form actions`.
 *
 * 모바일은 `이전` 이 100 고정이고 주 버튼이 남은 폭을 채운다. 데스크톱은
 * 오른쪽 끝에 붙고 주 버튼이 240 고정이다.
 */
function FormActions({
  onBack,
  submitLabel,
  submitDisabled,
}: {
  onBack?: () => void;
  submitLabel: string;
  submitDisabled: boolean;
}) {
  return (
    <div className="flex justify-end gap-3 pt-4">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className={cn(action({ variant: "secondary" }), "w-25 lg:w-26")}
        >
          이전
        </button>
      ) : null}
      <button
        type="submit"
        disabled={submitDisabled}
        className={cn(action(), "flex-1 lg:w-60 lg:flex-none")}
      >
        {submitLabel}
      </button>
    </div>
  );
}

/* ───────────────── 오류 문구 ───────────────── */

function describeSendError(error: unknown): string | undefined {
  if (!error) return undefined;
  if (!isApiError(error)) return "인증번호를 보내지 못했습니다. 다시 시도해 주세요.";

  const retryAt = retryAvailableAtOf(error);
  if (retryAt) {
    return `잠시 후 다시 보낼 수 있어요. (${mmss(secondsUntil(retryAt))} 뒤)`;
  }
  if (error.status === 409) {
    return "이미 다른 계정이 인증한 이메일이에요.";
  }
  if (error.status === 400) {
    return "GIST 학교 이메일을 입력해 주세요.";
  }
  return "인증번호를 보내지 못했습니다. 다시 시도해 주세요.";
}

function describeVerifyError(error: unknown): string | undefined {
  if (!error) return undefined;
  if (!isApiError(error)) return "인증에 실패했습니다. 다시 시도해 주세요.";

  // 명세상 5번 틀리면 코드가 무효가 되므로 남은 횟수를 같이 보여준다
  const left = remainingAttemptsOf(error);
  if (left !== undefined) {
    return `인증번호가 일치하지 않아요. 다시 확인해 주세요. (${left}회 남음)`;
  }
  if (error.status === 404) {
    return "인증번호가 만료됐어요. 새 인증번호를 받아주세요.";
  }
  return "인증에 실패했습니다. 다시 시도해 주세요.";
}
