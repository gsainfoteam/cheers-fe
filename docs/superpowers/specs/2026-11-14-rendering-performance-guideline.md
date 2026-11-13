# 렌더링 성능 개선 가이드라인: 랜딩(`/`) 첫 화면

작성일: 2026-11-14
대상 독자: 이슈 #31(렌더링 속도 개선)을 맡거나, 앞으로 첫 화면에 이미지·폰트·의존성을 더할 프론트엔드 개발자
근거: Lighthouse 13.5.0 리포트(`https://stg.cheers.gistory.me/`, 2026-11-13 23:50 측정), 현재 코드, 로컬 프로덕션 빌드(`vite build --mode stg`) 산출물

---

## 0. 요약

| 지표 | 측정값 | 목표(모바일, Slow 4G) | 가장 큰 원인 |
| --- | --- | --- | --- |
| Performance | **48** | 80 이상 | 아래 항목의 합 |
| FCP | **5.3 s** | 3 s 이하 | 빈 `#root`. JS·CSS가 두 단계로 받아져야 첫 글자가 그려진다 |
| LCP | **9.3 s** | 4 s 이하(1차), 2.5 s(최종) | **`badge-scene.png` 1.5 MB**, 그리고 늦게 발견되는 이미지 요청 |
| Speed Index | **28.9 s** | 5 s 이하 | 1.5 MB PNG가 느린 회선에서 조금씩 그려진다 |
| CLS | **0.161** | 0.1 이하 | hero 이미지에 크기 지정이 없어 아래 섹션이 밀린다. 한글 폰트 swap도 원인이다 |
| TBT | 120 ms | 유지 | (양호) |

**가장 효과가 큰 작업 하나는 hero 이미지 교체다.** 1254×1254 RGBA PNG(1,536 KB)를 표시 크기에 맞춰 WebP로 바꾸면 **740px 94 KB, 1254px 209 KB**가 된다(로컬 실측, quality 80). 모바일 기준 전송량이 **약 94% 줄어든다.**

> 이번 Lighthouse 실행은 *"The page loaded too slowly to finish within the time limit"* 경고와 함께 끝났다. 측정 시간 안에 페이지가 다 받아지지 않았다는 뜻이다. 따라서 "Improve image delivery — 21 KiB" 같은 예상 절감량은 1.5 MB 이미지를 다 받기 전에 계산된 값일 가능성이 높으니 그대로 믿지 않는다. 수치보다 **아래 요청 체인**을 기준으로 판단한다.

### 진행 상황

| 항목 | 상태 | 비고 |
| --- | --- | --- |
| P0-1 hero 이미지 | ✅ 완료 (2026-11-14) | `vite-imagetools`로 빌드할 때 변환. 740w 98 KB, 1254w 216 KB |
| P0-2 크기 예약 | ✅ 완료 | hero에 `width`/`height` + `h-auto` 적용 |
| P0-3 로고 | ✅ 완료 | 240×84 상자 안으로 축소한 WebP(장당 1~5 KB), 랜딩에서만 `loading="lazy"` |
| P0-4 메타·robots | ✅ 완료 | `lang="ko"`, title, description, `public/robots.txt`(전체 허용) |
| P0-5 캐시·압축 | ⏳ 배포 쪽에서 확인 중 | |

로컬 비교 결과다. `vite preview`로 띄운 뒤 Lighthouse 13 모바일 프리셋(시뮬레이션 스로틀)으로 3회 측정해 중앙값을 냈다.

| | Perf | FCP | LCP | SI | CLS | TBT | 전송량 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P0 이전 | 66 | 2.0 s | 12.3 s | 2.0 s | 0.163 | 70 ms | 2,039 KB |
| P0 이후 | **81** | 2.0 s | **4.8 s** | 2.0 s | **0.015** | 63 ms | **570 KB** |

로컬에는 서버 지연과 CDN이 없어서 FCP와 SI가 스테이징 측정보다 훨씬 낮게 나온다. 이 표는 **전후 비교용**으로만 본다. 스테이징 배포 후 §4 방식으로 다시 재야 한다. LCP 4.8 s에서 더 줄이려면 이미지 요청이 늦게 시작되는 문제(P1-1)를 풀어야 한다.

