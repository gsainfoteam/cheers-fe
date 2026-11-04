import infoIcon from "@/assets/icons/info.svg";
import lockIcon from "@/assets/icons/lock.svg";
import { cn } from "@/lib/utils";

const ICON = { lock: lockIcon, info: infoIcon } as const;

/**
 * 진입 안내 카드. 피그마 `07 · 알림톡·웹 진입` 의 `Access message` —
 * 로그인 필요(343:9110 / 343:9054), 다른 계정(343:9219 / 343:9168),
 * 접근 불가(343:9318 / 343:9269).
 *
 * 세 화면이 같은 뼈대라 처음부터 공통이다: 아이콘 상자(48, subtle 바탕) ·
 * 두 줄 제목 · 설명 한 줄 · 버튼(`children`). 시안 제목 끝에는 마침표가
 * 없고 설명에는 있다 — 그대로 둔다.
 *
 * 두 자리에서 쓰인다.
 * - **한 장짜리 화면**(로그인): 데스크톱 560 카드, 모바일은 껍데기 없이 353.
 * - **오버레이 안**(상세의 오류): `bare` — 카드 껍데기를 빼고 내용만 둔다.
 *   오버레이가 이미 상자다.
 */
export function AccessMessage({
  icon,
  title,
  description,
  bare = false,
  children,
}: {
  icon: keyof typeof ICON;
  /** 두 줄 제목. 줄바꿈은 `<br />` 로 쓰는 쪽이 정한다 — 시안이 끊은 자리 그대로 */
  title: React.ReactNode;
  description: string;
  bare?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-6",
        !bare &&
          "lg:border-line lg:bg-surface lg:shadow-work lg:w-140 lg:rounded-lg lg:border lg:p-10"
      )}
    >
      {/* 피그마 `Access icon` */}
      <div className="bg-subtle flex size-12 items-center justify-center rounded-lg">
        <span className="flex size-6 items-center justify-center">
          <img src={ICON[icon]} alt="" />
        </span>
      </div>

      {/* 모바일 Task/Title(32/44), 데스크톱 Display/Page(36/48) — 신청 완료와 같은 짝 */}
      <h1 className="text-task-title lg:text-page text-ink">{title}</h1>
      <p className="text-body text-ink-soft">{description}</p>

      {children}
    </div>
  );
}
