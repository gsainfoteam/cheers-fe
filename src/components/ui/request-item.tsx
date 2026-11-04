import { Link } from "@tanstack/react-router";
import chevronRight from "@/assets/icons/chevron-right.svg";
import coffeeIcon from "@/assets/icons/coffee.svg";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";

/**
 * 신청 행. 피그마 `Cheers / Request item`(332:5717).
 *
 * 학생의 보낸 신청(`Action / sentDetail`)과 선배의 받은 신청
 * (`Action / received`)이 **같은 컴포넌트**다. 받은 신청이 두 번째 사용처가
 * 되면서 `applications.tsx` 안에서 올라왔다. 둘 다 같은 상세 경로
 * (`/applications/$applicationId`)로 간다 — 학생·선배가 한 경로를 나눠 쓴다.
 *
 * `applicationId` 를 주지 않으면 **누를 수 없는 행**이 된다. 링크 대신
 * `<div>` 로 그리고 쐐기를 뺀다 — 탈퇴한 학생의 신청처럼 상세가 410 으로
 * 막힌 행을 색이 아니라 구조로 막는다.
 */
export function RequestItem({
  applicationId,
  title,
  detail,
  date,
}: {
  applicationId?: string;
  title: string;
  /** 둘째 줄. 학과 · 관심 분야, 회사 · 직무 같은 것 */
  detail: string;
  /** ISO 시각. `2026.10.12` 로 그린다 */
  date: string;
}) {
  const body = (
    <>
      {/* 피그마 `Coffee icon` — 샴페인 바탕의 정사각 */}
      <span className="bg-champagne flex size-11 shrink-0 items-center justify-center rounded-md">
        <img src={coffeeIcon} alt="" />
      </span>

      {/* 피그마 `Request content` */}
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="text-card-title text-ink">{title}</span>
        <span className="text-body-sm text-ink-soft">{detail}</span>
        <span className="text-label-sm text-ink-soft">{formatDate(date)}</span>
      </span>

      {applicationId ? (
        <img src={chevronRight} alt="" className="shrink-0" />
      ) : null}
    </>
  );

  const className = cn(
    "bg-surface border-line flex items-center gap-4 rounded-lg border px-4 py-5 lg:gap-6 lg:p-7"
  );

  return applicationId ? (
    <Link
      to="/applications/$applicationId"
      params={{ applicationId }}
      className={className}
    >
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