---

## 1. 진단: 첫 화면이 그려지기까지

### 1.1 요청 체인 (로그아웃 상태로 `/` 진입)

```
① index.html                       ← #root 가 비어 있다. 이 시점에 그릴 것이 없다
   │
② ├─ index-*.js        250 KB (gzip 78 KB)   react-dom + router
   ├─ api-*.js          127 KB (gzip 37 KB)   zod + openapi-fetch + dto  ← 랜딩엔 불필요
   ├─ link-*.js          59 KB (gzip 21 KB)
   └─ index-*.css       137 KB (gzip 35 KB)   ← 그중 81 KB가 Noto Sans KR @font-face 124개
   │   (JS 실행 → 라우터 매칭 → redirectIfSignedIn)
   │
③ ├─ routes-*.js (랜딩 컴포넌트, autoCodeSplitting 으로 분리됨)
   ├─ utils-*.js 71 KB, page-shell, employee-badge, sign-out, action …
   │   (React 렌더 → 이제서야 <img> 가 DOM 에 생김)
   │
④ ├─ badge-scene.png   1,536 KB   ← LCP. 체인의 맨 끝에서 발견된다
   ├─ champagne-grain.svg (feTurbulence 노이즈 필터)
   ├─ Noto Sans KR 서브셋 여러 개 (화면에 쓰인 글자 수만큼)
   └─ 회사 로고 PNG 3장 81 KB (1000×332 등, 표시 크기는 70~118 px 폭)
```

Lighthouse의 "LCP request discovery"와 "Network dependency tree" 경고는 이 구조를 지적한 것이다. **LCP 이미지는 ④단계에서야 요청되고, 그 이미지가 1.5 MB다.** Slow 4G(약 1.6 Mbps)에서는 이미지 하나를 받는 데만 7초 이상 걸린다.

### 1.2 지표별 원인

**FCP 5.3 s**
- SPA라서 HTML에 내용이 없다. ②의 JS·CSS를 받아 실행하고 ③의 라우트 청크까지 받아야 첫 글자가 나온다.
- ②에 랜딩이 쓰지 않는 `api-*.js`(zod 스키마 전체)가 modulepreload로 들어온다. `main.tsx`와 `lib/guards.ts`가 `@/api` 배럴에서 `createQueryClient`, `onUnauthenticated`, `getTokens`를 가져오기 때문이다. Lighthouse의 "Reduce unused JavaScript 67 KiB"가 이 부분이다.
- CSS 137 KB가 render-blocking이다. 그중 59%(81 KB)는 Noto Sans KR의 unicode-range 조각 124개에 대한 `@font-face` 선언이다.

**LCP 9.3 s / Speed Index 28.9 s**
- `src/assets/landing/badge-scene.png`는 1254×1254 RGBA PNG이고 1,536 KB다. 모바일 표시 폭은 `max-w-[370px]`이다.
- 필름스트립을 보면 리본 이미지가 여러 프레임에 걸쳐 조금씩 그려진다. Speed Index는 시각적으로 완성되기까지의 시간을 재므로 크게 나빠진다.
- 이미지 요청 시작이 ④단계까지 늦어진다(1.1 참고).

**CLS 0.161**
- hero `<img>`에 `width`/`height`나 `aspect-ratio`가 없다(`src/routes/index.tsx` 의 `Hero`). 필름스트립 2~3번째 프레임에서는 "내가 궁금한 일," 섹션이 버튼 바로 아래 있다가, 이미지가 도착하면 아래로 밀려난다. Lighthouse의 "Image elements do not have explicit width and height"가 이 문제다.
- Noto Sans KR은 `font-display: swap`이다(`src/index.css` 주석 참고). 한글 폴백 폰트와 글자 폭 차이가 커서, 폰트가 바뀌는 순간 글이 한 번 움직인다.

