import { cn } from "@/lib/utils";

/**
 * 한 줄짜리 정의 행. 피그마 `Cheers / Profile row`(332:5713).
 *
 * 시안 설명이 쓰임새를 못박아 뒀다: *"Compact definition row. Fixed label
 * column and flexible 16px value; consistent reading axis across profile and
 * request details."* — 프로필과 신청 상세가 **같은 읽기 축**을 쓰라는 뜻이라,
 * 처음부터 공통으로 둔다.
 *
 * **크기가 두 벌이다.** 같은 컴포넌트인데 시안에서 자리마다 다르게 쓰인다.
 *
 * | | `compact` (커피챗 신청 · 신청 내용 · 확인 상자) | `document` (마이페이지) |
 * |---|---|---|
 * | 이름표 칸 | 96 | 96 |
 * | 위아래 여백 | 10 | 14 |
 * | 이름표·값 사이 | 12 | 16 |
 * | 이름표 | Label/Small 12 | Label/Medium 14 |
 * | 값 | Body/Small 14 | Body/Medium 16 |
 *
 * 이름표 칸이 고정이고 값이 남은 폭을 먹는 구조는 둘이 같다. 05장에서
 * `comfortable` 을, 06장에서 `card`(112, 옛 받은 신청 내용 · 연락처 공유 확인)를
 * 없앴다 — 그 자리들이 모두 `compact` 로 바뀌었다(동기화 가이드 0.3.10, 6.5).
 *
 * **값이 `null` 이면 `등록하지 않음` 을 흐린 글자로 그린다.** 시안(04장 4.3.4)이
 * 빈 값을 text-disabled 로 칠한다 — 값이 있는 줄과 한눈에 갈린다.
 *
 * `<dl>` 안에서 쓴다. 이름표와 값의 관계가 마크업에 남아야 보조기술이
 * "이름: 예시 학생" 으로 읽는다.
 */
export function ProfileRow({
  label,
  value,
  size = "compact",
  className,
}: {
  /** 보통 글자. 시안이 줄을 끊어 둔 이름표(`이력서 /` · `포트폴리오`)는 `<br />` 을 넣어 준다 */
  label: React.ReactNode;
  /** `null` 이면 `등록하지 않음`(흐린 글자). 다른 문구가 필요하면 호출부가 넣는다 */
  value: React.ReactNode | null;
  size?: "compact" | "document";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-line flex border-b",
        size === "document" ? "gap-4 py-3.5" : "gap-3 py-2.5",
        className
      )}
    >
      {/* 이름표 칸은 고정 — 줄마다 값이 같은 선에서 시작한다 */}
      <dt
        className={cn(
          "text-ink-soft w-24 shrink-0",
          size === "document" ? "text-label" : "text-label-sm"
        )}
      >
        {label}
      </dt>
      <dd
        className={cn(
          "min-w-0 flex-1 break-words",
          value === null ? "text-ink-faint" : "text-ink",
          size === "document" ? "text-body" : "text-body-sm"
        )}
      >
        {value ?? "등록하지 않음"}
      </dd>
    </div>
  );
}
