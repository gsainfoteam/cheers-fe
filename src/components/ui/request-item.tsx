import { Link } from "@tanstack/react-router";
import chevronRight from "@/assets/icons/chevron-right.svg";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import { HashtagList } from "./hashtag";

/**
 * 신청 행. 피그마 `Cheers / Received Requests`(1237:10977)와
 * `Cheers / Sent Requests`(1237:11072).
 *
 * 둘은 틀이 같다 — 이름 + 날짜 줄, 이름표/값 정의 행, 해시태그 줄, 오른쪽 쐐기.
 * 다른 건 **어떤 정보를 넣느냐**뿐이라 컴포넌트는 하나고, 행과 칩은 호출부가
 * 데이터에서 고른다(`applications.tsx`). 옛 `Cheers / Request item`(332:5717)의
 * 커피 아이콘 · 한 줄 요약은 시안에서 없어졌다.
 *
 * ## 폭에 따라
 *
 * - 데스크톱: 이름표 80 + 값이 한 줄(`gap-3`), 둘 다 Body/Medium 16.
 * - 모바일: 이름표(Label/Micro 11)가 위, 값이 아래로 쌓인다. 해시태그 줄에도
 *   이름표(`tagsLabel`)가 붙는다. 데스크톱에는 칩만 있다.
 *
 * `Sent Requests` 는 데스크톱 시안만 있어서 모바일은 Received 의 규칙을 같이 쓴다.
 *
 * ## 누를 수 없는 행
 *
 * `applicationId` 를 주지 않으면 링크 대신 `<div>` 로 그리고 쐐기를 뺀다 —
 * 탈퇴한 학생의 신청처럼 상세가 410 으로 막힌 행을 색이 아니라 구조로 막는다.
 */
export type RequestRow = { label: string; value: string };

export function RequestItem({
  applicationId,
  name,
  date,
  rows,
  note,
  tags = [],
  tagsLabel,
}: {
  applicationId?: string;
  /** 굵은 첫 줄. `{학생}님의 신청`, `{선배} 선배` 처럼 호출부가 짓는다 */
  name: string;
  /** ISO 시각. `2026.10.12 신청` 으로 그린다 */
  date: string;
  /** 이름표/값 정의 행. 값이 빈 행은 그리지 않는다 */
  rows: RequestRow[];
  /** 정의 행 대신 쓰는 한 줄 안내. 탈퇴한 상대처럼 시안에 없는 상태용 */
  note?: string;
  /** 해시태그. 비어 있으면 줄째 그리지 않는다 */
  tags?: string[];
  /** 모바일에서 칩 위에 붙는 이름표(예: `참여 활동`) */
  tagsLabel?: string;
}) {
  const visibleRows = rows.filter((row) => row.value);

  const body = (
    <>
      {/* 피그마 `Request content` */}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {/* 피그마 `Name and Date` */}
        <p className="flex flex-wrap items-center gap-x-2">
          <span className="text-h3 text-ink break-words">{name}</span>
          <span className="text-label-xs text-ink-soft whitespace-nowrap">
            {formatDate(date)} 신청
          </span>
        </p>

        {note ? <p className="text-body-sm text-ink-soft">{note}</p> : null}

        {/* 피그마 `기본 정보` */}
        {visibleRows.length > 0 ? (
          <dl className="flex flex-col gap-2">
            {visibleRows.map((row) => (
              <div key={row.label} className="flex flex-col lg:flex-row lg:gap-3">
                <dt className="text-label-xs text-ink-soft lg:text-body lg:w-20 lg:shrink-0">
                  {row.label}
                </dt>
                <dd className="text-body text-ink min-w-0 break-words lg:flex-1">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        {/* 피그마 `해시태그` — 모바일은 이름표가 위에 붙는다 */}
        {tags.length > 0 ? (
          <div className="flex flex-col gap-1">
            {tagsLabel ? (
              <p className="text-label-xs text-ink-soft lg:hidden">{tagsLabel}</p>
            ) : null}
            <HashtagList values={tags} />
          </div>
        ) : null}
      </div>

      {applicationId ? (
        // 피그마 `Icon / chevron` — 20 칸 가운데
        <span className="flex size-5 shrink-0 items-center justify-center">
          <img src={chevronRight} alt="" />
        </span>
      ) : null}
    </>
  );

  const className = cn(
    "bg-surface border-line flex items-center gap-6 rounded-lg border p-6",
    // 시안에 상태가 없다. 키보드 사용자가 어느 행에 있는지는 알아야 해서 포커스 링만 둔다
    applicationId &&
      "focus-visible:ring-focus focus-visible:ring-2 focus-visible:ring-inset focus-visible:outline-none"
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