**Main-thread 3.2 s / long task 9개**
- JS 평가(entry 250 KB + api 127 KB)
- 137 KB CSS의 스타일 계산
- `champagne-grain.svg`, `closing-glow.svg` 래스터화. 둘 다 `feTurbulence type="fractalNoise" numOctaves="3"` 필터를 섹션 전체에 걸고, `preserveAspectRatio="none"` + `object-cover`로 늘려 그린다. 데스크톱 hero(최대 1440×760)에서는 픽셀마다 노이즈를 계산하게 된다.

**그 밖에 (점수 영향은 작음)**
- "Use efficient cache lifetimes": 해시가 붙은 `/assets/*`에 장기 캐시 헤더가 없다. 호스팅 설정 문제이고, 저장소에는 배포 설정이 없다.
- "Legacy JavaScript 10 KiB": 의존성이 포함한 폴리필이나 트랜스파일 코드로 보인다. 우선순위가 낮다.
- SEO 83: `index.html`에 meta description이 없고, `robots.txt` 요청이 타임아웃됐다(`public/robots.txt` 없음). `<html lang="en">`, `<title>cheers-fe</title>`도 아직 바뀌지 않았다.

---

## 2. 개선 방향 (우선순위순)

각 항목에 **기대 효과**, **작업량**, **검증 방법**을 적었다. P0부터 하나씩 머지하고, 머지할 때마다 Lighthouse를 다시 잰다(§4).

### P0: 작고 효과가 큰 것

#### P0-1. hero 이미지를 반응형 WebP로 교체 · LCP/SI 대폭 개선 · 작업량 S

- 원본 PNG를 저장소에 원본으로만 두고, **표시 크기의 2배까지만** 내보낸다.
  - 모바일: 370 px × 2 = **740 px** → WebP 약 94 KB
  - 데스크톱: 690 px × 2 = 1380 px. 원본이 1254 px이므로 **1254 px** → WebP 약 209 KB
- 마크업 예시:

  ```tsx
  import badgeScene740 from "@/assets/landing/badge-scene-740.webp";
  import badgeScene1254 from "@/assets/landing/badge-scene-1254.webp";

  <img
    src={badgeScene740}
    srcSet={`${badgeScene740} 740w, ${badgeScene1254} 1254w`}
    // 모바일은 컨테이너 폭(최대 370), 데스크톱은 최대 690
    sizes="(min-width: 1024px) 690px, min(100vw - 48px, 370px)"
    width={1254}
    height={1254}
    fetchPriority="high"
    decoding="async"
    alt="취얼스 사원증 두 장이 걸린 그림"
    className="h-auto w-full max-w-[370px] lg:max-w-[690px]"
  />
  ```

  - `sizes`의 `48px`은 `PageContainer` 좌우 패딩에 맞춰 조정한다.
  - **`loading="lazy"`는 붙이지 않는다.** LCP 이미지를 lazy로 두면 오히려 느려진다.
- 변환 방법은 둘 중 하나를 고른다.
  - **수동**: `cwebp -q 80 -resize 740 0 badge-scene.png -o badge-scene-740.webp`처럼 변환해 커밋한다. 의존성이 늘지 않는다.
  - **자동**: `vite-imagetools`를 쓰면 `import srcset from "./badge-scene.png?w=740;1254&format=webp&as=srcset"`로 빌드 시점에 만든다. 이미지가 늘어날 예정이면 이쪽이 낫다. AVIF도 함께 낼 수 있다.
- 검증: Network 탭에서 hero 이미지 전송량이 100 KB 안팎인지 본다. Lighthouse LCP 요소가 이 이미지인지도 확인한다.

#### P0-2. 이미지에 크기 예약 · CLS 개선 · 작업량 XS

- P0-1의 `width`/`height` 속성으로 hero는 해결된다. CSS에서 `h-auto`를 함께 줘야 비율이 유지된다.
- 앞으로 추가하는 모든 `<img>`에는 `width`/`height` 속성이나 `aspect-*` 클래스를 반드시 단다(§3 규칙).
- 회사 로고(`EmployeeBadge`)는 이미 `h-[…] w-[…]` 고정 크기라 밀림이 없다. 배경 SVG는 `absolute inset-0`이라 레이아웃에 영향이 없다.

