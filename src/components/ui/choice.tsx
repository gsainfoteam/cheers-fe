import editPencil from "@/assets/icons/edit-pencil.svg";
import { cn } from "@/lib/utils";

/**
 * 고르는 칩. 피그마 `Cheers / Choice`(332:6032).
 *
 * **선택 표시에 체크 아이콘을 쓰지 않는다**(동기화 가이드 D0-2). 시안이
 * 체크를 뺐다. 그래도 색만으로 구분하는 것은 아니다 — 테두리가 옅은
 * `line` 에서 진한 `brand` 로 바뀌어 명도 차이가 크고, 글자색도 함께 바뀐다.
 * 보조기술에는 `aria-pressed` 로 알린다.
 *
 * **연필(`edit`)은 저장된 값을 고치는 화면에서만 켠다.** 선택된 칩 오른쪽에
 * 붙어서 "지금 저장된 값이고, 여기서 바꿀 수 있다" 로 읽힌다. 처음 고르는
 * 온보딩에서는 그 뜻이 맞지 않아 끈다. 지금 켜는 곳은 `/me/edit` 뿐이다.
 *
 * **라디오가 아니라 토글 버튼이다.** 관심 분야(여러 개)와 연락 방법(여러 개)
 * 둘 다 다중 선택이고, 하나만 고르는 자리는 아직 없다.
 *
 * 폭은 쓰는 쪽이 정한다 — 관심 분야는 격자가 칸을 나눠 같은 폭이 되고,
 * 연락 방법은 글자 길이대로 늘어난다. 시안이 그렇게 그려져 있다.
 */
export function Choice({
  selected,
  edit = false,
  className,
  children,
  ...button
}: {
  selected?: boolean;
  /** 선택됐을 때 연필 아이콘을 붙인다. 정보 수정 화면에서만 켠다 */
  edit?: boolean;
} & React.ComponentProps<"button">) {
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
      {children}
      {selected && edit ? (
        // 피그마 `edit-pencil` 14 — 라벨 오른쪽
        <img src={editPencil} alt="" width={14} height={14} className="shrink-0" />
      ) : null}
    </button>
  );
}
