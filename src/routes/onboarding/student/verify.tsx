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
import { SignupProgressSlot } from "@/components/signup-progress";
import { action } from "@/components/ui/action";
import { Field } from "@/components/ui/field";
import { track } from "@/lib/analytics";
import { formatWait, mmss, secondsUntil } from "@/lib/countdown";
import { isSchoolEmail, normalizeEmail } from "@/lib/school-email";
import { cn } from "@/lib/utils";

/**
 * 본인 확인. 동기화 가이드 02장 2.3 · 2.4.
 *
 * | 화면 | Desktop | Mobile |
 * |---|---|---|
 * | 학교 이메일 인증(기본) | 334:6585 | 334:6495 |
 * | 학교 이메일 입력 완료 | 828:7559 | 828:7575 |
 * | 학교 이메일 도메인 오류 | 911:33951 | 911:33967 |
 * | 학교 이메일 중복 | 911:34190 | 911:34206 |
 * | 인증번호 입력 | 334:6781 | 334:6675 |
 * | 인증번호 만료 | 335:6208 | 335:6103 |
 * | 인증번호 불일치 | 339:9803 | 339:9698 |
 *
 * **두 화면이지만 라우트는 하나다.** 서버의 `next_step` 은 `verify` 하나이고
 * (`lib/onboarding-steps.ts` 참고), 인증번호를 받고 나면 같은 단계에 머문다.
 *
 * **화면 전환은 마지막으로 성공한 발송 결과(`sent`)로 정한다.** mutation 의
 * `data` 로 정하면 `인증번호 다시 받기` 를 누르는 순간 react-query 가 이전
 * `data` 를 비워서, 요청이 끝날 때까지 이메일 화면으로 튀고 429 가 오면 거기
 * 남는다(가이드 2.4.3).
 */
export const Route = createFileRoute("/onboarding/student/verify")({
  component: RouteComponent,
});

type Sent = { expires_at: string; resend_available_at: string };

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

function RouteComponent() {
  const router = useRouter();
  const send = useSendStudentVerifyCode();
  const verify = useVerifyStudentCode();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  /** 마지막으로 성공한 발송. 있으면 인증번호 화면이다 */
  const [sent, setSent] = useState<Sent | null>(null);

  /**
   * 서버가 코드를 더는 받지 않는다고 답한 경우. 410 은 시간 만료, 404 는
   * 5번 틀려서 코드가 무효가 됐거나 진행 중인 요청이 없는 경우다(가이드
   * D2-6). 어느 쪽이든 새 번호를 받아야 하므로 시계상 만료와 같이 다룬다 —
   * 기기 시계가 틀려도 서버 응답이 기준이 된다.
   *
   * mutation 의 `error` 에서 끌어내지 않고 따로 든다. 새 번호를 받는 동안이나
   * 받다가 실패(429)해도 만료 화면에 머물러야 하는데, `verify.reset()` 이나
   * 다음 mutate 가 `error` 를 지운다. **새 번호를 받는 데 성공해야만** 푼다.
   */
  const [serverExpired, setServerExpired] = useState(false);

  const expiresIn = useCountdown(sent?.expires_at);
  const resendIn = useCountdown(sent?.resend_available_at);
  /** 429 가 알려 준 다음 발송 가능 시각까지. 그 전에는 다시 받기를 막는다 */
  const retryIn = useCountdown(retryAvailableAtOf(send.error));
  const expired = Boolean(sent) && (expiresIn === 0 || serverExpired);

  const sendCode = () =>
    send.mutate(
      { email: normalizeEmail(email) },
      {
        onSuccess: (result) => {
          track("Verify Code Sent");
          verify.reset();
          setServerExpired(false);
          setCode("");
          setSent(result);
        },
      }
    );

  const submitCode = () =>
    verify.mutate(
      { code },
      {
        // 다음 화면은 가드가 정한다. 인증이 끝나면 `next_step` 이 바뀌므로
        // 라우터를 다시 평가시키면 `/onboarding` 가드가 알아서 보낸다
        onSuccess: () => void router.invalidate(),
        onError: (error) => {
          track("Verify Code Failed", {
            status: isApiError(error) ? error.status : undefined,
          });
          if (isApiError(error) && (error.status === 404 || error.status === 410)) {
            setServerExpired(true);
          }
        },
      }
    );

  return (
    <PageContainer className="flex flex-col items-center pt-8 pb-12 lg:pt-16 lg:pb-18">
      {/* 피그마 `Task workspace` */}
      <div className="flex w-full flex-col gap-7 lg:w-244 lg:flex-row lg:items-start lg:gap-16">
        {/* 피그마 `Task introduction` */}
        {/* 모바일에서는 풀어서 단계 막대가 본문 전체를 기준으로 고정되게 한다 */}
        <div className="flex flex-col gap-7 max-lg:contents lg:w-88 lg:shrink-0 lg:gap-10 lg:pt-4">
          {/* 모바일은 제목 위에 고정, 데스크톱은 제목 아래 */}
          <SignupProgressSlot current={1} />
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
              email={normalizeEmail(email)}
              code={code}
              onCodeChange={(next) => {
                setCode(next);
                // 틀린 번호의 오류는 다시 치기 시작하면 지운다. 만료(404·410)는
                // 새 번호를 받기 전까지 그대로 둔다 — 같은 코드로는 안 된다
                if (verify.error && !serverExpired) verify.reset();
              }}
              expiresIn={expiresIn}
              expired={expired}
              error={
                // 방금 다시 받다가 난 오류(429 등)가 먼저다
                describeSendError(send.error) ??
                (expired ? undefined : describeVerifyError(verify.error))
              }
              busy={verify.isPending || send.isPending}
              sending={send.isPending}
              onBack={() => {
                send.reset();
                verify.reset();
                setServerExpired(false);
                setSent(null);
                setCode("");
              }}
              onSubmit={expired ? sendCode : submitCode}
              resendIn={Math.max(resendIn, retryIn)}
            />
          ) : (
            <EmailStep
              email={email}
              onEmailChange={(next) => {
                setEmail(next);
                // 중복(409) · 서버 오류는 주소를 고치면 지운다
                if (send.error) send.reset();
              }}
              serverError={describeSendError(send.error)}
              duplicate={isApiError(send.error) && send.error.status === 409}
              busy={send.isPending}
              waiting={retryIn > 0}
              onSubmit={sendCode}
            />
          )}
        </div>
      </div>
    </PageContainer>
  );
}

