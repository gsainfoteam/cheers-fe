import { useEffect, useId, useRef } from "react";
import closeIcon from "@/assets/icons/close.svg";
import searchBrandIcon from "@/assets/icons/search-brand.svg";
import searchNeutralIcon from "@/assets/icons/search-neutral.svg";
import { cn } from "@/lib/utils";

/**
 * 검색해서 고르는 칸. 피그마 `회사명 검색 및 선택`(971:10278 / 971:12664),
 * 칸 상태 `971:13884`(자모 검색) · `971:13905`(별칭) · `971:13948`(등록 정보 없음).
 *
 * 피그마 TODO `889:31013` *"같은 회사 다른 표기 방지"* 의 답이다 — 삼성전자 /
 * 삼성 전자 / Samsung 이 서로 다른 회사로 갈리지 않게 **목록에서 고르게** 한다.
 *
 * ## 한 DOM, 두 모드
 *
 * | | 데스크톱 | 모바일 |
 * |---|---|---|
 * | 열리는 곳 | 칸 자체가 아래로 펼쳐진다(높이 256, 아래 칸들을 덮는다) | 전체 화면 + 머리 `회사명 검색` · ✕ |
 *
 * 폭에 따라 다른 컴포넌트를 그리지 않고 같은 패널의 기하만 CSS 로 바꾼다
 * (`ResponsiveDialog` 와 같은 이유). 그래서 **열린 채로 1024px 경계를 넘어도
 * 검색어가 살아남는다** — 검색어·선택값은 처음부터 부모 상태다.
 *
 * ## 결과는 쓰는 쪽이 준다
 *
 * 검색 규칙(앞부분 일치, 조합 중인 자모, 영문 별칭)은 목록 데이터와 같은
 * 자리에서 정해져야 해서 이 컴포넌트는 모른다.
 *
 * ## 목록에 없는 이름은 닫을 때 확정한다
 *
 * `results` 가 비어 있으면 가운데에 `검색된 회사명이 없습니다` 만 선다.
 * 시안(`971:13948`)의 `+ {검색어} 등록하기` 버튼은 두지 않는다 — 백엔드와
 * 정한 결과, 목록에 없는 이름은 별칭이나 새 회사로 "등록" 되는 게 아니라
 * 그 이름 그대로 저장될 뿐이라 버튼 문구가 사실과 다르다(2026-11-10).
 *
 * 대신 **결과가 없는 채로 패널을 닫으면** 검색어를 그대로 확정한다 — 모바일
 * ✕, 데스크톱 바깥 클릭, Enter 모두 같다. 결과가 있는데 고르지 않고 닫으면
 * 확정하지 않는다(목록에서 고르라는 칸이다). **Esc 는 언제나 취소**다.
 *
 * 결과 칩은 `Choice` 가 아니다 — 선택 상태가 없고 누르면 바로 확정되며
 * 패널이 닫힌다.
 */
