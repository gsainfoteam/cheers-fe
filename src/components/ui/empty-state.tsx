import coffeeLarge from "@/assets/icons/coffee-lg.svg";

/**
 * 목록이 비었을 때. 피그마 `Empty request list`(보낸 신청 없음 337:7926 /
 * 받은 신청 없음 339:9992).
 *
 * 커피 아이콘 + 제목 + 설명 + 버튼의 **뼈대만** 공통이다. 문구와 버튼은
 * 쓰는 쪽이 정한다 — 학생은 선배 둘러보기로, 선배는 내 프로필로 보낸다.
 */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: React.ReactNode;
  /** 보통 `action()` 클래스를 단 `<Link>` 하나. `w-full lg:w-60` 이 시안 폭이다 */
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-6 py-12 lg:py-14">
      <img src={coffeeLarge} alt="" />
      <h2 className="text-h2 text-ink text-center">{title}</h2>
      <p className="text-body text-ink-soft text-center">{description}</p>
      {action}
    </div>
  );
}
