import type { ReactNode } from "react";
import { cn } from "cn";

/**
 * 라우트 하나를 데스크톱에서는 가운데 모달로, 모바일에서는 전체 화면(form)
 * 또는 바텀시트(notice)로 그린다.
 *
 * 분기를 useMediaQuery 가 아니라 CSS 로 두는 이유: 창 크기가 바뀌어도
 * 리마운트가 일어나지 않아 작성 중인 입력값이 살아남는다.
 *
 * TODO: Base UI Dialog 로 감싸 포커스 트랩과 ESC 닫기를 얻을 것.
 */
export function RouteOverlay({
  variant,
  onClose,
  children,
}: {
  variant: "form" | "notice";
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div
        className={cn(
          "absolute bg-background text-foreground md:top-1/2 md:left-1/2 md:h-auto md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-xl md:border md:shadow-lg",
          variant === "form"
            ? "inset-0 md:inset-auto md:w-[480px]"
            : "inset-x-0 bottom-0 rounded-t-xl md:inset-auto md:w-[380px] md:rounded-xl"
        )}
      >
        {children}
      </div>
    </div>
  );
}
