import type { CSSProperties } from "react";
import brandSeal from "@/assets/landing/brand-seal.svg";
import signatureRibbon from "@/assets/landing/signature-ribbon.svg";
import { cn } from "@/lib/utils";

/**
 * 사원증 카드. 피그마 `Cheers / Employee badge`(354:9525).
 *
 * 시안 설명이 못박아 둔 제약: *"printed body uses ISO ID-1 portrait ratio
 * 53.98:85.6 at every viewport"*. 즉 이 카드는 폭마다 **다시 배치되는 게
 * 아니라 통째로 확대**된다. 모바일 170.5, 데스크톱 288 로 **같은 카드가
 * 1.689배** 될 뿐이고, 안쪽 여백도 글자도 전부 같은 비율로 커진다.
 *
 * ## 그래서 값을 `--u` 로 쓴다
 *
 * `--u` 는 **시안 1px**이다. 카드 폭이 170.5 일 때 정확히 1px 이고, 288 일
 * 때 1.689px 이 된다. 그래서 아래 모든 수치는 시안에 적힌 숫자를 그대로
 * 옮긴 것이다 — `calc(16 * var(--u))` 는 "시안의 16px" 이라는 뜻이다.
 *
 * 폭마다 `lg:` 를 달아 두 벌씩 적는 방법도 있지만, 그러면 스무 개 값이
 * 마흔 개가 되고 둘이 어긋나도 아무도 모른다. 비율이 하나라는 사실을
 * 코드에 그대로 남기는 쪽을 골랐다.
 *
 * 글자 크기도 `--u` 를 탄다. 모바일에서는 `Badge/Name mobile`(20) 같은
 * 토큰 값과 정확히 일치하고, 데스크톱에서는 그 값이 비율대로 커진다 —
 * 시안에 `Badge/* desktop` 짝이 없는 이유가 이것이다.
 *
 * ## 범위
 *
 * 신청 버튼은 카드에 **인쇄되지 않는다** (시안 설명: "Request CTA is
 * separate web UI, not printed on the card"). 카드 바깥에서 붙인다.
 */

/** 시안의 모바일 카드 폭. `--u` 의 기준이다 */
const BASE_WIDTH = 170.5;

export type EmployeeBadgeData = {
  /** 회사 로고 이미지 URL. 없으면 회사명만 보인다 */
  companyLogo?: string;
  company: string;
  /** 본명이 아니라 닉네임이다 */
  nickname: string;
  /** 직무. 시안은 두 줄까지 자리를 비워 둔다 */
  role: string;
  /** `#전기전자  #3년차` 같은 꼬리표 묶음 */
  meta: string;
};

export function EmployeeBadge({
  data,
  className,
}: {
  data: EmployeeBadgeData;
  className?: string;
}) {
  return (
    /*
     * 바깥 한 겹이 있는 이유. `100cqw` 는 **조상** 컨테이너를 보고 풀린다 —
     * `container-type` 을 카드 자신에게 걸면 카드의 테두리·모서리처럼 카드
     * 자신에게 적는 값이 카드 폭이 아니라 뷰포트 폭으로 계산된다.
     * 컨테이너를 한 겹 밖에 두면 카드와 그 안쪽이 모두 같은 기준을 본다.
     */
    <div className={cn("@container w-full", className)}>
      <article
        className="bg-surface border-line shadow-badge relative flex w-full flex-col overflow-clip"
        style={
          {
            // ISO ID-1 세로 비율. 높이를 적지 않아도 폭만 정하면 따라온다
            aspectRatio: "53.98 / 85.6",
            "--u": `calc(100cqw / ${BASE_WIDTH})`,
            borderWidth: "calc(0.8 * var(--u))",
            borderRadius: "calc(7.104 * var(--u))",
          } as CSSProperties
        }
      >
        {/* 피그마 `Company identity` */}
        <div className="flex flex-col items-start px-[calc(16*var(--u))] pt-[calc(26*var(--u))] gap-[calc(6*var(--u))]">
          {data.companyLogo ? (
            <img
              src={data.companyLogo}
              alt=""
              className="h-[calc(24.865*var(--u))] w-[calc(69.858*var(--u))] object-contain"
            />
          ) : null}
          {/* Badge/Company mobile 12/18/-0.3 */}
          <p className="text-ink-soft text-[calc(12*var(--u))] leading-[calc(18*var(--u))] tracking-[calc(-0.3*var(--u))]">
            {data.company}
          </p>
        </div>

        {/* 피그마 `Identity` */}
        <div className="flex w-full flex-col items-start px-[calc(16*var(--u))] pt-[calc(6*var(--u))] pb-[calc(12*var(--u))] gap-[calc(6*var(--u))]">
          {/* Badge/Name mobile 20/28/-0.7 */}
          <p className="text-ink font-bold text-[calc(20*var(--u))] leading-[calc(28*var(--u))] tracking-[calc(-0.7*var(--u))]">
            {data.nickname}
          </p>
          {/* Badge/Role mobile 14/20/-0.4 — 시안이 두 줄 자리를 비워 둔다 */}
          <p className="text-ink min-h-[calc(44*var(--u))] text-[calc(14*var(--u))] leading-[calc(20*var(--u))] tracking-[calc(-0.4*var(--u))] whitespace-pre-line">
            {data.role}
          </p>
          {/* Badge/Meta mobile 12/18/-0.4 */}
          <p className="text-ink-soft min-h-[calc(20*var(--u))] text-[calc(12*var(--u))] leading-[calc(18*var(--u))] tracking-[calc(-0.4*var(--u))] whitespace-pre-wrap">
            {data.meta}
          </p>
        </div>

        {/* 피그마 `Printed Cheers signature` — 카드 맨 아래 띠 */}
        <div className="bg-brand-accent relative mt-auto h-[calc(42.625*var(--u))] w-full overflow-clip">
          <img
            src={signatureRibbon}
            alt=""
            aria-hidden
            className="pointer-events-none absolute inset-0 size-full"
          />
          {/* Geist Bold 13.024/15.392/-1.2 */}
          <p
            className="text-ink absolute top-[calc(7.1*var(--u))] left-[calc(14.21*var(--u))] font-bold text-[calc(13.024*var(--u))] leading-[calc(15.392*var(--u))] tracking-[calc(-1.2*var(--u))]"
            style={{ fontFamily: "var(--font-brand)" }}
          >
            cheers!
          </p>
          {/* Brand/Micro 를 카드 비율로 줄인 것 — Geist Mono 4.736/7.104/+0.592 */}
          <p
            className="text-ink absolute top-[calc(25.46*var(--u))] left-[calc(14.8*var(--u))] text-[calc(4.736*var(--u))] leading-[calc(7.104*var(--u))] tracking-[calc(0.592*var(--u))]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            GIST ALUMNI
          </p>
          <img
            src={brandSeal}
            alt=""
            aria-hidden
            className="absolute top-[calc(13.62*var(--u))] left-[calc(137.35*var(--u))] h-[calc(16.158*var(--u))] w-[calc(18.944*var(--u))]"
          />
        </div>

        {/* 피그마 `Die-cut attachment slot` — 목걸이 줄이 지나가는 구멍 */}
        <div
          className="bg-muted border-line absolute top-[calc(6.3*var(--u))] left-[calc(72.61*var(--u))] h-[calc(2.96*var(--u))] w-[calc(23.681*var(--u))]"
          style={{
            borderWidth: "calc(0.6 * var(--u))",
            borderRadius: "calc(1.48 * var(--u))",
          }}
          />
      </article>
    </div>
  );
}
