import { useState, type CSSProperties } from "react";
import catCheers from "@/assets/brand/cat-cheers.svg";
import signatureRibbon from "@/assets/landing/signature-ribbon.svg";
import { cn } from "@/lib/utils";
import { BrandCat } from "./brand-cat";

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
 * ## 글자만 두 벌이다
 *
 * **상자는 비율로 커지지만 글자는 아니다.** 시안의 288 카드를 재보면
 * 이름 30(비율대로면 33.8), 직무 17(23.6), 회사·꼬리표 13(20.3)이다.
 * 로고·띠·여백은 전부 비율 그대로인데 글자만 따로 짜 넣었다 — 카드가
 * 1.689배가 된다고 글자까지 그만큼 키우면 읽기 힘들어서다.
 *
 * 그래서 글자 네 개만 `@min-[220px]:` 로 두 벌을 쓴다. 기준은 **뷰포트가
 * 아니라 카드 폭**이다(바깥 `@container`). 170.5 짜리 카드는 작은 쪽,
 * 288 짜리는 큰 쪽을 쓰고, 그 사이 어디에 놓여도 카드가 스스로 정한다.
 * 작은 쪽 값이 `Badge/* mobile` 토큰과 정확히 일치한다 — 큰 쪽에는
 * 짝이 되는 토큰이 없어서 수치를 그대로 적었다.
 *
 * ## 범위
 *
 * 신청 버튼은 카드에 **인쇄되지 않는다** (시안 설명: "Request CTA is
 * separate web UI, not printed on the card"). 카드 바깥에서 붙인다.
 */

/** 시안의 모바일 카드 폭. `--u` 의 기준이다 */
const BASE_WIDTH = 170.5;

export type EmployeeBadgeData = {
  /**
   * 회사 로고 이미지 URL.
   *
   * - `null` — 로고가 **없다고 확인된** 회사. 같은 칸에 2D 고양이를 둔다
   *   (동기화 가이드 04장 D4-1). 로고 목록은 재학생 취업 목록을 받아 손으로
   *   채우므로 목록에 없는 회사(예: Google)가 여기에 온다. 주소가 있는데
   *   이미지를 못 받아도 고양이로 바꾼다.
   * - `undefined` — 로고를 **모르는** 자리. 칸을 그리지 않고 회사명만 선다.
   *   고양이를 그리면 실제 목록에서는 로고가 보이는 선배에게 틀린 사원증을
   *   보여 주게 된다. (예전에는 `GraduatedProfileDto` 에 로고가 없어 마이페이지가
   *   이 경우였다. 명세 2026-11-15 갱신(#46)으로 지금은 API 사원증 모두 값이 온다)
   */
  companyLogo?: string | null;
  company: string;
  /**
   * 회사 아래 부서 줄(피그마 `Company and Department`, 04장 4.2.2). 선택 입력이라
   * 없으면(`null` · 빈 값) 줄을 그리지 않는다 — 시안 칩메이커 카드가 그렇다
   */
  department?: string | null;
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
  logoLoading = "eager",
}: {
  data: EmployeeBadgeData;
  className?: string;
  /**
   * 회사 로고 `<img loading>`. 카드가 첫 화면 아래에 놓이는 곳(랜딩 미리보기)
   * 에서만 `"lazy"` 를 준다. 목록·마이페이지처럼 카드가 첫 화면에 바로 보이는
   * 곳에서 lazy 를 걸면 오히려 늦게 뜬다
   */
  logoLoading?: "eager" | "lazy";
}) {
  const [logoFailed, setLogoFailed] = useState(false);
  const logo =
    data.companyLogo === undefined
      ? undefined
      : logoFailed
        ? null
        : data.companyLogo;

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
        {/*
         * 피그마 `Company identity`. 시안은 높이가 93.538(데스크톱 158, 같은
         * 비율)로 고정이라 부서 줄이 있든 없든 닉네임이 같은 높이에 선다 — 한
         * 줄에 놓인 카드끼리 이름 선이 맞는다. 회사명이 길어 두 줄이 되면 겹치지
         * 않게 늘어나도록 최소 높이로 둔다
         */}
        <div className="flex min-h-[calc(93.538*var(--u))] flex-col items-start px-[calc(16*var(--u))] pt-[calc(26*var(--u))] gap-[calc(6*var(--u))]">
          {logo === undefined ? null : (
            /*
             * 고양이도 로고와 **같은 칸**(69.858×24.865)에 `object-contain` 으로
             * 넣는다 — 높이에 맞춰 줄어든다. 크기는 눈으로 보고 다시 정한다
             * (D4-1 후속)
             */
            <img
              src={logo ?? catCheers}
              alt=""
              loading={logoLoading}
              decoding="async"
              onError={logo ? () => setLogoFailed(true) : undefined}
              // 로고·고양이 모두 칸 안에서 왼쪽에 붙여 회사명과 같은 왼쪽 선에 맞춘다
              className="h-[calc(24.865*var(--u))] w-[calc(69.858*var(--u))] object-contain object-left"
            />
          )}
          {/*
           * 피그마 `Company and Department`. 사이 간격은 작은 카드 0 · 큰 카드 4.
           * 줄 높이 · 자간은 회사와 같은 값을 물려받는다
           */}
          <div className="text-ink-soft flex flex-col items-start leading-[18px] tracking-[-0.3px] @min-[220px]:gap-1 @min-[220px]:leading-[20px] @min-[220px]:tracking-normal">
            {/* Badge/Company mobile 12/18/-0.3 Medium → 큰 카드 13/20 Medium */}
            <p className="text-[12px] font-medium @min-[220px]:text-[13px]">{data.company}</p>
            {/* 작은 카드 10/18 DemiLight(350) → 큰 카드 13/20 Regular */}
            {data.department ? (
              <p className="text-[10px] font-[350] @min-[220px]:text-[13px] @min-[220px]:font-normal">
                {data.department}
              </p>
            ) : null}
          </div>
        </div>

        {/* 피그마 `Identity` */}
        <div className="flex w-full flex-col items-start px-[calc(16*var(--u))] pt-[calc(6*var(--u))] pb-[calc(12*var(--u))] gap-[calc(6*var(--u))]">
          {/* Badge/Name mobile 20/28/-0.7 → 큰 카드 30/40/-1.2 */}
          <p className="text-ink font-bold text-[20px] leading-[28px] tracking-[-0.7px] @min-[220px]:text-[30px] @min-[220px]:leading-[40px] @min-[220px]:tracking-[-1.2px]">
            {data.nickname}
          </p>
          {/* Badge/Role mobile 14/20/-0.4 → 큰 카드 17/25 Medium. 두 줄 자리를 비워 둔다 */}
          <p className="text-ink min-h-11 text-[14px] leading-[20px] tracking-[-0.4px] whitespace-pre-line @min-[220px]:min-h-12 @min-[220px]:text-[17px] @min-[220px]:leading-[25px] @min-[220px]:font-medium @min-[220px]:tracking-normal">
            {data.role}
          </p>
          {/* Badge/Meta mobile 12/18/-0.4 → 큰 카드 13/20 */}
          <p className="text-ink-soft min-h-5 text-[12px] leading-[18px] tracking-[-0.4px] whitespace-pre-wrap @min-[220px]:text-[13px] @min-[220px]:leading-[20px] @min-[220px]:tracking-normal">
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
          {/*
           * 피그마 `Cheers brand seal` — 건배하는 고양이 인스턴스. 띠 세로
           * 가운데, 왼쪽 127.12, 폭 31.83(높이는 비율로 27.15). 표시 폭은
           * 모바일 카드 약 32px, 데스크톱 카드 약 54px 다.
           */}
          <BrandCat
            sizes="54px"
            className="absolute top-1/2 left-[calc(127.12*var(--u))] w-[calc(31.827*var(--u))] -translate-y-1/2"
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
