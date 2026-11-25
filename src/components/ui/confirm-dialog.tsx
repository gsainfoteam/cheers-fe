import { AlertDialog } from "@base-ui/react/alert-dialog";
import { action } from "./action";
import { cn } from "@/lib/utils";

/**
 * 확인 대화상자. 피그마 `Dialog / 연락처 공유 확인`(344:9450 / 344:9385),
 * 06장 `내 연락처 공유 모달`(1245:16975). `커피챗 수락 모달`(1245:16951)은
 * 수락 단계와 함께 없어졌다(이슈 #85).
 *
 * **오버레이의 세 번째 모양이다.** `ResponsiveDialog` 는 모바일에서 화면을
 * 덮지만, 이 상자는 모바일에서도 353 폭으로 가운데 떠 있다(위아래로 목록이
 * 비친다). 닫기 ✕ 도, 머리·본문 구분선도 없다 — 되돌릴 수 없는 일 하나를
 * 묻고 답을 받는 상자라서다. 그래서 `ResponsiveDialog` 에 억지로 넣지 않고
 * `AlertDialog` 로 따로 만들었다(바깥을 눌러도 닫히지 않는다).
 *
 * ## 두 가지 배치 (`layout`)
 *
 * | | `stacked` (회원 탈퇴) | `choice` (06장 공유) |
 * |---|---|---|
 * | 제목 · 설명 | 왼쪽 정렬 | **가운데** |
 * | 버튼 | 데스크톱 `돌아가기` 120 + 주 버튼 가로, 모바일 주 버튼 위 세로 | `아니오` / `네` **반반 가로**(두 폭 모두) |
 *
 * `stacked` 는 DOM 을 한 벌로 두고 `flex-col-reverse lg:flex-row` 로 순서를
 * 뒤집는다. `choice` 는 모바일 시안이 없어 데스크톱 배치를 그대로 쓴다 —
 * 버튼 글자가 짧아 353 폭에서도 반반이 들어간다(06장 D6-12).
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "돌아가기",
  onConfirm,
  busy = false,
  busyLabel = "처리 중…",
  layout = "stacked",
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** 제목 아래 한두 줄. Body/Medium 보조색 */
  description?: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  /** 처리 중이면 주 버튼을 막고 문구를 바꾼다 — 되돌릴 수 없는 일이 두 번 가지 않게 */
  busy?: boolean;
  /** 처리 중 주 버튼의 글자. 하는 일에 맞춰 준다(`보내는 중…`, `탈퇴하는 중…`) */
  busyLabel?: string;
  layout?: "stacked" | "choice";
  children?: React.ReactNode;
}) {
  const choice = layout === "choice";

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className={BACKDROP} />
        <AlertDialog.Popup className={PROMPT_POPUP}>
          <AlertDialog.Title className={cn("text-screen text-ink", choice && "text-center")}>
            {title}
          </AlertDialog.Title>
          {description ? (
            <AlertDialog.Description
              className={cn("text-body text-ink-soft", choice && "text-center")}
            >
              {description}
            </AlertDialog.Description>
          ) : null}

          {children}

          {/* 피그마 `Dialog actions` */}
          <div className={cn("flex gap-3", choice ? "flex-row" : "flex-col-reverse lg:flex-row")}>
            <AlertDialog.Close
              className={cn(
                action({ variant: "secondary" }),
                choice ? "min-w-0 flex-1" : "lg:w-30 lg:shrink-0"
              )}
            >
              {cancelLabel}
            </AlertDialog.Close>
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              aria-busy={busy || undefined}
              className={cn(action(), choice ? "min-w-0 flex-1" : "lg:flex-1")}
            >
              {busy ? busyLabel : confirmLabel}
            </button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

/**
 * 알리기만 하는 상자 — 버튼이 `확인` 하나다. 06장 `학생 탈퇴 시`(1258:9669):
 * 제목 `열람할 수 없어요` + 설명 + 폭 전체 Primary. 고를 것이 없어 `choice`
 * 배치의 가운데 글자만 쓴다.
 */
export function NoticeDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "확인",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className={BACKDROP} />
        <AlertDialog.Popup className={PROMPT_POPUP}>
          <AlertDialog.Title className="text-screen text-ink text-center">{title}</AlertDialog.Title>
          <AlertDialog.Description className="text-body text-ink-soft text-center">
            {description}
          </AlertDialog.Description>
          <AlertDialog.Close className={cn(action(), "w-full")}>{confirmLabel}</AlertDialog.Close>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

/**
 * `ResponsiveDialog`(z-40/50) **위에** 쌓인다 — 확인 상자가 다른 오버레이 위에
 * 또 뜰 수 있다. 같은 z 면 이 배경막이 아래 오버레이 밑에 깔려 아래 상자가
 * 어두워지지 않는다
 */
const BACKDROP = "bg-ink-fill/44 fixed inset-0 z-60";

/** 모바일 353(= 393 - 20 × 2), 데스크톱 480. 창이 낮으면 본문이 스크롤된다 */
export const PROMPT_POPUP =
  "bg-surface border-line fixed top-1/2 left-1/2 z-70 flex -translate-x-1/2 -translate-y-1/2 flex-col gap-5 rounded-lg border max-h-[calc(100svh-3rem)] w-[calc(100%-2.5rem)] overflow-y-auto p-6 lg:w-120 lg:p-8";
