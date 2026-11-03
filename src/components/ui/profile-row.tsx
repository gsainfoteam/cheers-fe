import { cn } from "@/lib/utils";

/**
 * 한 줄짜리 정의 행. 피그마 `Cheers / Profile row`(332:5713).
 *
 * 시안 설명이 쓰임새를 못박아 뒀다: *"Compact definition row. Fixed label
 * column and flexible 16px value; consistent reading axis across profile and
 * request details."* — 프로필과 신청 상세가 **같은 읽기 축**을 쓰라는 뜻이라,
 * 처음부터 공통으로 둔다.
 *
 * `<dl>` 안에서 쓴다. 이름표와 값의 관계가 마크업에 남아야 보조기술이
 * "이름: 예시 학생" 으로 읽는다.
 */
export function ProfileRow({
  label,
  value,
  className,
}: {
  label: string;
  /** 비어 있으면 호출부가 "등록하지 않음" 같은 문구를 넣는다 */
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("border-line flex gap-3 border-b py-2.5", className)}>
      {/* 이름표 칸은 112 고정 — 줄마다 값이 같은 선에서 시작한다 */}
      <dt className="text-label-sm text-ink-soft w-28 shrink-0">{label}</dt>
      <dd className="text-body-sm text-ink min-w-0 flex-1 break-words">
        {value}
      </dd>
    </div>
  );
}
