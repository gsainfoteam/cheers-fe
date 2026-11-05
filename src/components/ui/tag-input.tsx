import { useId, useState } from "react";
import removeIcon from "@/assets/icons/tag-remove.svg";

/**
 * 태그 입력. 피그마 `Cheers / Hastag`(875:30520), 쓰는 곳은 선배 추가 정보
 * (336:7282 / 336:7141). 학생 참여 활동(875:30619)도 같은 계열이라 그쪽이
 * 바뀌면 두 번째 사용처가 된다 — 한도만 다르므로 `max`·`maxLength` 를 받는다.
 *
 * 칸 안에 확정된 칩이 흐르고(`flex-wrap`), 그 뒤에 입력이 이어진다. Enter ·
 * 쉼표로 확정하고, 빈 입력에서 Backspace 를 누르면 마지막 칩이 지워진다.
 * 칸을 떠날 때도 치던 글자를 확정한다 — 안 그러면 쳐 둔 태그가 말없이 사라진다.
 *
 * **값에는 `#` 이 없다.** 화면에만 붙인다. 명세 패턴이 `^[^#]+$` 라 사용자가
 * `#` 을 쳐도 벗긴다.
 */
export function TagInput({
  label,
  hint,
  placeholder,
  value,
  onChange,
  max,
  maxLength,
}: {
  label: string;
  hint?: string;
  placeholder?: string;
  value: string[];
  onChange: (tags: string[]) => void;
  max: number;
  maxLength: number;
}) {
  const id = useId();
  const [text, setText] = useState("");
  const full = value.length >= max;

  const commit = () => {
    const tag = text.replace(/#/g, "").trim();
    setText("");
    // 같은 태그가 두 번 들어가면 `uniqueItems` 로 400 이다
    if (!tag || full || value.includes(tag)) return;
    onChange([...value, tag]);
  };

  const remove = (tag: string) => onChange(value.filter((t) => t !== tag));

  return (
    <div className="flex w-full flex-col gap-2">
      <label htmlFor={id} className="text-label text-ink">
        {label}
      </label>

      {/* 피그마 `Input / 참여 활동` — 생김새는 `Field` 와 같고 높이만 늘어난다 */}
      <div className="border-control bg-surface focus-within:border-focus focus-within:ring-focus flex min-h-13 w-full flex-wrap items-center gap-1 rounded-md border px-4 py-3 focus-within:ring-1 focus-within:ring-inset">
        {value.map((tag) => (
          // 피그마 `Hastag / State=Complete`
          <span
            key={tag}
            className="bg-muted text-body-sm text-brand flex items-center gap-1 rounded-md py-1 pr-1 pl-2.5"
          >
            #{tag}
            {/*
             * 시안은 모바일 칩에만 ✕ 가 있다. 데스크톱에서도 마우스로 지울
             * 길이 있어야 해서 두 폭 모두 둔다.
             */}
            <button
              type="button"
              aria-label={`${tag} 태그 지우기`}
              onClick={() => remove(tag)}
              className="focus-visible:ring-focus flex rounded-sm focus-visible:ring-1 focus-visible:outline-none"
            >
              <img src={removeIcon} alt="" />
            </button>
          </span>
        ))}

        {/*
         * 피그마 `Hastag / State=Processing` — 치는 동안에도 앞에 `#` 이 보인다.
         * 한도가 차면 입력 자리를 접는다(칩의 ✕ 로 지우면 다시 생긴다).
         */}
        <div
          className={
            full
              ? "sr-only"
              : "text-body text-ink flex min-w-16 flex-1 items-center"
          }
        >
          {text ? <span aria-hidden>#</span> : null}
          <input
            id={id}
            value={text}
            maxLength={maxLength}
            disabled={full}
            placeholder={value.length === 0 ? placeholder : undefined}
            aria-describedby={hint ? `${id}-hint` : undefined}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              // 한글 조합 중의 Enter 는 조합을 끝내는 키다. 그때 확정하면
              // 마지막 글자가 한 번 더 들어간 태그가 생긴다
              if (e.nativeEvent.isComposing) return;
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                commit();
              } else if (e.key === "Backspace" && !text && value.length > 0) {
                remove(value[value.length - 1]);
              }
            }}
            onBlur={commit}
            className="placeholder:text-ink-soft min-w-0 flex-1 bg-transparent outline-none"
          />
        </div>
      </div>

      {hint ? (
        <p id={`${id}-hint`} className="text-body-sm text-ink-soft">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
