import { Link, createFileRoute } from "@tanstack/react-router";
/*
 * 원본 PNG 는 1254² RGBA 1.5MB 다. 표시 폭이 모바일 370 / 데스크톱 690 이라
 * 2배 밀도까지만 내보낸다 — 740(모바일 2x)과 원본 폭 1254(데스크톱 2x 상한).
 * `src` 는 srcset 을 모르는 환경용이고 740 과 같은 파일로 합쳐진다.
 */
import badgeSceneSrcset from "@/assets/landing/badge-scene.png?w=740;1254&format=webp&as=srcset";
import badgeSceneSrc from "@/assets/landing/badge-scene.png?w=740&format=webp";
import champagneGrain from "@/assets/landing/champagne-grain.svg";
import closingGlow from "@/assets/landing/closing-glow.svg";
/*
 * 로고 상자는 카드 안에서 최대 약 118×42(데스크톱 카드)다. 2배 밀도인
 * 240×84 상자 안에 비율을 지켜 줄인다. 원본은 600~1000px 폭이었다.
 */
import hyundaiLogo from "@/assets/landing/logos/hyundai.png?w=240&h=84&fit=inside&format=webp";
import samsungLogo from "@/assets/landing/logos/samsung.png?w=240&h=84&fit=inside&format=webp";
import skHynixLogo from "@/assets/landing/logos/sk-hynix.png?w=240&h=84&fit=inside&format=webp";
import {
  EmployeeBadge,
  type EmployeeBadgeData,
} from "@/components/employee-badge";
import { PageContainer } from "@/components/layout/page-container";
import { PageShell } from "@/components/layout/page-shell";
import { action } from "@/components/ui/action";
import { redirectIfSignedIn } from "@/lib/guards";
import { cn } from "@/lib/utils";

/**
 * 랜딩. 피그마 `Cheers / 랜딩`(352:9464 / 352:9465).
 *
 * 섹션 넷이 세로로 쌓인다 — Hero, 선배 미리보기, 이용 흐름, 닫는 CTA.
 * 배경(그라데이션·글로우)은 화면 끝까지 가고 글자만 본문 선에 맞으므로,
 * 섹션마다 바깥에서 배경을 깔고 안쪽에 `PageContainer` 를 쓴다.
 *
 * 유형을 고르면 그 유형의 로그인 화면으로 보낸다. 순서가 뒤바뀌면 안 된다 —
 * `POST /user/oauth/login` 이 `type` 을 필수로 받고, 처음 로그인하는 사용자는
 * 그 값으로 가입이 시작된다. 유형을 기억하는 일은 `/login` 이 한다.
 */
