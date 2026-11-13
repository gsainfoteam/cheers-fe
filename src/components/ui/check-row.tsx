import checkInverse from "@/assets/icons/check-inverse.svg";
import checkboxDisabled from "@/assets/icons/checkbox-disabled.svg";
import chevronIcon from "@/assets/icons/chevron-right.svg";
import { cn } from "@/lib/utils";

/**
 * 체크박스 한 줄. 피그마 `Cheers / Checkbox`(332:6136) — Off / On / Disable.
 *
 * 네이티브 `<input type="checkbox">` 를 숨기고 그 위에 시안 모양을 그린다.
 * 라이브러리를 쓰지 않은 이유: 여기 필요한 건 켜짐/꺼짐뿐이고, 네이티브가
 * 레이블 연결·키보드·폼 제출을 이미 전부 해 준다.
 *
 * 오른쪽 꺾쇠는 **본문을 여는 따로 떨어진 버튼**이다. 체크 영역 안에 두면
 * 약관을 읽으려다 동의가 토글된다.
 *
 * `Selected=Disable`(943:10132)은 상자에 대각선이 그어진 그림이다. 어느
 * 화면에서 쓰는지는 아직 없다 — 쓰는 화면이 나오면 `disabled` 를 넘긴다.
 * 시안의 Disable 은 켜짐·꺼짐 구분이 없어서 `checked` 와 상관없이 같은 그림이다.
 */
export function CheckRow({
  label,
  checked,
  onChange,
  onOpen,
  disabled = false,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  onOpen?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex h-12 w-full items-center justify-between py-2">
      <label
        className={cn(
          "flex items-center gap-3",
          disabled ? "cursor-not-allowed" : "cursor-pointer"
        )}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="peer sr-only"
        />
        {disabled ? (
          // 피그마 `Checkbox control`(943:10134) 그림 그대로
          <img src={checkboxDisabled} alt="" width={22} height={22} className="shrink-0" />
        ) : (
          <span
            className={cn(
              "flex size-[22px] shrink-0 items-center justify-center rounded-sm border",
              // 다른 컴포넌트와 같은 포커스 링 — focus 색 2px
              "peer-focus-visible:ring-focus peer-focus-visible:ring-2",
              checked ? "bg-ink-fill border-ink" : "bg-surface border-line-strong"
            )}
          >
            {checked ? <img src={checkInverse} alt="" className="w-[13px]" /> : null}
          </span>
        )}
        <span className="text-body-sm text-ink">{label}</span>
      </label>

      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          aria-label={`${label} 전문 보기`}
          className="focus-visible:ring-focus flex size-5 shrink-0 items-center justify-center rounded-sm focus-visible:ring-2 focus-visible:outline-none"
        >
          <img src={chevronIcon} alt="" className="h-[13px]" />
        </button>
      ) : null}
    </div>
  );
}
