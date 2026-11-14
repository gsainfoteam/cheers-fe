import editPencil from "@/assets/icons/edit-pencil.svg";
import plusIcon from "@/assets/icons/plus-sm.svg";
import { cn } from "@/lib/utils";

/**
 * 고르는 칩. 피그마 `Cheers / Choice`(332:6032).
 *
 * **선택 표시에 체크 아이콘을 쓰지 않는다**(동기화 가이드 D0-2). 시안이
 * 체크를 뺐다. 그래도 색만으로 구분하는 것은 아니다 — 테두리가 옅은
 * `line` 에서 진한 `brand` 로 바뀌어 명도 차이가 크고, 글자색도 함께 바뀐다.
 * 보조기술에는 `aria-pressed` 로 알린다.
 *
 * **연필(`edit`)의 뜻은 "누르면 고치는 자리가 열린다" 다**(D0-2 개정, 가이드
 * 02장 2.5.3). 켜는 곳은 둘이다.
 * - `/me/edit` 의 선택된 고정 칩 — 저장된 값이고 여기서 바꿀 수 있다
 * - 학생이 직접 넣은 `기타` 관심 분야 칩 — 누르면 수정 팝업이 열린다
 *   (`opensDialog`). 가입 화면에서도 켠다.
 *
 * **라디오가 아니라 토글 버튼이다.** 관심 분야(여러 개)가 다중 선택이고,
 * 하나만 고르는 자리는 아직 없다. `opensDialog` 칩은 토글이 아니라
 * 대화상자를 여는 버튼이라 `aria-pressed` 대신 `aria-haspopup` 을 단다.
 *
 * 폭은 쓰는 쪽이 정한다 — 관심 분야는 격자가 칸을 나눠 같은 폭이 된다.
 */
export function Choice({
  selected,
  edit = false,
  opensDialog = false,
  className,
  children,
  ...button
}: {
  selected?: boolean;
  /** 선택됐을 때 연필 아이콘을 붙인다 */
  edit?: boolean;
  /** 누르면 대화상자가 열린다(사용자 칩). 토글이 아니다 */
  opensDialog?: boolean;
} & React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      aria-pressed={opensDialog ? undefined : selected}
      aria-haspopup={opensDialog ? "dialog" : undefined}
      className={cn(
        "text-label flex h-11 items-center justify-center gap-1 rounded-md border px-2 whitespace-nowrap",
        // 고정 칩은 한 줄이다. `이차전지/배터리` 처럼 칸(113)보다 살짝 긴 글자는
        // 가운데 정렬 그대로 좌우 여백으로 넘친다(시안 828:8301 과 같은 모양).
        // 사용자 칩은 길이를 모르는 값이라 칸 안에서 말줄임한다(전체 값은 `title`)
        opensDialog && "min-w-0",
        "focus-visible:border-focus focus-visible:ring-focus focus-visible:ring-1 focus-visible:outline-none",
        selected
          ? "bg-champagne border-brand text-brand"
          : "bg-surface border-line text-ink",
        className
      )}
      {...button}
    >
      {opensDialog ? <span className="truncate">{children}</span> : children}
      {selected && edit ? (
        // 피그마 `edit-pencil` 14 — 라벨 오른쪽
        <img src={editPencil} alt="" width={14} height={14} className="shrink-0" />
      ) : null}
    </button>
  );
}

/**
 * `+ 기타` 칩. 피그마 `Action / 기타 관심 분야 추가`(918:40009).
 *
 * `Choice` 와 같은 칸 크기에 테두리만 **점선**, 바탕은 비운다. 늘 고정 ·
 * 사용자 칩 뒤 마지막 칸에 선다.
 */
export function ChoiceAdd({
  className,
  children,
  ...button
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      className={cn(
        "text-label text-ink-soft border-line flex h-11 items-center justify-center gap-1 rounded-md border border-dashed px-2",
        "focus-visible:border-focus focus-visible:ring-focus focus-visible:ring-1 focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...button}
    >
      <img src={plusIcon} alt="" width={14} height={14} className="shrink-0" />
      {children}
    </button>
  );
}
