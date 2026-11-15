import coffeeLarge from "@/assets/icons/coffee-lg.svg";
import { cn } from "@/lib/utils";

/**
 * 목록이 비었을 때. 피그마 `Empty request list`(보낸 신청 없음 337:8010 /
 * 337:7926, 받은 신청 없음 339:9998 / 339:9914).
 *
 * 커피 아이콘(44 칸) 아래 글자. 화면마다 묶음이 다르다.
 *
 * | | 보낸 신청 없음 (05장 5.4.5) | 받은 신청 없음 (06장 6.4.3) |
 * |---|---|---|
 * | 글자 | 제목 Heading/Card 18 + 설명 Label/Large 16, 사이 16 | **한 줄** Label/Large 16 |
 * | 버튼 | `선배 둘러보기` | 없음 |
 * | 아이콘 ↔ 글자 | 24 | **32** |
 * | 높이 | 위아래 여백 48 / 56 | 360 칸 가운데 |
 *
 * 글자는 둘 다 흐린 색(text-disabled)이다. `description` 과 `action` 이 모두
 * 없으면 한 줄 모양으로 그린다.
 */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: React.ReactNode;
  /** 보통 `action()` 클래스를 단 `<Link>` 하나. `w-full lg:w-60` 이 시안 폭이다 */
  action?: React.ReactNode;
}) {
  const line = !description && !action;

  return (
    <div
      className={cn(
        "flex flex-col items-center",
        line ? "min-h-90 justify-center gap-8" : "gap-6 py-12 lg:py-14"
      )}
    >
      {/* 피그마 `Icon / coffee` — 44 칸 안의 그림(37.95 × 39.78) */}
      <span className="flex size-11 items-center justify-center">
        <img src={coffeeLarge} alt="" />
      </span>
      {line ? (
        <p className="text-label-lg text-ink-faint text-center">{title}</p>
      ) : (
        <div className="flex flex-col items-center gap-4 text-center">
          <h2 className="text-card-title text-ink-faint">{title}</h2>
          {description ? <p className="text-label-lg text-ink-faint">{description}</p> : null}
        </div>
      )}
      {action}
    </div>
  );
}
