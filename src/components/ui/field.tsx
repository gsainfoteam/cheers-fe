import { Select as BaseSelect } from "@base-ui/react/select";
import { useId } from "react";
import chevronDown from "@/assets/icons/chevron-down.svg";
import { BELOW_LG, useMediaQuery } from "@/lib/use-media-query";
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
 * 입력 상자의 모양. `<input>` 과 `Select` 의 트리거가 나눠 쓴다.
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
    /*
     * 시안 ReadOnly — 바탕이 캔버스색으로 내려앉아 "못 고치는 칸" 으로 읽힌다.
     * CSS `:read-only` 로 걸지 않는다. 그 선택자는 편집할 수 없는 요소 전부에
     * 맞아서 Select 의 트리거(`<button>`)가 늘 ReadOnly 로 그려지고 포커스
     * 링도 꺼졌다. 호출부가 넘긴 `readOnly` 로만 정한다.
     */
    readOnly ? "bg-canvas focus-within:ring-0" : "bg-surface"
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
 * 고르는 필드. 피그마 `Cheers / Field` 의 `select` + `dropdown`
 * (862:17197 / 875:25360) — 쐐기 달린 칸을 누르면 옵션 목록이 칸을 덮으며 열린다.
 *
 * **listbox 다(동기화 가이드 D0-3).** 네이티브 `<select>` 는 목록 모양을
 * 바꿀 수 없어서 시안의 드롭다운을 그릴 수 없다. 그렇다고 직접 만들면
 * 키보드 이동 · 글자로 찾기 · 포커스 · 바깥 클릭 · 스크롤 잠금을 전부 다시
 * 짜야 하므로 `@base-ui/react/select` 에 맡기고 모양만 입힌다.
 *
 * 값은 문자열이다. 숫자 id 를 쓰는 호출부는 경계에서 바꾼다.
 */
export type SelectOption = { value: string; label: string };

