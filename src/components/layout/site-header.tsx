import { Link, useNavigate } from "@tanstack/react-router";
import { useLogout } from "@/api";
import catCheers from "@/assets/brand/cat-cheers.svg";
import { forgetLocalAccount } from "@/lib/sign-out";
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
 * 가입 도중(Onboarding)의 로고만 다르다 — 로그아웃 후 랜딩(`LeaveSignupBrand`).
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
        {kind === "onboarding" ? (
          <LeaveSignupBrand />
        ) : (
          <BrandLink signedIn={SIGNED_IN.includes(kind)} />
        )}

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
const BRAND_CLASS = "flex w-30 shrink-0 items-center gap-2";

function BrandMark() {
  return (
    <>
      <img
        src={catCheers}
        alt=""
        width={32}
        height={27.2941}
        className="w-8 shrink-0"
      />
      <span className="text-h3 text-ink whitespace-nowrap">취얼스</span>
    </>
  );
}

function BrandLink({ signedIn }: { signedIn: boolean }) {
  return (
    <Link to={signedIn ? "/mentors" : "/"} className={BRAND_CLASS}>
      <BrandMark />
    </Link>
  );
}

/**
 * 가입 도중의 로고 — **가입을 멈추고 랜딩으로 돌아가는 출구**다.
 *
 * 그냥 `/` 로 보내면 안 된다. 세션이 남아 있으면 랜딩 가드
 * (`redirectIfSignedIn`)가 곧장 `/onboarding` 으로 되돌려 보내서, 눌러도
 * 아무 일도 없는 버튼이 된다(실제로 그랬다). 그래서 로그아웃부터 한다.
 *
 * 랜딩으로 보내는 이유는 거기에 학생/선배 선택이 있어서다. 이 한 길로
 * 두 경우를 다 받는다.
 * - **다른 구글 계정으로 가입** — 유형을 고르면 로그인 화면의 구글 버튼에서
 *   계정을 고른다.
 * - **유형을 잘못 고름** — 반대 유형을 고르고 같은 계정으로 로그인하면,
 *   서버가 가입 중(pending) 유저의 유형을 새 값으로 바꾸고 처음 단계부터
 *   다시 시작시킨다(`lib/role.ts` 주석).
 *
 * 따로 "다른 구글 계정으로 로그인" 버튼을 두지 않고 이 흐름으로 처리하기로
 * 했다(이슈 #33).
 *
 * 서버 진행 상태(약관 동의 · 본인 확인)는 로그아웃으로 지워지지 않는다.
 * 같은 계정 · 같은 유형으로 돌아오면 이어서 진행된다. 사라지는 건 아직
 * 저장하지 않은 기본 정보 · 추가 정보 입력값뿐이다.
 */
function LeaveSignupBrand() {
  const navigate = useNavigate();
  const logout = useLogout();

  const leave = () =>
    logout.mutate(undefined, {
      // 훅의 onSettled(토큰 · 캐시 비우기)가 이것보다 먼저 돈다. 그래서
      // 랜딩에 도착했을 때 가드가 세션을 보지 못하고 랜딩을 그대로 보여준다
      onSettled: () => {
        forgetLocalAccount();
        void navigate({ to: "/", replace: true });
      },
    });

  return (
    <button
      type="button"
      onClick={leave}
      disabled={logout.isPending}
      aria-label="가입을 멈추고 처음 화면으로"
      className={cn(BRAND_CLASS, "cursor-pointer disabled:opacity-60")}
    >
      <BrandMark />
    </button>
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