#### P0-3. 회사 로고 축소 · 전송량 약 70 KB 절감 · 작업량 XS

- `samsung.png`(1000×332, 37 KB), `hyundai.png`(842×595, 21 KB), `sk-hynix.png`(600×296, 23 KB)는 실제로 카드 안에서 폭 약 70 px(모바일)~118 px(데스크톱)로 표시된다.
- **폭 240 px WebP**(118 × 2)로 다시 내보내면 장당 몇 KB면 된다.
- 첫 화면 밖(선배 미리보기 섹션)에 있으므로 `<img loading="lazy">`를 붙인다. `EmployeeBadge`에 prop으로 열어 두면 된다.

#### P0-4. `index.html` 기본 메타 정리 · SEO/a11y · 작업량 XS

```html
<html lang="ko">
  <head>
    <title>취얼스 — GIST 선후배 커피챗</title>
    <meta name="description" content="궁금했던 회사와 직무, 같은 학교에서 먼저 시작한 선배와 이야기해 보세요." />
```

- `public/robots.txt`를 추가한다. 지금은 이 경로가 SPA 폴백으로 처리되다가 타임아웃이 난 것으로 보인다.
  - 이번에는 **전체 허용**(`Allow: /`)으로 넣었다. 파일이 없을 때도 크롤러는 전부 허용으로 보므로 노출 범위는 그대로다.
  - **스테이징을 검색에서 막을지**(`Disallow: /`)는 팀에서 정한다. 막기로 하면 환경별로 다른 파일을 내보내야 한다. 또 스테이징 Lighthouse의 SEO 점수가 "크롤링 차단"으로 떨어지므로 측정할 때 감안한다.

#### P0-5. 호스팅 캐시·압축 헤더 · 재방문 속도 · 작업량 S (배포 쪽)

저장소 밖의 설정이다. 배포 담당자에게 아래 내용을 확인받는다.

| 경로 | 헤더 |
| --- | --- |
| `/assets/*` (파일명에 해시 있음) | `Cache-Control: public, max-age=31536000, immutable` |
| `/index.html`, `/` | `Cache-Control: no-cache` (매번 재검증) |
| 모든 텍스트 응답 | `Content-Encoding: br` 또는 `gzip` |

- `robots.txt` 타임아웃은 서버 응답 자체가 느리다는 신호일 수 있다. DevTools Network에서 **HTML의 TTFB**도 함께 확인한다. TTFB가 1 s를 넘으면 프론트 코드보다 서버나 CDN을 먼저 봐야 한다.

---

### P1: 중간 규모

#### P1-1. hero 이미지를 HTML 단계에서 preload · LCP 개선 · 작업량 S

P0-1을 적용해도 이미지 요청은 여전히 ④단계에서 시작된다. 요청 시작 시점을 ①로 당긴다.

- 문제: SPA는 HTML이 하나뿐이라, `<link rel="preload">`를 그냥 넣으면 **모든 경로에서** 이미지를 받는다. 알림톡 딥링크로 `/applications/...`에 들어오는 사람도 받게 된다.
- 해결: `index.html`에 작은 인라인 스크립트를 넣어 **로그아웃 상태로 `/`에 들어왔을 때만** preload를 꽂는다. 로그인 상태면 `/`가 `/mentors`로 리다이렉트되므로 받을 필요가 없다.

  ```html
  <script>
    // 랜딩 hero(LCP) 를 JS 청크보다 먼저 받기 시작한다. 로그인 상태면 / 는 리다이렉트되므로 건너뛴다
    if (location.pathname === "/" && !localStorage.getItem("cheers.auth")) {
      const l = document.createElement("link");
      l.rel = "preload";
      l.as = "image";
      l.fetchPriority = "high";
      l.imageSrcset = "/landing/badge-scene-740.webp 740w, /landing/badge-scene-1254.webp 1254w";
      l.imageSizes = "(min-width: 1024px) 690px, min(100vw - 48px, 370px)";
      document.head.append(l);
    }
  </script>
  ```

