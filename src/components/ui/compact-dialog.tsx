import { Dialog } from "@base-ui/react/dialog";
import popupCloseIcon from "@/assets/icons/popup-close.svg";
import { cn } from "@/lib/utils";

/**
 * 작은 가운데 모달. 피그마 `Dialog / 기타 관심 분야 추가`(920:40046 /
 * 920:41367), `기타 관심 분야 수정 팝업`(920:41288). 동기화 가이드 2.5.3.
 *
 * `ResponsiveDialog` 와 따로 둔 이유: 그쪽은 모바일 전체 화면 + 제목 줄 +
 * 구분선이 있는 "읽는" 오버레이고, 이쪽은 칸 하나와 버튼만 있는 짧은 입력
 * 상자다. 모바일에서도 전체 화면이 아니라 320 상자로 가운데 뜬다.
 *
 * | | 데스크톱 | 모바일 |
 * |---|---|---|
 * | 폭 | 400 | 320 |
 * | 안쪽 | `p-6 gap-6`, `rounded-xl`, 그림자 없음 | 같음 |
 * | 닫기 | 오른쪽 위 ✕ 32(`top-4 right-4`) | 같음 |
 *
 * **제목 줄이 따로 없다.** 칸의 라벨(`기타 관심 분야`)이 눈에 보이는 제목
 * 역할이고, 보조기술에 읽힐 대화상자 이름은 `label` 로 따로 받는다(추가와
 * 수정이 같은 라벨이라 라벨만으로는 무엇을 하는 상자인지 모른다).
 */
export function CompactDialog({
  open,
  onOpenChange,
  label,
  className,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 보조기술에 읽힐 대화상자 이름 */
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/* 시안 배경막 rgba(34,32,28,.44) = ink 44% */}
        <Dialog.Backdrop className="bg-ink-fill/44 fixed inset-0 z-40" />
        <Dialog.Popup
          aria-label={label}
          className={cn(
            "bg-surface fixed top-1/2 left-1/2 z-50 flex w-80 max-w-[calc(100vw-2.5rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-6 rounded-xl p-6 lg:w-100",
            className
          )}
        >
          {children}
          <Dialog.Close
            aria-label="닫기"
            className="focus-visible:ring-focus absolute top-4 right-4 flex size-8 items-center justify-center rounded-sm focus-visible:ring-2 focus-visible:outline-none"
          >
            <img src={popupCloseIcon} alt="" width={32} height={32} />
          </Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
