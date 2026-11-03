import { useId } from "react";
import chevronDown from "@/assets/icons/chevron-down.svg";
import { cn } from "@/lib/utils";

/**
 * 입력 필드. 피그마 `Cheers / Field`(332:5729).
 *
 * 시안이 다섯 상태를 그려 뒀는데, 코드에서는 **셋만 props 다.**
 *
 * | 시안 상태 | 코드 |
 * |---|---|
 * | Empty / Filled | 값이 있냐 없냐 — 네이티브가 알아서 한다 |
 * | Focus | `focus-within:` |
 * | Error | `error` prop |
 * | ReadOnly | `readOnly` prop (네이티브 속성) |
 *
 * 시안 설명이 *"Fields are real web form layouts, not native OS controls"*
 * 라고 적어 뒀다 — 생김새는 우리가 그리되 동작은 네이티브 `<input>` 이다.
 *
 * **포커스는 테두리를 굵히지 않고 안쪽 링으로 낸다.** 시안은 포커스에서
 * 테두리가 1px → 2px 이 되는데, 그대로 하면 글자가 1px 밀린다. 같은 두께로
 * 보이되 자리는 안 움직이게 `ring-inset` 을 겹쳤다.
 */

/**
 * 입력 상자의 모양. `<input>` 과 `<select>` 가 나눠 쓴다.
 *
 * 시안에서 학과 선택은 `Cheers / Field` 에 쐐기 아이콘만 붙은 모양이다.
 * 같은 컴포넌트이므로 클래스도 한 벌이어야 한다 — 두 벌이 되면 둘이
 * 어긋나도 아무도 모른다.
 */
function controlClass(error: boolean, readOnly: boolean) {
  return cn(
    "text-body text-ink h-13 w-full rounded-md border px-4 py-3.5",
    // placeholder 는 시안 Empty 상태의 글자색
    "placeholder:text-ink-soft",
    // 시안 Focus — 테두리 2px 대신 같은 색 안쪽 링을 겹쳐 자리 밀림을 막는다
    "focus-within:border-focus focus-within:ring-focus focus-within:ring-1 focus-within:ring-inset focus-within:outline-none",
    error ? "border-danger" : "border-control",
    // 시안 ReadOnly — 바탕이 캔버스색으로 내려앉아 "못 고치는 칸" 으로 읽힌다
    "read-only:bg-canvas read-only:focus-within:ring-0",
    readOnly ? "bg-canvas" : "bg-surface"
  );
}

type Shell = {
  label: string;
  /**
   * 라벨을 눈에서만 감춘다. 같은 라벨의 칸이 줄줄이 반복될 때
   * (참여 활동 여러 줄) 쓴다 — 보조기술에는 그대로 읽힌다.
   */
  labelHidden?: boolean;
  /** 입력 아래 도움말. `error` 가 있으면 가려진다 */
  hint?: string;
  /** 있으면 오류 상태. 이 문구가 도움말 자리를 대신한다 */
  error?: string;
};

/** 라벨 / 입력 / 도움말의 세로 배치. 입력만 갈아 끼운다 */
function FieldShell({
  label,
  labelHidden,
  hint,
  error,
  className,
  fieldId,
  children,
}: Shell & {
  className?: string;
  fieldId: string;
  children: React.ReactNode;
}) {
  const message = error ?? hint;

  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      <label
        htmlFor={fieldId}
        className={cn("text-label text-ink", labelHidden && "sr-only")}
      >
        {label}
      </label>

      {children}

      {message ? (
        <p
          id={`${fieldId}-message`}
          role={error ? "alert" : undefined}
          className={cn("text-body-sm", error ? "text-danger" : "text-ink-soft")}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

export function Field({
  label,
  labelHidden,
  hint,
  error,
  className,
  id,
  ...input
}: Shell & React.ComponentProps<"input">) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const message = error ?? hint;

  return (
    <FieldShell
      label={label}
      labelHidden={labelHidden}
      hint={hint}
      error={error}
      className={className}
      fieldId={fieldId}
    >
      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? `${fieldId}-message` : undefined}
        className={controlClass(Boolean(error), Boolean(input.readOnly))}
        {...input}
      />
    </FieldShell>
  );
}

/**
 * 고르는 필드. 시안에서는 `Cheers / Field` 에 `Select chevron`(20px)이
 * 붙은 모양이다.
 *
 * **네이티브 `<select>` 를 쓴다.** 시안 설명의 *"real web form layouts,
 * not native OS controls"* 는 OS 피커의 생김새를 쓰지 말라는 뜻이지 동작까지
 * 직접 만들라는 뜻이 아니다. 목록을 직접 그리면 키보드·포커스·모바일
 * 스크롤을 전부 다시 만들어야 하고, 이 화면에 그만한 요구가 없다.
 *
 * 쐐기는 네이티브 화살표를 끄고(`appearance-none`) 그 자리에 시안 아이콘을
 * 올린 것이다. 클릭은 아이콘을 통과해 select 로 간다.
 */
export function Select({
  label,
  labelHidden,
  hint,
  error,
  className,
  id,
  children,
  ...select
}: Shell & React.ComponentProps<"select">) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const message = error ?? hint;

  return (
    <FieldShell
      label={label}
      labelHidden={labelHidden}
      hint={hint}
      error={error}
      className={className}
      fieldId={fieldId}
    >
      <div className="relative w-full">
        <select
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? `${fieldId}-message` : undefined}
          className={cn(
            controlClass(Boolean(error), false),
            // 쐐기(20) + 오른쪽 여백(16) 만큼 글자 자리를 비운다
            "appearance-none pr-11"
          )}
          {...select}
        >
          {children}
        </select>
        <img
          src={chevronDown}
          alt=""
          className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2"
        />
      </div>
    </FieldShell>
  );
}