- 이렇게 하려면 이미지 URL이 빌드 해시 없이 고정돼야 한다. 선택지는 둘이다.
  - 이미지를 `public/landing/`으로 옮기고, 바꿀 때 파일명에 버전을 붙인다(`badge-scene-v2-740.webp`). 컴포넌트도 같은 고정 URL을 쓴다. **`srcset`과 `sizes` 문자열이 컴포넌트와 정확히 같아야** preload가 재사용된다.
  - 작은 Vite 플러그인(`transformIndexHtml`)으로 해시가 붙은 URL을 주입한다. 코드는 늘지만 캐시 규칙이 일관된다.
- `"cheers.auth"`는 `src/api/tokens.ts`의 `STORAGE_KEY`다. 키를 바꾸면 여기도 같이 바꿔야 하므로 양쪽에 주석을 남긴다.
- 검증: Network 탭의 Initiator 열에서 이미지 요청이 `index.html`에서 시작되는지, 그리고 이미지가 한 번만 받아지는지(중복 요청 없음) 본다.

#### P1-2. 배경 SVG의 노이즈 필터 제거 · 메인 스레드 · 작업량 S~M

- `champagne-grain.svg`, `closing-glow.svg`는 피그마에서 내보낸 원본 그대로라 `feTurbulence`(fractalNoise, 3 octave) 필터가 섹션 전체에 걸려 있다.
- 대안은 **CSS 그라데이션 + 작은 타일 노이즈 이미지**다.
  - SVG 본문(선형 그라데이션 1개, 방사형 2개, 윤곽선)은 CSS `linear-gradient`/`radial-gradient`로 옮기거나, 필터만 뺀 SVG로 남긴다.
  - 그레인은 128×128 정도의 노이즈 PNG/WebP(수 KB)를 `background-repeat`로 깔고 `opacity`를 조절한다.
- 먼저 **필터 속성만 지운 SVG**로 바꿔 디자인 차이를 디자이너와 확인한다. 차이가 허용되면 그것만으로 끝낼 수 있다.
- 검증: Performance 패널 녹화에서 hero 영역의 Paint와 Rasterize 시간이 얼마나 줄었는지 비교한다. 체감 차이는 저사양 안드로이드에서 가장 크다.

#### P1-3. 엔트리 청크에서 API 레이어 분리 · FCP·Unused JS · 작업량 M

- 현재 `main.tsx`와 `lib/guards.ts`는 `@/api` 배럴을 가져온다. 그 결과 zod와 dto 스키마가 담긴 `api-*.js`(127 KB)가 첫 화면의 modulepreload에 포함된다.
- 랜딩(로그아웃)이 실제로 쓰는 것은 `getTokens()`(localStorage 읽기)뿐이다.
- 방향:
  1. `getTokens`처럼 의존성 없는 함수는 `@/api/tokens`에서 **직접** 가져온다(배럴을 거치지 않는다).
  2. `createQueryClient`, `onUnauthenticated`가 zod나 client를 끌고 오는지 확인하고, 끌고 온다면 가벼운 모듈로 나눈다.
  3. 빌드한 뒤 `dist/index.html`의 `modulepreload` 목록에서 `api-*.js`가 빠졌는지 확인한다. **빠지지 않았다면 효과가 없는 것이니** 청크 그래프를 다시 본다. `npx vite-bundle-visualizer`나 `rollup-plugin-visualizer`가 도움이 된다.
- 주의: `redirectIfSignedIn`은 토큰이 있을 때만 API를 부르므로 동적 `import("@/api")`로 바꿀 수 있다. 다만 가드의 동작(401 처리, 리다이렉트 순서)을 바꾸지 않도록 한다.

#### P1-4. 한글 폰트 전략 재검토 · FCP·CLS · 작업량 M (디자인 합의 필요)

