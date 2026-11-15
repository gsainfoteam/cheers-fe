import { cn } from "@/lib/utils";

/**
 * 한 줄짜리 정의 행. 피그마 `Cheers / Profile row`(332:5713).
 *
 * 시안 설명이 쓰임새를 못박아 뒀다: *"Compact definition row. Fixed label
 * column and flexible 16px value; consistent reading axis across profile and
 * request details."* — 프로필과 신청 상세가 **같은 읽기 축**을 쓰라는 뜻이라,
 * 처음부터 공통으로 둔다.
 *
 * **크기가 네 벌이다.** 같은 컴포넌트인데 시안에서 자리마다 다르게 쓰인다.
 *
 * | | `compact` (커피챗 신청) | `card` (받은 신청 내용 · 연락처 공유 확인) | `comfortable` (보낸 신청 내용) | `document` (마이페이지) |
 * |---|---|---|---|---|
 * | 이름표 칸 | **96** | 112 | 112 | 112 |
 * | 위아래 여백 | 10 | 12 | 12 | 14 |
 * | 이름표·값 사이 | 12 | 12 | 16 | 16 |
 * | 이름표 | Label/Small 12 | Body/Small 14 | Body/Small 14 | **Label/Medium 14** |
 * | 값 | Body/Small 14 | Body/Small 14 | Body/Medium 16 | Body/Medium 16 |
 *
 * 보내기 전에는 "확인하는 요약" 이라 빽빽하고, 보낸 뒤에는 "읽는 기록" 이라
 * 느슨하다. `card` 는 좁은 카드(360)·대화상자(416) 안에 들어가는 자리라
 * 값을 한 급 줄였다. 이름표 칸이 고정이고 값이 남은 폭을 먹는 구조는 넷이 같다.
 *
 * **이름표 칸은 크기마다 시안을 보고 정한다**(동기화 가이드 0.3.10). 04장
 * 커피챗 신청 시안이 96 이라 `compact` 만 바꿨다. 나머지는 그 화면 장에서
 * 확인할 때까지 112 다.
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
  size?: "compact" | "card" | "comfortable" | "document";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-line flex border-b",
        size === "document"
          ? "gap-4 py-3.5"
          : size === "comfortable"
            ? "gap-4 py-3"
            : size === "card"
              ? "gap-3 py-3"
              : "gap-3 py-2.5",
        className
      )}
    >
      {/* 이름표 칸은 고정 — 줄마다 값이 같은 선에서 시작한다 */}
      <dt
        className={cn(
          "text-ink-soft shrink-0",
          size === "compact" ? "w-24" : "w-28",
          size === "compact"
            ? "text-label-sm"
            : size === "document"
              ? "text-label"
              : "text-body-sm"
        )}
      >
        {label}
      </dt>
      <dd
        className={cn(
          "min-w-0 flex-1 break-words",
          value === null ? "text-ink-faint" : "text-ink",
          size === "comfortable" || size === "document" ? "text-body" : "text-body-sm"
        )}
      >
        {value ?? "등록하지 않음"}
      </dd>
    </div>
  );
}
