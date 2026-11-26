import * as amplitude from "@amplitude/analytics-browser";
import { hashKey, type QueryClient } from "@tanstack/react-query";
import type { AnyRouter } from "@tanstack/react-router";
import { keys, type NextStep, type UserInfo } from "@/api";
import type { AnalyticsEventName, AnalyticsEvents } from "./events";

/**
 * Amplitude 연동. 화면은 `track()` 하나만 부른다.
 *
 * 켜지는 조건은 **프로덕션 빌드이면서 API 키가 있을 때**다. 로컬(`vite dev`)과
 * 키가 비어 있는 빌드에서는 SDK 를 아예 올리지 않고, 모든 호출은 아무 일도
 * 하지 않는다 — 호출하는 쪽이 환경을 따질 필요가 없다.
 *
 * stg 와 prod 는 **같은 Amplitude 프로젝트**를 쓴다. 둘을 가르는 건 모든
 * 사용자에 붙는 `environment` 속성이고(`VITE_APP_ENV`), 대시보드는
 * `environment = prod` 로 걸러 본다.
 */

const API_KEY: string = import.meta.env.VITE_AMPLITUDE_API_KEY ?? "";
const APP_ENV: string = import.meta.env.VITE_APP_ENV ?? "unknown";

let enabled = false;

/** 앱이 뜰 때 한 번 부른다. 두 번째부터는 무시한다 */
export function initAnalytics({
  queryClient,
  router,
}: {
  queryClient: QueryClient;
  router: AnyRouter;
}) {
  if (enabled || import.meta.env.DEV || !API_KEY) return;
  enabled = true;

  // 플러그인은 init 보다 먼저 올려 둔다. 첫 페이지뷰도 `route` 를 받게 하려는 것이다
  void amplitude.add(sanitizePlugin(router));

  // `setUserId` 도 `reset` 도 부르지 않는다. 같은 브라우저는 로그인 · 로그아웃과
  // 무관하게 같은 deviceId 로 이어지고, 서버 id 는 사용자 속성으로만 싣는다
  void amplitude.init(API_KEY, {
    autocapture: {
      sessions: true,
      /**
       * SPA 라 주소가 바뀔 때마다 페이지뷰를 쏜다. 쿼리스트링만 바뀐 이동은
       * 새 페이지로 치지 않는다(`pathOnly`).
       */
      pageViews: { trackHistoryChanges: "pathOnly" },
      /**
       * 클릭 자동 수집. 입력칸(`input`, `textarea`, `select`, `label`)은 뺐다 —
       * 사용자가 친 값이 요소 텍스트로 묻어 나갈 수 있다. 눌린 링크·버튼의
       * 텍스트는 `sanitizePlugin` 이 한 번 더 걸러서 내보낸다.
       */
      elementInteractions: {
        cssSelectorAllowlist: CLICKABLE,
      },
      /**
       * 연타·무반응 클릭도 클릭 수집과 같은 요소만 본다. `rageClicks: true` 는
       * 기본이 모든 요소(`*`)라서, 받은 신청의 질문 본문 같은 글을 연타하면
       * 그 글이 요소 텍스트로 실려 나간다.
       */
      frustrationInteractions: {
        rageClicks: { cssSelectorAllowlist: CLICKABLE },
        deadClicks: { cssSelectorAllowlist: CLICKABLE },
      },
      webVitals: true,
      // 폼은 필드 이름·값이 이벤트에 실린다. 가입 입력은 직접 만든 이벤트로 본다
      formInteractions: false,
      fileDownloads: false,
    },
    // IP 도 개인정보다. 서비스 대상이 한 학교라 국가·도시 구분도 쓸 일이 없다
    trackingOptions: { ipAddress: false },
  });

  // 모든 이벤트가 환경을 달고 나가게 한다. 로그인 전 이벤트도 포함된다
  identify({ environment: APP_ENV });

  observeUserInfo(queryClient);
}

/** 타입이 있는 이벤트 한 건. 속성이 없는 이벤트는 두 번째 인자를 생략한다 */
export function track<E extends AnalyticsEventName>(
  name: E,
  ...[props]: Record<string, never> extends AnalyticsEvents[E]
    ? [props?: AnalyticsEvents[E]]
    : [props: AnalyticsEvents[E]]
) {
  if (!enabled) return;
  void amplitude.track(name, props);
}

function identify(properties: Record<string, string>) {
  const op = new amplitude.Identify();
  for (const [key, value] of Object.entries(properties)) op.set(key, value);
  void amplitude.identify(op);
}

/* ─────────────────────────────────────────────────────────────────────────
 * 사용자 식별
 * ───────────────────────────────────────────────────────────────────────── */

const USER_INFO_HASH = hashKey(keys.userInfo());

/**
 * 직전에 본 내 정보. 가입 단계가 **바뀐 순간**을 알아내는 데만 쓴다.
 * 화면마다 `onSuccess` 에 이벤트를 다는 대신 서버가 알려 준 `next_step` 의
 * 변화를 보면, 새로고침이나 재시도에 같은 단계가 두 번 세어지지 않는다.
 */