- 지금 방식(unicode-range 124조각, swap)은 `src/index.css` 주석과 **설계 5.2**에 따라 의도적으로 고른 것이다. 바꾸기 전에 근거를 모아 합의한다.
- 먼저 잴 것: Network 탭을 Font로 필터링하고 `/` 첫 로드에서 받는 서브셋 수와 총 바이트를 확인한다.
- 선택지:
  - **폴백 메트릭 맞추기(가장 가벼움)**: `size-adjust`, `ascent-override`를 준 폴백 `@font-face`(`local("Apple SD Gothic Neo")`, `local("Malgun Gothic")`)를 선언해 swap할 때의 글 밀림을 줄인다. CLS에만 효과가 있다.
  - **서브셋 축소**: 실제로 쓰는 웨이트 범위와 KS X 1001 상용 2,350자 + 라틴만 담은 파일 1~3개로 직접 서브셋한다(`pyftsubset`). 그러면 render-blocking CSS에서 `@font-face` 81 KB가 사라지고, 파일 수가 적어 `preload`도 가능해진다. 단, 사용자 입력(닉네임 등)에 드문 한자나 한글이 나오면 폴백으로 그려진다.
- 둘 다 하지 않더라도 **첫 화면에 쓰는 웨이트 수를 늘리지 않는 것**은 §3 규칙으로 둔다.

---

### P2: 큰 변경 (별도 설계 필요)

#### P2-1. 랜딩 정적 프리렌더 · FCP 1~2 s대 · 작업량 L

- 랜딩은 **로그아웃 전용이고 내용이 전부 고정값**이다(`PREVIEW_BADGES`도 하드코딩). 빌드 시점에 HTML로 미리 그려 두기 가장 좋은 화면이다.
- 효과: ①의 HTML 응답만으로 hero 문구와 버튼이 그려진다. FCP가 JS 다운로드를 기다리지 않는다.
- 방법 후보:
  - 빌드 후 스크립트에서 `react-dom/server`로 `/`를 렌더해 `dist/index.html`의 `#root`에 넣고, `main.tsx`는 `hydrateRoot`로 바꾼다.
  - TanStack Start의 정적 프리렌더로 옮긴다. 마이그레이션 비용이 크다.
- 반드시 풀어야 할 문제:
  - 로그인한 사용자가 `/`에 오면 프리렌더된 랜딩이 잠깐 보였다가 `/mentors`로 튄다. P1-1과 같은 인라인 토큰 체크로 페인트 전에 `location.replace`할지 정해야 한다.
  - 다른 경로(`/applications/...`)로 들어온 사용자에게는 프리렌더 HTML이 보이면 안 된다. 경로별 HTML을 따로 두거나 서버 폴백 규칙을 나눠야 한다. 호스팅 구성과 엮이는 문제다.
- **P0과 P1을 끝내고 다시 잰 뒤에도 FCP가 목표를 넘을 때 착수한다.**

#### P2-2. 랜딩 라우트 코드 분할 해제 (선택)

- `autoCodeSplitting: true` 때문에 랜딩 컴포넌트가 별도 청크로 빠져 있고, 그만큼 왕복이 한 번 늘어난다(③).
- TanStack Router 플러그인의 라우트별 분할 설정(`codeSplittingOptions`, 라우트의 `codeSplitGroupings`)으로 `/`만 엔트리에 포함시킬 수 있다. **정확한 옵션은 사용 중인 `@tanstack/router-plugin` 버전 문서에서 확인한다.**
- 대신 엔트리가 커지므로 다른 경로로 들어오는 사람은 손해를 본다. P1-3으로 엔트리를 줄인 다음에 판단한다.

---

## 3. 앞으로 지킬 규칙

새 화면이나 자산을 추가할 때 적용한다. PR 리뷰 체크리스트로 써도 된다.

### 3.1 이미지

- **PNG 원본을 그대로 `import`하지 않는다.** 표시 크기의 2배까지만 내보내고, 사진·일러스트는 WebP(가능하면 AVIF도)로 쓴다.
- **모든 `<img>`에 `width`/`height` 속성이나 `aspect-*`를 단다.** CLS 방지용이다.
- 첫 화면의 가장 큰 이미지(LCP 후보)에는 `fetchPriority="high"`를 달고, `loading="lazy"`는 금지한다.
- 첫 화면 밖 이미지에는 `loading="lazy"`를 단다.
- 피그마에서 SVG를 내보내면 `filter`, `feTurbulence`, `feGaussianBlur`, 큰 `mask`가 들어 있는지 확인한다. 장식용 노이즈나 블러는 래스터 이미지나 CSS로 바꾼다.
- 기준: **LCP 이미지 150 KB 이하**, 일반 이미지 장당 50 KB 이하.

