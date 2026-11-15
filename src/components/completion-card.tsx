import checkIcon from "@/assets/icons/check-circle.svg";

/**
 * 완료 카드. 피그마 `Completion check` — 커피챗 신청 완료(337:7304 /
 * 337:7217)와 연락처 공유 완료(339:9132 / 339:9048).
 *
 * 둘이 같은 뼈대다: 체크(72, champagne 원) + 제목 + 설명 + 버튼 줄. 신청
 * 완료는 버튼이 둘(Primary + Ghost), 공유 완료는 하나라 버튼 줄은 쓰는 쪽이
 * `children` 으로 넣는다. 데스크톱 560 카드, 모바일은 껍데기 없이 353.
 *
 * 신청 완료의 Ghost 는 `Form actions` **바깥**, 카드의 형제 자리라 위 간격이
 * 24 다(동기화 가이드 04장 4.4). 그래서 `secondaryAction` 으로 따로 받는다.
 */
export function CompletionCard({
  title,
  description,
  children,
  secondaryAction,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  /** 버튼 줄 아래 한 단계 낮은 행동. 카드 간격(24)으로 떨어진다 */
  secondaryAction?: React.ReactNode;
}) {
  return (
    <div className="lg:border-line lg:bg-surface lg:shadow-work flex w-full flex-col items-center gap-6 lg:w-140 lg:rounded-lg lg:border lg:p-10">
      <div className="bg-champagne flex size-18 items-center justify-center rounded-full">
        <img src={checkIcon} alt="" />
      </div>

      <div className="flex flex-col gap-3 text-center lg:w-120">
        {/*
         * 시안이 이 제목만 다른 짝을 쓴다 — 모바일 `Task/Title`(32/44),
         * 데스크톱 `Display/Page`(36/48). 토큰 하나로는 안 나와서 둘을
         * 갈아 끼웠다.
         */}
        <h1 className="text-task-title lg:text-page text-ink">{title}</h1>
        <p className="text-body text-ink-soft">{description}</p>
      </div>

      {/* 피그마 `Form actions` — 버튼은 카드 폭을 가득 채운다 */}
      <div className="flex w-full flex-col gap-3 pt-2 lg:w-120">{children}</div>

      {secondaryAction ? (
        <div className="flex w-full flex-col lg:w-120">{secondaryAction}</div>
      ) : null}
    </div>
  );
}