export const Route = createFileRoute("/")({
  // 이미 로그인한 사람에게 유형 선택을 다시 보여주지 않는다. 가입 중인
  // 사용자가 다른 유형을 누르면 인증과 추가 정보가 지워지기 때문이다
  beforeLoad: async ({ context }) => {
    await redirectIfSignedIn(context.queryClient);
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <PageShell kind="public">
      <Hero />
      <MeetAlumniPreview />
      <HowItWorks />
      <ClosingInvitation />
    </PageShell>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * 버튼
 *
 * 생김새는 `components/ui/action.ts` 가 들고 있다. 여기 둘은 그걸 TanStack
 * `<Link>` 에 입히는 얇은 껍데기다. 랜딩이 시안에서 52 가 아니라 56 높이를
 * 쓰므로 Primary 만 `size: "lg"` 다.
 * ───────────────────────────────────────────────────────────────────────── */

function PrimaryAction({
  to,
  search,
  children,
  className,
}: {
  to: string;
  search?: Record<string, unknown>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      to={to}
      search={search}
      className={cn(action({ size: "lg" }), "w-full", className)}
    >
      {children}
    </Link>
  );
}

function GhostAction({
  to,
  search,
  children,
  className,
}: {
  to: string;
  search?: Record<string, unknown>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      to={to}
      search={search}
      className={cn(action({ variant: "ghost", size: "lg" }), "h-12 w-full", className)}
    >
      {children}
    </Link>
  );
}

/* ───────────────────────────── Hero ───────────────────────────── */

function Hero() {
  return (
    <section className="bg-canvas relative overflow-clip">
      {/* 피그마 `Cheers / Landing / Champagne light & grain` */}
      <img
        src={champagneGrain}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 size-full object-cover"
      />

      <PageContainer
        className={cn(
          "relative flex flex-col items-center gap-8 pt-12 pb-8",
          // 데스크톱은 2열이고, 왼쪽 글 묶음이 세로 가운데에 선다.
          // 760 은 시안 Hero 프레임 높이 — 위아래 156씩이 여기서 나온다.
          // 열 너비를 반반으로 나누지 않는 이유: 시안의 그림이 548짜리 글
          // 묶음보다 넓어서(690), 반씩 자르면 그림이 줄어든다
          "lg:min-h-190 lg:flex-row lg:items-center lg:gap-0 lg:py-0"
        )}
      >
        {/* 피그마 `Intro and role selection` */}
        <div className="flex w-full flex-col gap-5 lg:w-137 lg:shrink-0 lg:gap-7">
          <p className="text-label text-brand">GIST 선후배 커피챗, 취얼스</p>

          <h1 className="text-hero text-ink">
            취업의 다음 장,
            <br />
            {/* 시안은 모바일 "선배와 한 잔." / 데스크톱 "선배와 함께." 로 적혀
                있다. 같은 문장이어야 할 자리로 보여 모바일 쪽을 따랐다 */}
            선배와 한 잔.
          </h1>

          {/* 데스크톱은 Body/Large, 모바일은 Body/Medium — 시안이 폭마다 다른
              스타일을 썼는데 반응형 토큰이 없는 쌍이라 둘을 갈아 끼운다 */}
          <p className="text-body text-ink-soft lg:text-body-lg">
            궁금했던 회사와 직무, 혼자 고민하던 취업 준비.
            <br />
            같은 학교에서 먼저 시작한 선배와 이야기해 보세요.
          </p>

          {/* 피그마 `Choose your role` */}
          <div className="flex flex-col gap-2 pt-2 lg:w-74">
            <PrimaryAction
              to="/login"
              search={{ role: "student" }}
              className="lg:w-70"
            >
              취업 준비 중이에요 →
            </PrimaryAction>
            <GhostAction to="/login" search={{ role: "mentor" }}>
              취업했어요, 경험을 나눌래요
            </GhostAction>
          </div>
        </div>

        {/* 피그마 `Cheers / Landing / 3D badge scene` */}
        <div className="flex w-full justify-center lg:flex-1">
          {/*
           * 랜딩의 LCP 요소다. 그래서 lazy 를 걸지 않고 우선순위를 올린다.
           * width/height 는 원본 비율(1:1)을 미리 알려 자리를 잡아 두는 용도다 —
           * 없으면 이미지가 도착할 때 아래 섹션이 통째로 밀린다(CLS).
           * 실제 크기는 클래스가 정하고 `h-auto` 가 비율을 지킨다.
           * `sizes` 는 위 max-w 두 값과 같아야 한다.
           */}
          <img
            src={badgeSceneSrc}
            srcSet={badgeSceneSrcset}
            sizes="(min-width: 1024px) 690px, 370px"
            width={1254}
            height={1254}
            fetchPriority="high"
            decoding="async"
            alt="취얼스 사원증 두 장이 걸린 그림"
            className="h-auto w-full max-w-[370px] lg:max-w-[690px]"
          />
        </div>
      </PageContainer>
    </section>
  );
}

/* ──────────────────── 선배 미리보기 ──────────────────── */

/**
 * 랜딩에 거는 사원증 네 장. 피그마 시안의 예시 카드를 그대로 옮긴 것이다.
 *
 * **실데이터가 아니라 고정값인 이유.** 이 화면은 로그아웃 상태 전용인데
 * (`redirectIfSignedIn` 가드) 선배 목록 `GET /api/v1/cheers` 는 인증이
 * 필요하다. 로그인하지 않은 사람에게 보여줄 목록을 서버에서 받을 방법이
 * 없어서, 랜딩의 미리보기는 처음부터 고정 예시로 둔다.
 *
 * 설계 5.3 은 이 로고·닉네임을 "예시 데이터, 실제 자산이 아님" 으로
 * 적어 뒀다. 비상업적 용도라 그대로 쓰기로 **사용자가 정했다**(2026-11-03).
 * 공개 배포 전에 한 번 더 따져볼 자리다.
 */
const PREVIEW_BADGES: EmployeeBadgeData[] = [
  {
    companyLogo: samsungLogo,
    company: "삼성전자",
    nickname: "반도체냥",
    role: "반도체 공정\n엔지니어",
    meta: "#전기전자  #3년차",
  },
  {
    companyLogo: skHynixLogo,
    company: "SK하이닉스",
    nickname: "칩메이커",
    role: "메모리 설계\n엔지니어",
    meta: "#전자공학  #신입",
  },
  {
    companyLogo: hyundaiLogo,
    company: "현대자동차",
    nickname: "모빌리티",
    role: "차량 소프트웨어\n개발자",
    meta: "#컴퓨터공학  #2년차",
  },
  {
    companyLogo: samsungLogo,
    company: "삼성전자",
    nickname: "데이터냥",
    role: "데이터 분석가",
    meta: "#AI  #산업기능요원",
  },
];

function MeetAlumniPreview() {
  return (
    // 시안의 그라데이션. `#fffcf8` 은 토큰에 없는 값이라 그대로 적었다
    <section className="bg-gradient-to-b from-white via-white via-70% to-[#fffcf8]">
      <PageContainer className="flex flex-col gap-8 py-14 lg:gap-12 lg:py-22">
        {/* 피그마 `Section heading` — 데스크톱은 제목 왼쪽, 설명 오른쪽 끝 */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-0">
          <h2 className="text-statement text-ink">
            내가 궁금한 일,
            <br />
            먼저 해본 선배들.
          </h2>
          <p className="text-body text-ink-soft lg:w-105 lg:pt-9">
            사원증에서 회사와 직무를 살펴보고,
            <br />
            나와 관심사가 닿는 선배에게 커피챗을 신청하세요.
          </p>
        </div>

        {/* 피그마 `Employee badge gallery` — 모바일 2×2, 데스크톱 4열 */}
        <ul className="grid grid-cols-2 gap-x-3 gap-y-6 lg:grid-cols-4 lg:gap-8">
          {PREVIEW_BADGES.map((badge) => (
            <li key={badge.nickname}>
              {/* 첫 화면(Hero) 아래라 로고는 스크롤이 다가올 때 받는다 */}
              <EmployeeBadge data={badge} logoLoading="lazy" />
            </li>
          ))}
        </ul>
      </PageContainer>
    </section>
  );
}

/* ──────────────────── 이용 흐름 ──────────────────── */

const STEPS = [
  {
    no: "01",
    title: "선배를 만나고",
    copy: "관심 있는 회사와 직무의 선배를 찾아보세요.",
  },
  {
    no: "02",
    title: "궁금한 점을 남기면",
    copy: "나의 상황과 묻고 싶은 내용을 담아 신청하세요.",
  },
  {
    no: "03",
    title: "대화가 시작돼요",
    copy: "연락처를 통해 일정과 대화 방식을 함께 정해요.",
  },
];

function HowItWorks() {
  return (
    <section className="bg-canvas">
      <PageContainer className="flex flex-col gap-8 py-12 lg:flex-row lg:gap-16 lg:py-18">
        {/* 피그마 `Journey introduction` */}
        <div className="flex flex-col gap-4 lg:w-90 lg:shrink-0">
          <p className="text-micro text-brand">HOW IT WORKS</p>
          <h2 className="text-statement text-ink">
            질문 하나가
            <br />
            시작이 되도록.
          </h2>
        </div>

        {/* 피그마 `Journey steps` */}
        <ol className="flex flex-col gap-6 lg:flex-1">
          {STEPS.map((step) => (
            <li key={step.no} className="flex gap-5">
              <span className="text-micro text-brand w-7 shrink-0">
                {step.no}
              </span>
              <div className="flex flex-col gap-2">
                <p className="text-card-title text-ink">{step.title}</p>
                <p className="text-body-sm text-ink-soft">{step.copy}</p>
              </div>
            </li>
          ))}
        </ol>
      </PageContainer>
    </section>
  );
}

/* ──────────────────── 닫는 CTA ──────────────────── */

function ClosingInvitation() {
  return (
    <section className="bg-canvas relative overflow-clip">
      {/* 피그마 `Cheers / Landing / Closing champagne glow` */}
      <img
        src={closingGlow}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 size-full object-cover"
      />

      <PageContainer className="relative flex flex-col items-center gap-8 py-12 lg:py-18">
        <h2 className="text-statement text-ink text-center">
          혼자 고민하던 질문,
          <br />
          이제 선배에게.
        </h2>
        <PrimaryAction
          to="/login"
          search={{ role: "student" }}
          className="lg:w-70"
        >
          취업 준비 중이에요 →
        </PrimaryAction>
      </PageContainer>
    </section>
  );
}
