import { useId, useState } from "react";
import { Hashtag } from "./hashtag";

/**
 * 태그 입력. 피그마 `Cheers / Hastag`(875:30520), 쓰는 곳은 선배 추가 정보
 * (336:7282 / 336:7141). 학생 참여 활동(875:30619)도 같은 계열이라 그쪽이
 * 바뀌면 두 번째 사용처가 된다 — 한도만 다르므로 `max`·`maxLength` 를 받는다.
 *
 * 칸 안에 확정된 칩이 흐르고(`flex-wrap`), 그 뒤에 입력이 이어진다. 기본값은
 * Enter · 쉼표로 확정하고, 필요하면 Enter 만으로 제한할 수 있다. 빈 입력에서
 * Backspace 를 누르면 마지막 칩이 지워진다.
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
  commitOnComma = true,
  showInputHash = true,
}: {
  label: string;
  /** 줄을 폭마다 다르게 끊어야 할 때가 있어 노드도 받는다(선배 해시태그) */
  hint?: React.ReactNode;
  placeholder?: string;
  value: string[];
  onChange: (tags: string[]) => void;
  max: number;
  maxLength: number;
  /** 쉼표를 태그 구분자로 쓸지. 선배 해시태그는 Enter 로만 확정한다. */
  commitOnComma?: boolean;
  /** 입력 중인 값 앞의 장식용 `#` 표시 여부 */
  showInputHash?: boolean;
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

      {/* 피그마 `Input / 참여 활동` — 생김새는 `Field` 와 같고 높이만 늘어난다. 칩 사이 모바일 행 12 · 열 4, 데스크톱 좌우 여백 8(05장 5.3.4) */}
      <div className="border-control bg-surface focus-within:border-focus focus-within:ring-focus flex min-h-13 w-full flex-wrap items-center gap-x-1 gap-y-3 rounded-md border px-4 py-3 lg:gap-1 lg:px-2 focus-within:ring-1 focus-within:ring-inset">
        {value.map((tag) => (
          // 피그마 `Hastag / State=Complete` — ✕ 는 두 폭 모두 둔다(`Hashtag` 주석)
          <Hashtag key={tag} value={tag} onRemove={() => remove(tag)} />
        ))}

        {/*
         * 피그마 `Hastag / State=Processing` — 필요한 입력만 치는 동안 `#` 을
         * 보인다. 확정 칩은 항상 `Hashtag` 가 `#` 을 붙여 표시한다.
         * 한도가 차면 입력 자리를 접는다(칩의 ✕ 로 지우면 다시 생긴다).
         */}
        <div
          className={
            full
              ? "sr-only"
              : "text-body text-ink flex min-w-16 flex-1 items-center"
          }
        >
          {showInputHash && text ? <span aria-hidden>#</span> : null}
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
              if (e.key === "Enter" || (commitOnComma && e.key === ",")) {
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
