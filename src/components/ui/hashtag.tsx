import removeIcon from "@/assets/icons/tag-remove.svg";
import { cn } from "@/lib/utils";

/**
 * 해시태그 칩. 피그마 `Cheers / Hastag`(875:30520).
 *
 * 시안의 4상태와 코드의 대응:
 *
 * | 시안 상태 | 코드 | 모양 |
 * |---|---|---|
 * | Complete | `variant="complete"`(기본) | muted 바탕, 모서리 8 |
 * | Focused | `variant="focused"` | Complete 와 같고 바탕만 샴페인 |
 * | Candidate | `variant="candidate"` | 샴페인 알약 + 그림자. 자동완성 후보 자리 |
 * | Processing | `TagInput` 의 입력 칸 | 칩이 아니라 치는 중인 글자다(`#` + 입력) |
 *
 * Focused·Candidate 를 어느 화면에서 어떤 동작에 붙일지는 아직 정하지 않았다
 * (동기화 가이드 D0-9). 모양만 먼저 만들어 두고, 쓰는 화면이 나오면 그때 잇는다.
 *
 * **값에는 `#` 이 없다.** 화면에만 붙인다(`TagInput` 주석 참고).
 *
 * ✕ 는 `onRemove` 를 줄 때만 생긴다. 시안은 모바일 칩에만 ✕ 를 그렸지만
 * 데스크톱에서도 마우스로 지울 길이 있어야 해서 두 폭 모두 둔다. 신청 카드
 * 처럼 읽기만 하는 자리는 `onRemove` 없이 쓴다.
 */
export type HashtagVariant = "complete" | "focused" | "candidate";

const VARIANT: Record<HashtagVariant, string> = {
  complete: "bg-muted rounded-md",
  focused: "bg-champagne rounded-md",
  // 그림자는 이 칩에서만 쓰여서 토큰으로 올리지 않았다
  candidate: "bg-champagne rounded-full shadow-[1px_2px_2px_rgba(0,0,0,0.15)]",
};

export function Hashtag({
  value,
  variant = "complete",
  onRemove,
  className,
}: {
  value: string;
  variant?: HashtagVariant;
  onRemove?: () => void;
  className?: string;
}) {
  return (
    <span
      className={cn(
        // 참여 활동은 50자까지 받는다. 한 줄로 고정하면 393 카드 밖으로 나가서 칸 폭에서 줄을 바꾼다
        "text-body-sm text-brand inline-flex max-w-full items-center gap-1 px-2.5 py-1 break-all",
        VARIANT[variant],
        className
      )}
    >
      <span className="min-w-0">#{value}</span>
      {onRemove ? (
        <button
          type="button"
          aria-label={`${value} 태그 지우기`}
          onClick={onRemove}
          className="focus-visible:ring-focus flex shrink-0 rounded-sm focus-visible:ring-1 focus-visible:outline-none"
        >
          <img src={removeIcon} alt="" width={16} height={20} />
        </button>
      ) : null}
    </span>
  );
}

/** 읽기 전용 칩 묶음. 신청 카드 · 사원증 아래처럼 꼬리표를 늘어놓는 자리 */
export function HashtagList({
  values,
  className,
}: {
  values: string[];
  className?: string;
}) {
  if (values.length === 0) return null;
  return (
    <ul className={cn("flex flex-wrap gap-2", className)}>
      {values.map((value) => (
        <li key={value} className="max-w-full">
          <Hashtag value={value} />
        </li>
      ))}
    </ul>
  );
}