### 3.2 JS·CSS

- 엔트리나 랜딩 경로에서 `@/api` 배럴을 새로 가져오지 않는다. 필요한 함수는 하위 모듈에서 직접 가져온다.
- 새 의존성을 추가하면 `bun run build` 출력에서 **엔트리(`index-*.js`)와 modulepreload 목록이 커졌는지** 확인하고, PR 본문에 크기 변화를 적는다.
- 기준: 랜딩 첫 로드의 **render-blocking 전송량(JS+CSS, gzip) 200 KB 이하**, 첫 화면 총 전송량 500 KB 이하.

### 3.3 폰트

- 첫 화면에서 쓰는 폰트 패밀리와 웨이트를 늘리지 않는다. 영문 장식 폰트(Geist 계열)처럼 **필요한 서브셋 CSS만** 가져오는 지금 방식을 유지한다.

---

## 4. 측정·검증 방법

결과가 매번 크게 흔들리므로 아래 조건을 고정한다.

1. **환경**: 스테이징(`stg.cheers.gistory.me`), Chrome **시크릿 창**(확장 프로그램 영향 제거), 로그아웃 상태
2. **Lighthouse 설정**: Mode Navigation, Device Mobile, Categories Performance. 기본 Slow 4G와 CPU 4x 스로틀
3. **3회 측정 후 중앙값**을 기록한다. CLI를 쓰면 반복하기 쉽다:
   ```bash
   npx lighthouse https://stg.cheers.gistory.me/ --only-categories=performance --output=json --output-path=./lh.json --chrome-flags="--headless=new"
   ```
4. **PR마다 전후 표를 남긴다**: Performance, FCP, LCP, CLS, SI, TBT, 그리고 LCP 요소가 무엇이었는지
5. 원인을 더 파고들 때는 DevTools Performance 패널에서 *Start profiling and reload page*로 녹화한 뒤 다음을 본다.
   - Network 트랙: hero 이미지 요청이 언제 시작되는지
   - Main 트랙: long task 안에서 Evaluate Script, Recalculate Style, Paint 중 무엇이 큰지
   - Layout Shifts 트랙: 어떤 요소가 밀렸는지

### 기대 효과 (추정)

| 단계 | 예상 변화 |
| --- | --- |
| P0 적용 후 | 첫 화면 전송량 약 1.7 MB → 약 0.3 MB. LCP와 SI가 크게 줄고 CLS는 0.1 아래로 들어갈 것으로 예상 |
| P1 적용 후 | LCP 요청이 ①단계로 당겨지고 엔트리 JS가 줄어 FCP와 LCP가 추가로 개선 |
| P2 적용 후 | FCP가 HTML 도착 시점에 가까워짐 |

> 위 수치는 로컬 빌드 산출물 크기와 Slow 4G 대역폭으로 계산한 **추정**이다. 실제 효과는 §4 방식으로 측정해 확인한다.

---

## 5. 작업 순서 제안

| 순서 | 작업 | 담당 영역 | 비고 |
| --- | --- | --- | --- |
| 1 | P0-1, P0-2, P0-3 이미지 교체 | 프론트 | PR 하나로 묶어도 된다 |
| 2 | P0-4 메타·robots | 프론트 | robots 정책은 팀에서 결정 |
| 3 | P0-5 캐시·압축·TTFB 확인 | 배포 | 저장소 밖 |
| 4 | 재측정 | — | §4 표 기록 |
| 5 | P1-1 preload, P1-2 SVG 필터 | 프론트·디자인 | P1-2는 디자인 확인 필요 |
| 6 | P1-3 엔트리 분리 | 프론트 | modulepreload 목록으로 검증 |
| 7 | P1-4 폰트 | 프론트·디자인 | 설계 5.2 재합의 |
| 8 | 재측정 후 P2 판단 | — | |
