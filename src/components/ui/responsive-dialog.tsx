import { Dialog } from "@base-ui/react/dialog";
import closeIcon from "@/assets/icons/close.svg";
import { cn } from "@/lib/utils";
import { action } from "./action";

/**
 * 반응형 오버레이. 피그마 `Dialog / 서비스 이용약관`(335:6378 / 335:6314).
 *
 * 설계 5.3 의 규칙: **PC 는 목록 위 모달, 모바일은 전체 화면.** 약관 본문,
 * 신청 상세, 전달 프로필 미리보기가 모두 이 형태다. 시안 46화면 중 헤더·
 * 푸터가 없는 여섯 개가 전부 "모바일 전체 화면" 쪽이었다.
 *
 * ## Dialog 하나로 두 모드를 낸다 (설계 8절의 열린 질문)
 *
 * 폭에 따라 **다른 컴포넌트를 렌더하지 않는다.** 두 모드의 DOM 이 완전히
 * 같고(머리 / 구분선 / 스크롤 본문 / 구분선 / 버튼), 달라지는 건 상자의
 * 기하뿐이라서다. 컴포넌트를 갈아 끼우면
 *
 * - 창 폭이 경계를 넘을 때 다시 마운트돼 **본문 스크롤 위치가 날아가고**,
 * - 포커스 트랩·`aria` 처리를 두 벌 유지해야 한다.
 *
 * CSS 로 가르면 둘 다 공짜다. 모바일은 `inset-0` 로 화면을 덮고, `lg:` 에서
 * 가운데 720 상자가 된다.
 *
 * ## 스크롤 (설계 5.3)
 *
 * *"PC 모달은 본문만 스크롤하고 닫기 버튼과 주요 버튼은 항상 접근 가능하게
 * 유지한다."* 그래서 머리와 버튼 줄은 스크롤 영역 **바깥**에 있고, 가운데
 * 본문만 `overflow-y-auto` 다. 모바일도 같은 구조라 긴 약관에서 버튼이
 * 화면 밖으로 밀려나지 않는다.
 */
export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  className,
  actions,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** 데스크톱 상자 크기를 바꿀 때. 모바일은 늘 전체 화면이다 */
  className?: string;
  /**
   * 아래 버튼 줄. 안 주면 `닫기` 하나다 — 읽기만 하는 오버레이(약관)가
   * 그 모양이고, 무언가를 보내는 오버레이(커피챗 신청)는 자기 버튼을 준다.
   * `false` 면 버튼 줄과 그 위 구분선을 아예 그리지 않는다 — 행동이 본문
   * 안에 있는 오버레이(받은 신청 내용)가 그 모양이다.
   */
  actions?: React.ReactNode | false;
  children?: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/* 시안 `Backdrop` — ink 44%. 모바일에서는 상자가 전체를 덮어 안 보인다 */}
        <Dialog.Backdrop className="bg-ink-fill/44 fixed inset-0 z-40" />

        <Dialog.Popup
          className={cn(
            "bg-surface fixed z-50 flex flex-col",
            // 모바일: 전체 화면
            "inset-0",
            // 데스크톱: 가운데 720 상자. 시안 높이 610 을 쓰되 창이 더 낮으면
            // 줄어든다 — 안 그러면 짧은 노트북에서 버튼 줄이 잘린다
            "lg:inset-auto lg:top-1/2 lg:left-1/2 lg:h-152.5 lg:max-h-[calc(100svh-6rem)] lg:w-180 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-xl lg:shadow-modal",
            className
          )}
        >
          {/* 피그마 `Dialog header` */}
          <div className="flex shrink-0 items-center gap-4 px-5 py-4 lg:px-8 lg:py-5">
            <Dialog.Title className="text-h2 text-ink lg:text-screen flex-1">
              {title}
            </Dialog.Title>
            <Dialog.Close
              aria-label="닫기"
              className="flex size-11 shrink-0 items-center justify-center p-2.5"
            >
              <img src={closeIcon} alt="" className="size-6" />
            </Dialog.Close>
          </div>

          <div className="bg-line h-px shrink-0" />

          {/* 피그마 `Scrollable dialog body` — 여기만 스크롤한다 */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="flex flex-col gap-6 px-5 py-6 lg:px-8">
              {children}
            </div>
          </div>

          {actions === false ? null : (
            <>
              <div className="bg-line h-px shrink-0" />

              {/* 피그마 `Dialog actions` */}
              <div className="flex shrink-0 justify-end gap-3 px-5 pt-4 pb-5 lg:px-8">
                {actions ?? (
                  <Dialog.Close className={cn(action(), "w-full lg:w-60")}>
                    닫기
                  </Dialog.Close>
                )}
              </div>
            </>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * 본문을 불러오는 동안 보여주는 뼈대. 피그마 `Loading paragraph`.
 *
 * 약관 본문은 `GET /user/consent/list` 가 준 `url` 에서 따로 받아오므로
 * 기다리는 시간이 있다. 시안에 이 화면만 "불러오는 중" 이 따로 그려져 있다.
 */
export function DialogBodySkeleton({ paragraphs = 3 }: { paragraphs?: number }) {
  return (
    <>
      <p className="text-body-sm text-ink-soft">약관을 불러오는 중이에요.</p>
      {Array.from({ length: paragraphs }, (_, i) => (
        <div key={i} className="flex flex-col gap-3" aria-hidden>
          <div className="bg-muted h-4 w-[169px] rounded-sm lg:w-[315px]" />
          <div className="bg-muted h-2.5 w-full rounded-sm" />
          <div className="bg-muted h-2.5 w-full rounded-sm" />
          <div className="bg-muted h-2.5 w-full rounded-sm" />
          <div className="bg-muted h-2.5 w-[70%] rounded-sm" />
        </div>
      ))}
    </>
  );
}
