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
 * | | `compact` (커피챗 신청) | `comfortable` (보낸 신청 내용) |
 * |---|---|---|
 * | 위아래 여백 | 10 | 12 |
 * | 이름표 | Label/Small 12 | Body/Small 14 |
 * | 값 | Body/Small 14 | Body/Medium 16 |
 *
 * 보내기 전에는 "확인하는 요약" 이라 빽빽하고, 보낸 뒤에는 "읽는 기록" 이라
 * 느슨하다. 이름표 칸 112 와 값이 남은 폭을 먹는 구조는 둘이 같다.
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
  label: string;
  /** 비어 있으면 호출부가 "등록하지 않음" 같은 문구를 넣는다 */
  value: React.ReactNode;
  size?: "compact" | "comfortable";
  className?: string;
}) {
  const comfortable = size === "comfortable";

  return (
    <div
      className={cn(
        "border-line flex border-b",
        comfortable ? "gap-4 py-3" : "gap-3 py-2.5",
        className
      )}
    >
      {/* 이름표 칸은 112 고정 — 줄마다 값이 같은 선에서 시작한다 */}
      <dt
        className={cn(
          "text-ink-soft w-28 shrink-0",
          comfortable ? "text-body-sm" : "text-label-sm"
        )}
      >
        {label}
      </dt>
      <dd
        className={cn(
          "text-ink min-w-0 flex-1 break-words",
          comfortable ? "text-body" : "text-body-sm"
        )}
      >
        {value}
      </dd>
    </div>
  );
}
