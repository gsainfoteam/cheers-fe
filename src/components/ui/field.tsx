import { useId } from "react";
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
export function Field({
  label,
  hint,
  error,
  className,
  id,
  ...input
}: {
  label: string;
  /** 입력 아래 도움말. `error` 가 있으면 가려진다 */
  hint?: string;
  /** 있으면 오류 상태. 이 문구가 도움말 자리를 대신한다 */
  error?: string;
} & React.ComponentProps<"input">) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const messageId = `${fieldId}-message`;
  const message = error ?? hint;

  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      <label htmlFor={fieldId} className="text-label text-ink">
        {label}
      </label>

      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={cn(
          "text-body text-ink h-13 w-full rounded-md border px-4 py-3.5",
          // placeholder 는 시안 Empty 상태의 글자색
          "placeholder:text-ink-soft",
          // 시안 Focus — 테두리 2px 대신 같은 색 안쪽 링을 겹쳐 자리 밀림을 막는다
          "focus-within:border-focus focus-within:ring-focus focus-within:ring-1 focus-within:ring-inset focus-within:outline-none",
          error ? "border-danger" : "border-control",
          // 시안 ReadOnly — 바탕이 캔버스색으로 내려앉아 "못 고치는 칸" 으로 읽힌다
          "read-only:bg-canvas read-only:focus-within:ring-0",
          input.readOnly ? "bg-canvas" : "bg-surface"
        )}
        {...input}
      />

      {message ? (
        <p
          id={messageId}
          role={error ? "alert" : undefined}
          className={cn("text-body-sm", error ? "text-danger" : "text-ink-soft")}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
