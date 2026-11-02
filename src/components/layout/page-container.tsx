import { cn } from "@/lib/utils";

/**
 * 페이지 가로 폭과 좌우 여백. 셸에서 **한 번만** 정한다.
 *
 * 피그마는 1440(desktop)과 393(mobile) 두 벌뿐이고, 그 사이·그 바깥 폭의
 * 시안은 없다. 그래서 두 가지를 정해야 했다.
 *
 * 1. 좌우 여백 — 시안 그대로 모바일 20px(`px-5`), 데스크톱 96px(`px-24`).
 * 2. 1440보다 넓은 화면 — `max-w-page`(1440)로 묶고 가운데 정렬한다. 묶지
 *    않으면 1920 모니터에서 본문이 1728px 까지 늘어나 한 줄이 읽기 힘들어진다.
 *    1440 에서는 묶어도 안 묶어도 결과가 같으니 시안과 어긋나지 않는다.
 *
 * 헤더·푸터는 이 컨테이너를 **안쪽에** 쓴다. 배경과 구분선은 화면 끝까지
 * 가고, 로고·메뉴만 본문과 같은 선에 맞아야 하기 때문이다.
 */
export function PageContainer({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("max-w-page mx-auto w-full px-5 lg:px-24", className)}>
      {children}
    </div>
  );
}