let lastSeen: {
  id: string;
  status: UserInfo["status"];
  step: NextStep | null;
} | null = null;

/**
 * 내 정보가 캐시에 들어올 때마다 사용자 속성을 맞춘다.
 *
 * Amplitude 의 사용자 id 는 건드리지 않는다. 서버 id 는 `cheers_user_id` 라는
 * **속성**으로만 실어서, 나중에 이 값으로 한 사람의 행적을 찾아볼 수 있되
 * 익명 deviceId 기반의 흐름(로그인 전 → 후)이 끊기지 않는다. 이름 · 이메일 ·
 * 학과 · 회사 같은 값은 싣지 않는다.
 *
 * 로그아웃해도 `reset` 하지 않으므로, 다음 로그인 전까지의 이벤트에는 직전
 * 사용자의 속성이 남는다. 같은 기기에서 계정을 바꿔 로그인하면 다음
 * 내 정보 응답이 덮어쓴다.
 */
function observeUserInfo(queryClient: QueryClient) {
  queryClient.getQueryCache().subscribe((event) => {
    if (event.type !== "updated" || event.action.type !== "success") return;
    if (event.query.queryHash !== USER_INFO_HASH) return;

    const me = event.query.state.data as UserInfo | undefined;
    if (!me) return;

    identify({
      environment: APP_ENV,
      cheers_user_id: me.id,
      user_type: me.type,
      account_status: me.status,
      next_step: me.next_step ?? "none",
    });

    const prev = lastSeen;
    lastSeen = { id: me.id, status: me.status, step: me.next_step };

    // 가입 중(`pending`)에 단계가 바뀐 경우만 센다. 어드민이 명함 인증을
    // 취소해 `verify` 로 돌아온 현업자의 재인증은 가입 퍼널이 아니다
    if (!prev || prev.id !== me.id || prev.status !== "pending") return;
    if (prev.step === null || prev.step === me.next_step) return;

    track("Onboarding Step Completed", {
      step: prev.step,
      user_type: me.type,
    });
    if (prev.step === "profile" && me.next_step === null) {
      track("Signup Completed", { user_type: me.type });
    }
  });
}

/* ─────────────────────────────────────────────────────────────────────────
 * 이벤트 보강 · 정리
 * ───────────────────────────────────────────────────────────────────────── */

const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
const PHONE = /\+?\d[\d\s-]{7,}\d/g;
const MAX_TEXT = 40;
/** 클릭류 자동 수집이 보는 요소. 입력칸 · 라벨 · 본문 글은 뺀다 */
const CLICKABLE = ["a", "button", '[role="button"]'];

/** 자동 수집 이벤트가 요소의 글자를 실을 때 쓰는 속성 */
const TEXT_PROPERTIES = ["[Amplitude] Element Text", "[Amplitude] Element Aria Label"];

/**
 * 모든 이벤트에 두 가지를 한다.
 *
 * 1. `route` — 주소가 아니라 **라우트 패턴**(`/_app/mentors/$mentorId/apply`)을
 *    싣는다. 페이지뷰의 주소에는 선배·신청 ID 가 섞여 있어 화면 단위로 묶어
 *    보기 어렵다. 라우터의 상태는 주소보다 한발 늦게 바뀌므로 `location` 으로
 *    직접 맞춘다.
 * 2. 요소 정보 정리 — 클릭 자동 수집이 싣는 글자에서 이메일·전화번호 꼴을
 *    지우고 길이를 자른다. 카드나 링크 안에 사용자 정보가 들어 있어도 이름
 *    같은 값이 길게 실려 나가지 않게 하는 마지막 안전망이다. 링크 주소
 *    (`Element Href`)는 통째로 뺀다.
 */
function sanitizePlugin(router: AnyRouter): amplitude.Types.EnrichmentPlugin {
  return {
    name: "cheers-sanitize",
    type: "enrichment",
    setup: async () => undefined,
    execute: async (event) => {
      const props: Record<string, unknown> = { ...event.event_properties };

      const route = currentRoute(router);
      if (route) props.route = route;

      for (const key of TEXT_PROPERTIES) {
        const value = props[key];
        if (typeof value === "string") props[key] = scrub(value);
      }

      // 링크 주소에는 다른 회원이 입력한 프로필 URL(LinkedIn 등)이 실릴 수 있다
      delete props["[Amplitude] Element Href"];

      event.event_properties = props;
      return event;
    },
  };
}

function currentRoute(router: AnyRouter): string | undefined {
  const [matched, , found] = router.getMatchedRoutes(window.location.pathname);
  return (found ?? matched.at(-1))?.id;
}

function scrub(text: string): string {
  const cleaned = text.replace(EMAIL, "[email]").replace(PHONE, "[phone]");
  return cleaned.length > MAX_TEXT ? `${cleaned.slice(0, MAX_TEXT)}…` : cleaned;
}
