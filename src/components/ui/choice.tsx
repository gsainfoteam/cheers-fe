import checkIcon from "@/assets/icons/check-brand.svg";
import { cn } from "@/lib/utils";

/**
 * 고르는 칩. 피그마 `Cheers / Choice`(332:6032).
 *
 * 시안 설명: *"선택 상태는 주황 배경·테두리와 체크 아이콘으로 함께 표시"*.
 * 색만으로 상태를 내지 않는다는 뜻이라 체크 아이콘을 같이 넣는다.
 *
 * **라디오가 아니라 토글 버튼이다.** 관심 분야(여러 개)와 연락 방법(여러 개)
 * 둘 다 다중 선택이고, 하나만 고르는 자리는 아직 없다. 보조기술에는
 * `aria-pressed` 로 눌린 상태를 알린다.
 *
 * 폭은 쓰는 쪽이 정한다 — 관심 분야는 격자가 칸을 나눠 같은 폭이 되고,
 * 연락 방법은 글자 길이대로 늘어난다. 시안이 그렇게 그려져 있다.
 */
export function Choice({
  selected,
  className,
  children,
  ...button
}: { selected?: boolean } & React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "text-label flex h-11 items-center justify-center gap-1 rounded-md border px-2",
        "focus-visible:border-focus focus-visible:ring-focus focus-visible:ring-1 focus-visible:outline-none",
        selected
          ? "bg-champagne border-brand text-brand"
          : "bg-surface border-line text-ink",
        className
      )}
      {...button}
    >
      {selected ? (
        // 시안의 아이콘 칸은 14px 이고 체크 벡터는 그보다 작다. 벡터를 늘리지
        // 않고 칸 안에 가운데 두어야 시안과 같은 간격이 나온다
        <span className="flex size-3.5 shrink-0 items-center justify-center">
          <img src={checkIcon} alt="" />
        </span>
      ) : null}
      {children}
    </button>
  );
}