export function SearchSelect({
  label,
  placeholder,
  searchTitle,
  value,
  onSelect,
  query,
  onQueryChange,
  results,
  open,
  onOpenChange,
  maxLength,
  className,
}: {
  label: string;
  /** 닫힌 칸이 비어 있을 때 */
  placeholder: string;
  /** 모바일 전체 화면의 머리 제목 */
  searchTitle: string;
  value: string;
  onSelect: (value: string) => void;
  query: string;
  onQueryChange: (query: string) => void;
  results: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maxLength?: number;
  className?: string;
}) {
  const id = useId();
  const labelId = `${id}-label`;
  const panelId = `${id}-panel`;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const trimmed = query.trim();

  const close = (returnFocus = true) => {
    onOpenChange(false);
    if (returnFocus) triggerRef.current?.focus();
  };

  const pick = (next: string) => {
    onSelect(next);
    close();
  };

  /**
   * Esc 가 아닌 방법으로 닫는다(✕ · 바깥 클릭 · Enter). 결과가 없으면 검색어를
   * 그대로 확정하고, 결과가 있으면 고르지 않은 것으로 보고 그냥 닫는다.
   */
  const dismiss = (returnFocus = true) => {
    if (trimmed && results.length === 0) onSelect(trimmed);
    close(returnFocus);
  };

  // 바깥 클릭 리스너는 열릴 때 한 번 붙는다. 그 사이 바뀐 검색어 · 결과로
  // 판단하도록 최신 `dismiss` 를 ref 로 넘긴다
  const dismissRef = useRef(dismiss);
  useEffect(() => {
    dismissRef.current = dismiss;
  });

  // 열리면 검색 입력으로 포커스를 옮긴다 — 모바일 시안이 키보드가 올라온
  // 상태로 그려져 있다
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // 모바일 전체 화면이 열린 동안 뒤의 페이지가 손가락에 끌려 스크롤되지 않게
  // 막는다. 데스크톱은 칸이 펼쳐질 뿐이라 페이지 스크롤을 그대로 둔다
  useEffect(() => {
    if (!open) return;
    const mobile = window.matchMedia("(width < 64rem)");
    const apply = () => {
      document.body.style.overflow = mobile.matches ? "hidden" : "";
    };
    apply();
    mobile.addEventListener("change", apply);
    return () => {
      mobile.removeEventListener("change", apply);
      document.body.style.overflow = "";
    };
  }, [open]);

  // 데스크톱에서 칸 바깥을 누르면 닫는다(결과가 없으면 검색어로 확정).
  // 모바일은 화면 전체가 패널이라 바깥이 없다. 포커스는 누른 곳으로 가게 둔다
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        dismissRef.current(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  /** 칩 사이를 왼/오른쪽 화살표로 옮긴다. 칩이 가로로 흐르므로 위/아래는 쓰지 않는다 */
  const moveAmongChips = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const chips = Array.from(
      e.currentTarget.querySelectorAll<HTMLButtonElement>("button")
    );
    const at = chips.indexOf(document.activeElement as HTMLButtonElement);
    if (at < 0) return;
    e.preventDefault();
    const next = e.key === "ArrowRight" ? at + 1 : at - 1;
    chips[(next + chips.length) % chips.length]?.focus();
  };

  return (
    <div
      ref={rootRef}
      className={cn("relative flex w-full flex-col gap-2", className)}
      onKeyDown={(e) => {
        if (open && e.key === "Escape") {
          e.stopPropagation();
          close();
        }
      }}
    >
      <p id={labelId} className="text-label text-ink">
        {label}
      </p>

      {/*
       * 닫힌 칸. 생김새는 `Field` 와 같지만 글자를 치는 곳이 아니라 패널을
       * 여는 버튼이다. 확정된 값이 있으면 그 값이, 없으면 안내문과 돋보기가
       * 선다(`960:9668` — 값이 서면 아이콘이 없다).
       */}
      <button
        ref={triggerRef}
        type="button"
        aria-labelledby={labelId}
        aria-describedby={value ? undefined : `${id}-placeholder`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => onOpenChange(true)}
        className="border-control bg-surface focus-visible:border-focus focus-visible:ring-focus flex h-13 w-full items-center gap-2 rounded-md border px-4 py-3.5 text-left focus-visible:ring-1 focus-visible:outline-none focus-visible:ring-inset"
      >
        {value ? (
          <span className="text-body text-ink flex-1 truncate">{value}</span>
        ) : (
          <>
            <span
              id={`${id}-placeholder`}
              className="text-body text-ink-soft flex-1 truncate"
            >
              {placeholder}
            </span>
            {/* 닫힌 칸의 돋보기는 보조색(ink-soft), 열린 칸은 주황(focus)이다 */}
            <img src={searchNeutralIcon} alt="" />
          </>
        )}
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-labelledby={labelId}
          className={cn(
            "bg-surface flex flex-col",
            // 모바일: 셸까지 덮는 전체 화면
            "fixed inset-0 z-50",
            // 데스크톱: 닫힌 칸 자리에서 아래로 펼쳐진다. 라벨(20) + 간격(8)
            // 아래에서 시작해 높이 256 으로 아래 칸들을 덮는다
            "lg:border-control lg:absolute lg:inset-auto lg:top-7 lg:right-0 lg:left-0 lg:z-20 lg:h-72 lg:rounded-md lg:border lg:px-4 lg:py-3.5"
          )}
        >
          {/* 모바일 머리. 데스크톱은 칸 위의 라벨이 그 자리를 한다 */}
          <div className="flex shrink-0 items-center gap-4 py-4 pr-3 pl-5 lg:hidden">
            <p className="text-h3 text-ink flex-1">{searchTitle}</p>
            <button
              type="button"
              aria-label="닫기"
              onClick={() => dismiss()}
              className="flex size-11 items-center justify-center"
            >
              <img src={closeIcon} alt="" />
            </button>
          </div>
          <div className="bg-line h-px shrink-0 lg:hidden" />

          <div className="flex min-h-0 flex-1 flex-col gap-3 px-5 pt-6 lg:px-0 lg:pt-0">
            {/* 검색 입력 + 밑줄 */}
            <div className="border-control flex shrink-0 items-center gap-2 border-b pb-3 pl-1">
              <input
                ref={inputRef}
                aria-label={`${label} 검색`}
                maxLength={maxLength}
                value={query}
                // IME 조합 중에도 onChange 가 온다 — `삼성ㅈ` 처럼 조합 중인
                // 자모로도 검색해야 하므로(시안 971:13884) 그대로 쓴다
                onChange={(e) => onQueryChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    rootRef.current
                      ?.querySelector<HTMLButtonElement>("[data-result]")
                      ?.focus();
                  }
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    // 결과와 똑같은 이름을 쳤으면 그 결과를, 결과가 없으면 검색어를
                    // 확정한다. 결과가 있는데 다르면 고르게 둔다 — 첫 번째를 몰래
                    // 고르지 않는다
                    const exact = results.find((r) => r === trimmed);
                    if (exact) pick(exact);
                    else if (trimmed && results.length === 0) dismiss();
                  }
                }}
                className="text-label-lg text-brand min-w-0 flex-1 bg-transparent outline-none"
              />
              <img src={searchBrandIcon} alt="" />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {results.length > 0 ? (
                <div
                  role="group"
                  aria-label="검색 결과"
                  onKeyDown={moveAmongChips}
                  className="flex flex-wrap content-start gap-2 py-1"
                >
                  {results.map((result) => (
                    <button
                      key={result}
                      type="button"
                      data-result
                      onClick={() => pick(result)}
                      className={RESULT_CHIP}
                    >
                      {result}
                    </button>
                  ))}
                </div>
              ) : trimmed ? (
                // 피그마 `등록 정보 없는 경우` — `등록하기` 버튼은 뺐다(머리말).
                // 닫으면 검색어가 그대로 회사명이 된다
                <div className="flex h-full items-center justify-center py-6">
                  <p role="status" className="text-body-sm text-ink-soft text-center">
                    검색된 회사명이 없습니다
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** 결과 칩. 흰 바탕 + control 테두리 + 4px 모서리, 글자는 Body/Small 보조색 */
const RESULT_CHIP =
  "bg-surface border-control text-body-sm text-ink-soft focus-visible:ring-focus flex items-center justify-center rounded-sm border px-4 py-1 focus-visible:ring-2 focus-visible:outline-none";
