import { Link } from "@tanstack/react-router";
import catCheers from "@/assets/brand/cat-cheers.svg";
import { cn } from "@/lib/utils";
import { PageContainer } from "./page-container";

/**
 * 사이트 헤더. 피그마 `Cheers / Header`(353:9429)의 Viewport×Kind 8변형.
 *
 * 시안이 변형을 둘로 나눠 그린다.
 * - Viewport(Mobile/Desktop)는 `lg:` 로 덮는다. 폭은 6.2가 정한 1024 하나.
 * - Kind(Public/Onboarding/Student/Alumni)는 **메뉴 목록만** 다르다.
 *   나머지 골격은 네 변형이 전부 같아서 데이터로 갈랐다.
 */
export type HeaderKind = "public" | "onboarding" | "student" | "alumni";

type NavItem = { label: string; to: string };

/**
 * 시안에 적힌 그대로다. 라벨을 임의로 바꾸지 않는다.
 *
 * 시안에 **홈 메뉴가 없다.** 로고가 그 자리를 대신한다(피그마에서도 로고
 * 묶음 이름이 `Action / landing` 이다). 로그인한 사용자는 첫 화면인
 * `/mentors`, 아니면 랜딩으로 보낸다 — `/` 의 가드가 로그인 상태를 보고
 * 어차피 `/mentors` 로 되돌리므로, 한 번 덜 튕기게 미리 갈라 둔다.
 */
const NAV: Record<HeaderKind, NavItem[]> = {
  public: [{ label: "로그인", to: "/login" }],
  onboarding: [],
  student: [
    { label: "선배 둘러보기", to: "/mentors" },
    { label: "보낸 신청", to: "/applications" },
    { label: "마이페이지", to: "/me" },
  ],
  alumni: [
    { label: "선배 둘러보기", to: "/mentors" },
    { label: "받은 신청", to: "/applications" },
    { label: "마이페이지", to: "/me" },
  ],
};

const SIGNED_IN: HeaderKind[] = ["student", "alumni"];

export function SiteHeader({ kind }: { kind: HeaderKind }) {
  const items = NAV[kind];

  /**
   * 메뉴가 둘 이상이면 모바일에서 **둘째 줄**로 내려간다(시안 393×105).
   * 하나뿐인 Public 의 `로그인` 은 모바일에서도 로고와 같은 줄이다(393×61).
   *
   * 그래서 메뉴를 두 자리에 그리고 폭에 따라 한쪽만 보여준다. 숨긴 쪽은
   * `display:none` 이라 접근성 트리에서도 빠지므로, 보조기술에 메뉴가
   * 두 번 읽히지 않는다.
   */
  const navWraps = items.length > 1;

  return (
    <header className="bg-surface">
      {/* 피그마 `Site header` — 모바일 min-h 60 / 데스크톱 72 */}
      <PageContainer className="flex min-h-15 items-center gap-6 py-3.5 lg:min-h-18">
        <BrandLink signedIn={SIGNED_IN.includes(kind)} />

        {/* 피그마 `Flexible space` */}
        <div className="h-px flex-1" />

        {items.length > 0 ? (
          <Nav
            items={items}
            kind={kind}
            className={navWraps ? "hidden lg:flex" : "flex"}
            // 하나뿐인 메뉴는 모바일에서 로고와 같은 줄에 선다. 거기서
            // min-h-11(44) 을 주면 줄 높이가 60을 넘겨 시안과 어긋난다
            itemClassName={navWraps ? "min-h-11 py-3" : "lg:min-h-11 lg:py-3"}
          />
        ) : null}
      </PageContainer>

      {/* 피그마 `Website navigation` — 모바일 전용 둘째 줄, min-h 44 */}
      {navWraps ? (
        <PageContainer className="flex min-h-11 items-center gap-6 lg:hidden">
          <Nav
            items={items}
            kind={kind}
            className="flex"
            itemClassName="min-h-11 py-3"
          />
        </PageContainer>
      ) : null}

      {/* 피그마 `Divider` — 화면 끝까지 가므로 컨테이너 바깥이다 */}
      <div className="bg-line h-px" />
    </header>
  );
}

/** 피그마 `Action / landing` — 고양이 마크 + 워드마크. 폭 120 고정이다. */
function BrandLink({ signedIn }: { signedIn: boolean }) {
  return (
    <Link
      to={signedIn ? "/mentors" : "/"}
      className="flex w-30 shrink-0 items-center gap-2"
    >
      <img
        src={catCheers}
        alt=""
        width={32}
        height={27.2941}
        className="w-8 shrink-0"
      />
      <span className="text-h3 text-ink whitespace-nowrap">취얼스</span>
    </Link>
  );
}

function Nav({
  items,
  kind,
  className,
  itemClassName,
}: {
  items: NavItem[];
  kind: HeaderKind;
  className: string;
  itemClassName: string;
}) {
  return (
    <nav className={cn("items-center gap-6", className)}>
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className={cn(
            "text-label relative flex shrink-0 items-center justify-center whitespace-nowrap",
            // Public 의 `로그인` 만 진한 색이다. 나머지 메뉴는 보조색
            kind === "public" ? "text-ink" : "text-ink-soft",
            itemClassName
          )}
          // 시안 `Navigation / main` 의 현재 위치 — 글자가 진해지고 굵어진다
          activeProps={{ className: "text-ink font-bold" }}
        >
          {({ isActive }) => (
            <>
              {item.label}
              {/*
               * 피그마 `Active indicator` — 메뉴 아래 2px 주황 띠.
               * 자식으로 두면 글자 폭에 저절로 맞는다.
               */}
              {isActive ? (
                <span className="bg-brand-accent absolute inset-x-0 bottom-0 h-0.5" />
              ) : null}
            </>
          )}
        </Link>
      ))}
    </nav>
  );
}