/* ───────────────── 1단계: 학교 이메일 ───────────────── */

/** 시안 `911:33951` 의 문구. 허용 도메인이 `gist.ac.kr` 전체라 디자이너 확인 중(가이드 2.3.2) */
const DOMAIN_ERROR = "gm 메일을 입력해주세요.";

/**
 * 도메인 검사는 **칸을 떠날 때** 시작한다(가이드 D2-4). 한 번 떠난 뒤로는
 * 값이 바뀔 때마다 다시 보므로, 고치는 즉시 문구가 사라지고 버튼이 켜진다.
 * 칸을 떠나기 전이라도 도메인이 틀리면 버튼은 꺼 둔다 — 문구만 늦게 뜬다.
 */
function EmailStep({
  email,
  onEmailChange,
  serverError,
  duplicate,
  busy,
  waiting,
  onSubmit,
}: {
  email: string;
  onEmailChange: (value: string) => void;
  serverError?: string;
  /** 409 가 떠 있는 동안은 같은 주소로 다시 보내지 못하게 한다(시안 `911:34190`) */
  duplicate: boolean;
  busy: boolean;
  /** 429 대기 중. 문구는 `serverError` 가 알리고 버튼만 막는다 */
  waiting: boolean;
  onSubmit: () => void;
}) {
  const [touched, setTouched] = useState(false);
  const valid = isSchoolEmail(email);
  const domainError = touched && email.trim() && !valid ? DOMAIN_ERROR : undefined;

  return (
    <form
      // 브라우저 기본 말풍선 대신 시안 문구를 쓴다(0장 "실제 웹 폼" 원칙)
      noValidate
      className="flex flex-col gap-7"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid && !duplicate && !busy && !waiting) onSubmit();
      }}
    >
      <Field
        label="학교 이메일"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="@gm.gist.ac.kr"
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
        onBlur={() => setTouched(true)}
        error={domainError ?? serverError}
      />
      <FormActions
        submitLabel={busy ? "보내는 중…" : "인증번호 보내기"}
        submitDisabled={!valid || duplicate || busy || waiting}
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
  sending,
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
  /** 새 번호를 받는 중. 만료 화면의 버튼 문구가 바뀐다 */
  sending: boolean;
  onBack: () => void;
  onSubmit: () => void;
  /** 다시 받을 수 있을 때까지 남은 초(발송 결과의 대기 + 429 의 대기 중 긴 쪽) */
  resendIn: number;
}) {
  /**
   * 만료가 틀린 코드보다 먼저다. 시간이 지났으면 그 코드로는 무엇을 해도
   * 안 되므로, "일치하지 않아요" 대신 "새로 받으세요" 를 보여준다. 다만
   * 다시 받다가 난 오류(`error`)가 있으면 그게 지금 할 일이라 앞에 둔다.
   */
  const message =
    error ?? (expired ? "인증 시간이 지났어요. 새 인증번호를 받아주세요." : undefined);

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
            ? sending
              ? "보내는 중…"
              : resendIn > 0
                ? `다시 받기 (${formatWait(resendIn)})`
                : "인증번호 다시 받기"
            : busy
              ? "확인 중…"
              : "인증하기"
        }
        submitDisabled={
          expired ? resendIn > 0 || sending : code.length !== 6 || busy
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
    // 429 는 재전송 대기와 발송 횟수 초과를 함께 쓴다. 후자는 1시간을 넘을 수 있다
    return `잠시 후 다시 보낼 수 있어요. (${formatWait(secondsUntil(retryAt))} 뒤)`;
  }
  if (error.status === 409) {
    return "이미 가입된 계정이 있습니다.";
  }
  if (error.status === 400) {
    // 화면 검사(`isSchoolEmail`)를 지나도 서버 허용 목록이 다르면 여기로 온다
    return DOMAIN_ERROR;
  }
  return "인증번호를 보내지 못했습니다. 다시 시도해 주세요.";
}

function describeVerifyError(error: unknown): string | undefined {
  if (!error) return undefined;
  if (!isApiError(error)) return "인증에 실패했습니다. 다시 시도해 주세요.";

  // 명세상 5번 틀리면 코드가 무효가 되므로 남은 횟수를 같이 보여준다(가이드 D2-5: 유지)
  const left = remainingAttemptsOf(error);
  if (left !== undefined) {
    return `인증번호가 일치하지 않아요. 다시 확인해 주세요. (${left}회 남음)`;
  }
  // 404 는 두 경우다 — 5번 틀려서 코드가 무효가 됐거나(서버 확인, 2026-11-14),
  // 진행 중인 인증 요청이 아예 없거나. 410 은 시간 만료다. 셋 다 화면에서는
  // `expired` 로 만료 화면이 되므로 이 문구는 예비용이다(가이드 2.4.2)
  if (error.status === 404 || error.status === 410) {
    return "인증 시간이 지났어요. 새 인증번호를 받아주세요.";
  }
  return "인증에 실패했습니다. 다시 시도해 주세요.";
}