export function Select({
  label,
  labelHidden,
  hint,
  error,
  className,
  id,
  name,
  placeholder,
  options,
  value,
  onValueChange,
  onBlur,
  disabled,
  ref,
}: Shell & {
  className?: string;
  id?: string;
  name?: string;
  /** 고르기 전 칸에 보이는 글자. 시안 Empty 상태의 `입력해 주세요` 자리 */
  placeholder: string;
  options: SelectOption[];
  value: string | null;
  onValueChange: (value: string | null) => void;
  onBlur?: () => void;
  disabled?: boolean;
  /** 트리거 버튼. 폼 검증이 실패했을 때 여기로 포커스를 옮긴다 */
  ref?: React.Ref<HTMLButtonElement>;
}) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const message = error ?? hint;
  /** 모바일은 바텀시트(가이드 2.5.2). 열린 목록의 구조가 달라서 클래스가 아니라 분기다 */
  const sheet = useMediaQuery(BELOW_LG);

  return (
    <FieldShell
      label={label}
      labelHidden={labelHidden}
      hint={hint}
      error={error}
      className={className}
      fieldId={fieldId}
    >
      <BaseSelect.Root
        name={name}
        items={options}
        value={value}
        onValueChange={(next) => onValueChange(next ?? null)}
        disabled={disabled}
      >
        <BaseSelect.Trigger
          id={fieldId}
          ref={ref}
          onBlur={onBlur}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? `${fieldId}-message` : undefined}
          className={cn(
            controlClass(Boolean(error), false),
            "flex cursor-pointer items-center gap-2 text-left",
            // 목록이 열려 있는 동안은 칸이 포커스 상태로 보인다(시안 Focus + dropdown)
            "data-popup-open:border-focus data-popup-open:ring-focus data-popup-open:ring-1 data-popup-open:ring-inset"
          )}
        >
          <BaseSelect.Value
            placeholder={placeholder}
            className="min-w-0 flex-1 truncate data-placeholder:text-ink-soft"
          />
          {/* 피그마 `Select chevron` — 20 칸 */}
          <BaseSelect.Icon className="flex size-5 shrink-0 items-center justify-center">
            <img src={chevronDown} alt="" />
          </BaseSelect.Icon>
        </BaseSelect.Trigger>

        <BaseSelect.Portal>
          {sheet ? (
            // 바텀시트 뒤 배경막 — ink 44%(다이얼로그와 같은 값)
            <BaseSelect.Backdrop className="bg-ink-fill/44 fixed inset-0 z-50" />
          ) : null}
          {/*
           * 데스크톱: 기본값 `alignItemWithTrigger` 가 고른 옵션을 칸 위에 겹쳐
           * 연다 — 시안의 "목록이 칸을 덮는다" 와 같다.
           *
           * 모바일: 바텀시트(가이드 2.5.2, 시안 `916:38718`). Positioner 가
           * 인라인으로 넣는 위치를 `!` 로 덮어 화면 아래에 붙인다 — 리스트박스
           * 동작(키보드 · 글자로 찾기 · 포커스 · 스크롤 잠금)은 그대로 쓴다.
           */}
          <BaseSelect.Positioner
            alignItemWithTrigger={!sheet}
            className={cn(
              "z-50 outline-none",
              sheet && "fixed! inset-x-0! top-auto! bottom-0! w-full! transform-none!"
            )}
          >
            <BaseSelect.Popup
              className={cn(
                "bg-surface relative overflow-hidden",
                sheet
                  ? "flex w-full flex-col rounded-t-xl px-4 pb-4"
                  : cn(
                      "border-control w-(--anchor-width) rounded-md border",
                      // 시안 Dropdown 그림자. 이 목록에서만 쓰여 토큰으로 올리지 않았다
                      "shadow-[0_2px_5px_0_rgba(0,0,0,0.15)]"
                    )
              )}
            >
              {sheet ? (
                // 시안 드래그 핸들 40×4. 색 `#b3b3b3` 은 토큰이 아니라 가장 가까운 `control`
                <div aria-hidden className="flex justify-center p-4">
                  <span className="bg-control h-1 w-10 rounded-full" />
                </div>
              ) : null}
              <BaseSelect.List
                className={cn(
                  "overflow-y-auto outline-none",
                  // 데스크톱은 옵션 다섯 줄(51 × 5), 모바일은 여덟 줄(60 × 8)까지 보이고 그 뒤는 스크롤
                  sheet ? "max-h-[480px]" : "max-h-[255px]"
                )}
              >
                {options.map((option) => (
                  <BaseSelect.Item
                    key={option.value}
                    value={option.value}
                    className={cn(
                      "text-body text-ink flex cursor-pointer items-center outline-none select-none",
                      sheet
                        ? cn(
                            "h-15 rounded-md px-4 py-3.5",
                            // 시안 *"현재 선택된 학과 focusing"* — 캔버스 바탕 + Label/Large 브랜드색
                            "data-selected:bg-canvas data-selected:text-label-lg data-selected:text-brand",
                            // 열 때 고른 항목이 가리켜진 채로 시작한다. 그 항목은 시안처럼 바탕만 두고 링은 뺀다
                            "not-data-selected:data-highlighted:ring-focus not-data-selected:data-highlighted:ring-2 not-data-selected:data-highlighted:ring-inset"
                          )
                        : cn(
                            "border-control h-[51px] border-b py-3.5 pr-4 pl-4 last:border-b-0",
                            // 시안 — 가리킨 옵션은 2px focus 테두리. 자리가 밀리지 않게 안쪽 링
                            "data-highlighted:ring-focus data-highlighted:rounded-[2px] data-highlighted:ring-2 data-highlighted:ring-inset"
                          )
                    )}
                  >
                    <BaseSelect.ItemText className="truncate">{option.label}</BaseSelect.ItemText>
                  </BaseSelect.Item>
                ))}
              </BaseSelect.List>
            </BaseSelect.Popup>
          </BaseSelect.Positioner>
        </BaseSelect.Portal>
      </BaseSelect.Root>
    </FieldShell>
  );
}
