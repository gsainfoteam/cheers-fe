import checkIcon from "@/assets/icons/check.svg";
import { cn } from "@/lib/utils";

/**
 * 가입 진행 단계. 피그마 `Cheers / Signup progress`의 Desktop(476:5241)과
 * Mobile(486:5821).
 *
 * **두 폭이 서로 다른 컴포넌트로 그려져 있다.** 모바일은 상단 가로 4칸 막대,
 * 데스크톱은 좌측 세로 리스트다. 단순 reflow 가 아니라 모양 자체가 다르다 —
 * 그래서 여기서는 마크업을 두 벌 쓰고 `lg:` 로 한쪽만 보여준다. 숨긴 쪽은
 * `display:none` 이라 접근성 트리에서도 빠진다.
 *
 * 다만 **데이터는 하나**다. 어느 단계인지는 `onboarding.tsx` 가 라우트
 * 컨텍스트로 내려주는 `step` 하나에서 나온다. 새 상태 관리를 만들지 않는다.
 *
 * 시안 설명이 못박아 둔 것: *"읽기 전용이며 이동 동작 없음"*, *"단계는 클릭
 * 메뉴가 아니다"*. 그래서 링크도 버튼도 아니다.
 */

/** 시안의 4단계. 서버의 `next_step` 셋보다 잘게 나뉜다 — `lib/onboarding-steps.ts` 참고 */
const STEPS = ["약관 동의", "본인 확인", "기본 정보", "추가 정보"] as const;

export type SignupStepIndex = 0 | 1 | 2 | 3;

export function SignupProgress({ current }: { current: SignupStepIndex }) {
  return (
    <>
      {/*
       * 피그마 `Signup progress / Mobile` — 가로 4칸.
       *
       * 끝난 단계는 막대가 꺼지는 게 아니라 **같은 주황을 35% 로 흐린다.**
       * 지나온 길이 남아 보이고 지금 칸만 또렷해진다. 체크는 아이콘이 아니라
       * 라벨 앞의 `✓` 글자다 — 시안이 그렇게 적어 뒀다.
       */}
      <ol className="flex items-start gap-2 lg:hidden">
        {STEPS.map((label, i) => (
          <li key={label} className="flex min-w-0 flex-1 flex-col gap-2">
            <div
              className={cn(
                "h-0.5 w-full rounded-full",
                i < current
                  ? "bg-brand-accent opacity-35"
                  : i === current
                    ? "bg-brand-accent"
                    : "bg-line"
              )}
            />
            <span
              className={cn(
                "text-label-sm",
                i === current ? "text-brand" : "text-ink-soft"
              )}
            >
              {i < current ? `✓ ${label}` : label}
            </span>
          </li>
        ))}
      </ol>

      {/* 피그마 `Signup progress / Desktop` — 세로 리스트 */}
      <ol className="hidden lg:flex lg:flex-col">
        {STEPS.map((label, i) => (
          <li key={label}>
            {/* 피그마 `Step connection` — 동그라미 사이를 잇는 세로선 */}
            {i > 0 ? (
              <div className="flex h-6 w-10 items-center justify-center">
                <div className="bg-line h-6 w-px" />
              </div>
            ) : null}
            <DesktopStep
              label={label}
              number={i + 1}
              state={i < current ? "complete" : i === current ? "current" : "upcoming"}
            />
          </li>
        ))}
      </ol>
    </>
  );
}

/** 피그마 `Cheers / Building blocks / Signup step` — 3상태 */
function DesktopStep({
  label,
  number,
  state,
}: {
  label: string;
  number: number;
  state: "complete" | "current" | "upcoming";
}) {
  return (
    <div className="flex h-10 items-center gap-4">
      {/* 피그마 `Step marker` */}
      <div className="flex size-10 shrink-0 items-center justify-center">
        <div
          className={cn(
            "flex size-8 items-center justify-center rounded-full",
            state === "current"
              ? "bg-champagne border-focus border-2"
              : state === "complete"
                ? "bg-surface border-line border"
                : "bg-surface border-control border"
          )}
        >
          {state === "complete" ? (
            <img src={checkIcon} alt="" className="size-[18px]" />
          ) : (
            <span
              className={cn(
                "text-label",
                state === "current" ? "text-brand" : "text-ink-soft"
              )}
            >
              {number}
            </span>
          )}
        </div>
      </div>

      {/* 피그마 `Step label and status` */}
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "text-label-lg",
            state === "current" ? "text-ink" : "text-body text-ink-soft"
          )}
        >
          {label}
        </span>
        {state === "current" ? (
          <span className="text-label-sm text-brand">진행 중</span>
        ) : null}
      </div>
    </div>
  );
}
