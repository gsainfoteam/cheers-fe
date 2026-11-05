import { AlertDialog } from "@base-ui/react/alert-dialog";
import { action } from "./action";
import { cn } from "@/lib/utils";

/**
 * 확인 대화상자. 피그마 `Dialog / 연락처 공유 확인`(344:9450 / 344:9385).
 *
 * **오버레이의 세 번째 모양이다.** `ResponsiveDialog` 는 모바일에서 화면을
 * 덮지만, 이 상자는 모바일에서도 353 폭으로 가운데 떠 있다(위아래로 목록이
 * 비친다). 닫기 ✕ 도, 머리·본문 구분선도 없다 — 되돌릴 수 없는 일 하나를
 * 묻고 답을 받는 상자라서다. 그래서 `ResponsiveDialog` 에 억지로 넣지 않고
 * `AlertDialog` 로 따로 만들었다(바깥을 눌러도 닫히지 않는다).
 *
 * 탈퇴 확인(선배 가이드 §5.4)이 두 번째 사용처가 될 것이다.
 *
 * **버튼 순서가 폭마다 뒤집힌다.** 데스크톱은 `돌아가기` 120 + 주 버튼
 * **가로**, 모바일은 주 버튼 **위**·`돌아가기` 아래 **세로**. DOM 은 한 벌로
 * 두고 `flex-col-reverse lg:flex-row` 로 순서를 뒤집는다.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  confirmLabel,
  cancelLabel = "돌아가기",
  onConfirm,
  busy = false,
  busyLabel = "처리 중…",
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  /** 처리 중이면 주 버튼을 막고 문구를 바꾼다 — 되돌릴 수 없는 일이 두 번 가지 않게 */
  busy?: boolean;
  /** 처리 중 주 버튼의 글자. 하는 일에 맞춰 준다(`보내는 중…`, `탈퇴하는 중…`) */
  busyLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        {/*
         * `ResponsiveDialog`(z-40/50) **위에** 쌓인다 — 연락처 공유 확인은
         * 받은 신청 내용 오버레이 위에 또 뜬다. 같은 z 면 이 배경막이 아래
         * 오버레이 밑에 깔려 아래 상자가 어두워지지 않는다
         */}
        <AlertDialog.Backdrop className="bg-ink-fill/44 fixed inset-0 z-60" />
        <AlertDialog.Popup
          className={cn(
            "bg-surface border-line fixed top-1/2 left-1/2 z-70 flex -translate-x-1/2 -translate-y-1/2 flex-col gap-5 rounded-lg border",
            // 모바일 353(= 393 - 20 × 2), 데스크톱 480. 창이 낮으면 본문이 스크롤된다
            "max-h-[calc(100svh-3rem)] w-[calc(100%-2.5rem)] overflow-y-auto p-6 lg:w-120 lg:p-8"
          )}
        >
          <AlertDialog.Title className="text-screen text-ink">
            {title}
          </AlertDialog.Title>

          {children}

          {/* 피그마 `Dialog actions` */}
          <div className="flex flex-col-reverse gap-3 lg:flex-row">
            <AlertDialog.Close
              className={cn(
                action({ variant: "secondary" }),
                // 이 상자의 Secondary 는 글자가 Web/Button(16)이다
                "text-button lg:w-30 lg:shrink-0"
              )}
            >
              {cancelLabel}
            </AlertDialog.Close>
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              aria-busy={busy || undefined}
              className={cn(action(), "lg:flex-1")}
            >
              {busy ? busyLabel : confirmLabel}
            </button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
