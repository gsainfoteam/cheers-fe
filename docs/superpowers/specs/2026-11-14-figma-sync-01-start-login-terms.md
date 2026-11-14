# 피그마 ↔ FE 동기화: 01 · 시작·로그인·약관

작성일: 2026-11-14
브랜치: `42-sync-figma-design-service-policy`
피그마: `figma.com/design/coVd5RXl0QhMXBVwOqlsju` (취얼스), 섹션 `01 · 시작·로그인·약관` (node `375:15121`)
선행 문서: [`2026-11-14-figma-design-sync-guideline.md`](./2026-11-14-figma-design-sync-guideline.md) (0장 디자인 시스템). 형식, 우선순위(P0/P1/P2), 🔶 표기, 결정 번호(D0-*)는 그 문서를 따른다.

---

## 1. 시작·로그인·약관

읽은 날: 2026-11-14. 비교한 코드: `routes/index.tsx`, `routes/login.tsx`, `routes/onboarding/terms.tsx`, `components/ui/responsive-dialog.tsx`, `components/layout/site-header.tsx`·`site-footer.tsx`, `styles/tokens.css`. 기준 커밋은 `5a5795e`이다.

이 섹션에 있는 프레임:

| 프레임 | Desktop | Mobile | 코드 |
|---|---|---|---|
| 랜딩 | `352:9464` | `352:9465` | `routes/index.tsx` |
| 학생 로그인 | `334:5733` | `334:5643` | `routes/login.tsx` (`role=student`) |
| 선배 로그인 | `334:5917` | `334:5827` | `routes/login.tsx` (`role=mentor`) |
| 약관 동의 + 서비스 이용약관 불러오는 중 | `335:6348` | `335:6313` | `onboarding/terms.tsx` + `ResponsiveDialog` |
| 약관 동의 + 개인정보 동의 불러오는 중 | `335:6529` | `335:6494` | 같음 |
| 메모(약관 URL) | `911:33944`, `911:33946` | — | `site-footer.tsx`, `terms.tsx` |

> 약관 동의 화면의 **모바일 본 화면**(다이얼로그가 없는 상태)은 이 섹션에 없다. `terms.tsx` 주석의 `334:6011`은 다른 섹션에 있으므로 그 장에서 본다.

### 1.1 요약

| # | 대상 | 피그마 노드 | 코드 | 상태 | 우선순위 |
|---|---|---|---|---|---|
| 1.0.1 | **빌드 깨짐**: 헤더 로고 | `355:9597` | `layout/site-header.tsx` | ❌ `5a5795e`에서 되돌아감 + 오타 | **P0** |
| 1.0.2 | **약관 본문 회귀** | `335:6378` | `onboarding/terms.tsx` | ❌ `5a5795e`에서 iframe·`type` 매핑이 사라짐 | **P0** |
| 1.2 | 자간 단위: Heading/Screen, Heading/H2 | 텍스트 스타일 | `styles/tokens.css` | ⚠️ % 스타일인데 px로 들어가 있음 | **P0** |
| 1.3.1 | 랜딩 Hero 3D 사원증 그림 | `1218:9067` / `1218:9071` | `assets/landing/badge-scene.png` | ⚠️ 자산 교체(정사각 → 세로형) | P1 |
| 1.3.2 | 랜딩 배경(Hero 빛·닫는 CTA 글로우) | `426:5427` / `426:5441` | `champagne-grain.svg`, `closing-glow.svg` | ⚠️ 데스크톱 전용 그림이 따로 있음 | P1 |
| 1.3.3 | 랜딩 Hero 문구·배치 | `355:9620` | `index.tsx` `Hero` | ✅ 문구 일치(주석은 고침), 열 간격 32 | P2 |
| 1.3.4 | 선배 미리보기 | `355:9696` / `355:9929` | `MeetAlumniPreview` | ✅ 일치 | — |
| 1.3.5 | 이용 흐름 | `398:5985` / `398:6043` | `HowItWorks` | ⚠️ 1단계 제목이 두 폭에서 다름 | P2 🔶 |
| 1.3.6 | 닫는 CTA | `398:6005` / `398:6063` | `ClosingInvitation` | ✅ 일치(배경은 1.3.2) | — |
| 1.4 | 학생·선배 로그인 | `334:5735` 외 | `login.tsx` | ✅ 일치(구글 버튼은 의도적으로 다름) | — |
| 1.5.1 | 약관 동의 본 화면 | `335:6351` | `terms.tsx` | ✅ 배치 일치. `CheckRow`가 공통 컴포넌트가 아님(1.0.2) | — |
| 1.5.2 | 약관 다이얼로그 | `335:6378` / `335:6314` | `ResponsiveDialog` | ✅ 틀 일치. 제목 자간은 1.2 | — |
| 1.5.3 | 개인정보 항목 이름과 연결 문서 | `828:8732`, `911:33946` | `terms.tsx`, `site-footer.tsx` | 🔶 "수집·이용 동의" 항목이 "처리방침" 문서를 연다 | P1 🔶 |
| 1.6 | 약관 URL을 한 곳에서 관리 | — | `site-footer.tsx`, `terms.tsx` | 🧹 URL이 두 파일에 따로 있음 | P2 |

---

### 1.0 먼저 할 일: `5a5795e`의 회귀 복구 — **P0**

디자인 시스템 장(0.7)에서 "완료"로 체크한 항목 중 일부가 **커밋 `5a5795e`에 들어가지 않았거나, 더 오래된 파일 내용으로 덮였다.** 이 섹션 화면이 모두 이 파일들을 쓰므로 화면 작업보다 먼저 고친다.

#### 1.0.1 헤더: 빌드가 깨져 있다

`site-header.tsx`(HEAD 기준):

- **117행 `);p`.** `p`라는 글자가 하나 더 들어갔다. `tsc -b`가 `TS2304: Cannot find name 'p'`로 실패한다(2026-11-14 직접 실행해서 확인).
- **3행 `import catCheers from "@/assets/brand/cat-cheers.svg"`.** 이 파일은 같은 커밋에서 지웠다(0.3.13). 그래서 `vite build`도 import를 찾지 못해 실패한다.
- 0.3.7(데스크톱 로고 40px)과 0.3.13(헤더에 `BrandCat` 사용)이 이 파일에는 반영되지 않았다. `BrandCat`은 `employee-badge.tsx`와 `me.tsx`에서만 쓴다.

시안(`355:9597`, 헤더 Public): 3D 고양이 **모바일 32×27.29 / 데스크톱 40×34.12** + 워드마크 H3 + `로그인`(Label/Medium `text-ink-soft`). 바꿀 것:

```tsx
// site-header.tsx — BrandMark
import { BrandCat } from "@/components/brand-cat";
…
<BrandCat sizes="(min-width: 1024px) 40px, 32px" className="w-8 shrink-0 lg:w-10" />
<span className="text-h3 text-ink whitespace-nowrap">취얼스</span>
```

#### 1.0.2 약관 본문: iframe 임베드가 사라졌다

`7a9596a feat:embed privacy and tos in onborading page`에서 만든 내용이 `5a5795e`에서 그 이전 상태로 되돌아갔다.

| | `7a9596a` (맞는 상태) | HEAD (`5a5795e`) |
|---|---|---|
| 서버 `type` 키 | **`tos` / `privacy`** (실제 응답으로 확인했다고 주석에 있음) | `terms_of_service` / `privacy_policy` (확인 안 된 추측값) |
| 화면 결과 | `[필수] 서비스 이용약관` | 매핑이 안 맞아 **`[필수] tos`, `[필수] privacy`가 그대로 보인다** |
| 다이얼로그 본문 | `TermsFrame`: `terms.gistory.me/embedded/…` iframe + 다 뜰 때까지 뼈대 | **뼈대만 계속 보인다**(본문을 영영 못 읽음) |
| `ResponsiveDialog` | `bleed` 사용 | `bleed` 안 씀(prop은 아직 남아 있음) |
| 체크 줄 | — | 파일 안에 `CheckRow`를 따로 들고 있음. `ui/check-row.tsx`(0.3.4에서 공통화)를 안 씀 |

- `TermsFrame`, `CONSENT_DOC`, `nameOf`/`urlOf`를 `git show 7a9596a:src/routes/onboarding/terms.tsx`에서 되살린다.
- 파일 안 `CheckRow`를 지우고 `@/components/ui/check-row`를 import한다. 포커스 링이 `ring-focus/50 ring-3`에서 `ring-2 ring-focus`로 바뀌는데, 이건 0.3.4에서 정한 것이다.
- 시안의 "불러오는 중" 화면(`335:6348` 등)은 **iframe이 첫 화면을 그리기 전 상태**다. `TermsFrame`이 뼈대를 iframe 위에 덮어 두는 방식과 같다.
- 라벨은 1.5.3이 정해질 때까지 **시안 문구**(`서비스 이용약관` / `개인정보 수집·이용 동의`)를 쓴다. `7a9596a`는 `개인정보처리방침`이었다.

> **다른 파일도 확인한다.** 이 섹션 밖의 파일도 같은 방식으로 되돌아갔을 수 있다. 0.7에서 `[x]`로 표시한 항목이 HEAD에 실제로 들어 있는지 `git show 5a5795e --stat`과 해당 파일들을 대조해 본다. 특히 `5a5795e`에서 `-` 줄이 `+` 줄보다 훨씬 많은 파일을 먼저 본다.

---

### 1.2 자간 단위: Heading/Screen, Heading/H2 — **P0**

0.2.2와 같은 방법(노드에 적용된 px ÷ 글자 크기)으로 이 섹션에 나온 스타일을 확인했다. 두 스타일이 **% 단위**인데 지금 토큰은 px로 들어가 있다.

| 스타일 | 변수 값 | 노드에 적용된 값 (노드) | 단위 | 현재 토큰 | 바꿀 값 |
|---|---|---|---|---|---|
| **Heading/Screen (28)** | -2 | `-0.56px` (다이얼로그 제목 `335:6380`) | **%** | `-0.125rem` (-2px) | **`-0.02em`** |
| **Heading/H2 (24)** | -0.8 | `-0.192px` (모바일 다이얼로그 제목 `335:6316`) | **%** | `-0.05rem` (-0.8px) | **`-0.008em`** |
| Display/Hero desktop (64) | -3.3 | `-3.3px` | px | `-0.20625rem` | 유지 |
| Display/Hero mobile (40) | -1.9 | `-1.9px` | px | `-0.11875rem` | 유지 |
| Brand/Statement desktop (44) | -1.8 | `-1.8px` | px | `-0.1125rem` | 유지 |
| Brand/Statement mobile (28) | -1 | `-1px` | px | `-0.0625rem` | 유지 |
| Task/Title desktop (40) | -1.4 | `-1.4px` | px | `-0.0875rem` | 유지 |
| Task/Title mobile (32) | -1 | `-1px` | px | `-0.0625rem` | 유지 |
| Heading/Card (18) | 0 | 0 | — | 0 | 유지 |

- **Heading/Screen은 눈에 보이는 차이다.** 지금은 글자 사이가 1.44px씩 더 좁다. 28px 제목에서 글자가 서로 붙어 보인다.
- 영향을 받는 곳: `text-screen`은 `responsive-dialog.tsx`, `confirm-dialog.tsx`이고, `text-h2`는 `responsive-dialog.tsx`, `empty-state.tsx`, `mentors/$mentorId/apply.tsx`다. 토큰 두 줄만 바꾸면 모두 따라온다.
- 남은 미확인 스타일: **Heading/H1, Display/Page.** 이들이 처음 나오는 섹션 장에서 확인한다.
- 0장 문서의 0.2.2 표에도 위 행을 추가했다(이 문서와 같은 날).

```css
/* tokens.css — 바꿀 곳 */
--text-screen--letter-spacing: -0.02em;  /* Heading/Screen -2% → 28px 에서 -0.56px */
--text-h2--letter-spacing: -0.008em;     /* Heading/H2 -0.8% → 24px 에서 -0.192px */
```

`tokens.css` 머리 주석의 "% 스타일(H3, Label/Small)"도 **"H3, H2, Screen, Label/Small"** 로 고친다.

---

### 1.3 랜딩 (`352:9464` / `352:9465`) → `routes/index.tsx`

#### 1.3.1 Hero 3D 사원증 그림 — P1

| | 현재 | 시안 |
|---|---|---|
| 노드 | 옛 `425:5278` (지금 시안에서는 **숨김**) | **`1218:9067`**(Desktop) / **`1218:9071`**(Mobile) |
| 원본 | `badge-scene.png` 1254×1254 정사각, 1.5MB | **884×1372 세로형 PNG**(비율 0.644), 약 640KB |
| 표시 크기 | 모바일 최대 370 / 데스크톱 최대 690 정사각 | 모바일 **238.4×370** / 데스크톱 **489.7×760** |
| 위치 | 남은 폭 가운데, 세로 가운데 | 데스크톱: 668 폭 칸 가운데, **Hero 위아래 끝까지(top 0, 높이 760)**. 모바일: 393×370 칸 가운데 |

바꿀 것(성능 가이드 `2026-11-14-rendering-performance-guideline.md`의 LCP 규칙을 그대로 따른다):

1. `get_design_context(1218:9067)`이 주는 PNG를 받아 `assets/landing/badge-scene.png`에 덮어쓴다. 파일 이름은 그대로 둔다. 임시 URL을 코드에 남기지 않는다.
2. 2배 밀도까지만 만든다. 모바일은 238 × 2 = **477w**다. 데스크톱 2배(980)는 원본 폭 884보다 크므로 **884w**로 끝낸다.
   ```ts
   import badgeSceneSrcset from "@/assets/landing/badge-scene.png?w=477;884&format=webp&as=srcset";
   import badgeSceneSrc from "@/assets/landing/badge-scene.png?w=477&format=webp";
   ```
3. `<img>` 속성:
   - `width={884} height={1372}`: 새 비율로 자리를 잡는다(CLS).
   - `sizes="(min-width: 1024px) 490px, 239px"`
   - `className="h-auto w-[239px] lg:w-[490px]"`(최대 폭이 아니라 고정 폭이다. 시안은 칸보다 작게 그린다)
   - `fetchPriority="high"`, lazy 없음은 그대로 둔다(LCP).
4. 데스크톱 배치: 그림 높이 760이 Hero 높이와 같다. `lg:min-h-190`을 유지하면 그림이 위아래 끝에 닿는다. 글 묶음과 그림 칸 사이를 시안대로 **`lg:gap-8`**(32)로 두고, 그림 칸은 `lg:w-167`(668) `lg:shrink-0`으로 고정한다. 지금은 `lg:gap-0` + `flex-1`(700)이라 그림 중심이 16px 오른쪽으로 가 있다.
5. 대체 텍스트 "취얼스 사원증 두 장이 걸린 그림"은 새 그림에도 맞는다. 그대로 둔다.
6. 머리 주석의 "원본 PNG 는 1254² …" 설명을 새 크기로 고친다.

#### 1.3.2 Hero 빛·닫는 CTA 글로우 배경 — P1

시안은 배경 SVG를 **폭마다 따로** 그렸다. 코드는 모바일 그림 하나를 두 폭에 같이 쓴다.

| 배경 | Mobile 시안 | Desktop 시안 | 코드 |
|---|---|---|---|
| `Champagne light & grain` | 393×838, 살구빛이 아래쪽 가운데(`cx 215, cy 640`) | **1440×760, 살구빛이 오른쪽 사원증 뒤(`cx 1110, cy 390`)** | `champagne-grain.svg` = 모바일 그림. 데스크톱에서는 `object-cover`로 3.7배 늘려 가운데를 잘라 쓴다 |
| `Closing champagne glow` | 393×264 | **1440×352** | `closing-glow.svg` = 모바일 그림 |

그래서 데스크톱 Hero에서 빛이 사원증 뒤가 아니라 엉뚱한 곳에 크게 번져 있다.

- `get_design_context(426:5427)`, `(426:5441)`에서 데스크톱 SVG를 받아 `assets/landing/champagne-grain-desktop.svg`, `closing-glow-desktop.svg`로 둔다.
- `<picture>`로 폭에 따라 하나만 받게 한다(두 장을 모두 받지 않는다).
  ```tsx
  <picture>
    <source media="(min-width: 1024px)" srcSet={champagneGrainDesktop} />
    <img src={champagneGrain} alt="" aria-hidden className="pointer-events-none absolute inset-0 size-full object-cover" />
  </picture>
  ```
- SVG가 `preserveAspectRatio="none"`이므로 각 폭에서는 비율이 거의 맞는다. 1024~1440 사이에서도 `object-cover`로 충분하다.

#### 1.3.3 Hero 문구·배치 — P2

- 문구는 **모두 일치한다.** 시안이 데스크톱 제목도 `선배와 한 잔.`으로 고쳤다. `index.tsx:141`의 "시안은 모바일 '선배와 한 잔.' / 데스크톱 '선배와 함께.'" 주석은 이제 맞지 않으므로 지운다. (`get_metadata`의 레이어 이름에는 아직 `선배와 함께.`가 남아 있다. 실제 글자는 `한 잔.`이다.)
- 위아래 여백(모바일 `pt-12 pb-8 gap-8`, 데스크톱 중앙 정렬), 글 묶음 간격(모바일 20 / 데스크톱 28), 버튼(Primary 280×56, Ghost 296×48, 모바일 꽉 찬 폭)은 일치한다. 열 간격은 1.3.1-4에서 함께 고친다.

#### 1.3.4 선배 미리보기 — 일치 ✅

제목 Statement, 설명 Body/Medium(데스크톱 420 폭, 세로 가운데), 갤러리(데스크톱 4열 `gap-8`, 모바일 2×2 `gap-x-3 gap-y-6`), 여백(`py-14 / lg:py-22`), 배경 그라데이션(`#fffcf8`)이 모두 같다. 사원증 카드 안쪽(인장 3D 고양이, 부서 줄 없음)은 0.3.9를 따른다.

#### 1.3.5 이용 흐름 — P2 🔶

배치·글자는 일치한다(Brand/Micro 번호 28폭, Heading/Card 제목, Body/Small 설명, `gap-5`·`gap-6`, 데스크톱 왼쪽 360 + 간격 64).

**1단계 제목이 폭마다 다르다.**

| | Desktop `398:5993` | Mobile `398:6051` | 코드 |
|---|---|---|---|
| 01 제목 | **선배를 찾고** | 선배를 만나고 | 선배를 만나고 |

설명이 "…선배를 **찾아**보세요"이고, 이어지는 "남기면 → 시작돼요"까지 생각하면 `찾고`가 흐름에 맞는다. 하지만 Hero 제목(`함께`/`한 잔`)도 한쪽 폭만 고쳐졌던 적이 있어서 어느 쪽이 최신인지 알 수 없다. → 🔶 **D1-1: 디자이너에게 확인한다.** 답이 오기 전까지는 지금 코드(`선배를 만나고`)를 둔다.

#### 1.3.6 닫는 CTA — 일치 ✅

Statement 가운데 정렬, Primary 버튼(데스크톱 280 / 모바일 꽉 찬 폭), 여백(`py-12 / lg:py-18`, `gap-8`)이 같다. 배경은 1.3.2를 따른다.

---

### 1.4 학생·선배 로그인 (`334:5733` · `334:5643` · `334:5917` · `334:5827`) — 일치 ✅

| 부분 | 시안 | 코드 |
|---|---|---|
| Main 여백 | 데스크톱 `pt-16 pb-18`, 모바일 `pt-8 pb-12` | 같음 |
| Task workspace | 936 폭, 2열 간격 64 | `lg:w-234 lg:gap-16` |
| 소개 | 352 폭, `pt-4`, 제목 Task/Title + 설명 Body/Medium, 간격 데스크톱 20 / 모바일 12 | 같음 |
| 카드 | 520, `p-10`, `gap-7`, `rounded-lg`, 1px `border-line`, Work surface. **데스크톱에만** 있음 | 같음 |
| 제목 | `학생으로 시작하기` / `선배로 시작하기` | `COPY` 같음 |
| 전환 링크 | `취업한 선배로 시작하기` / `취업 준비 중인 학생으로 시작하기`, Label/Medium `text-brand` | 같음 |
| 소셜 | Google 한 개(`Google로 계속하기`). **Kakao·Naver·구분선은 시안에서도 숨김** | GIS 버튼 하나 |

- **구글 버튼은 계속 GIS 그대로 둔다(0.3.5).** 시안은 56px Social이고, GIS는 40px에 구글 문구(`Google 계정으로 계속하기`)다. 의도된 차이다.
- ✅ **D1-3(0.3.5에서 넘어온 질문): Kakao·Naver는 다시 보이게 하지 않는다.** 시안이 두 버튼과 구분선을 `hidden`으로 두었다. 지금 코드와 같다.
- 딥링크 진입 변형(`reason=application|wrong-account`)은 `07 · 알림톡·웹 진입` 섹션 장에서 본다.

---

### 1.5 약관 동의 (`335:6348` 외) → `onboarding/terms.tsx`

#### 1.5.1 본 화면 — 일치 ✅

Task workspace 976(`lg:w-244`), 소개 352 + 단계 막대(`lg:gap-10`), 카드 560 `p-10 gap-7`, `전체 동의` → 구분선 → 필수 항목 둘(`gap-4`) → `동의하고 다음`(아무것도 체크하지 않았을 때 Disabled)이 모두 같다. 체크 줄은 1.0.2에서 공통 `CheckRow`로 바꾼다.

#### 1.5.2 약관 다이얼로그 — 틀 일치 ✅

| 부분 | 시안 Desktop / Mobile | `ResponsiveDialog` |
|---|---|---|
| 상자 | 720×610, `rounded-xl`, Shadow/Modal / 전체 화면 | 같음(창이 낮을 때 `max-h`만 더함) |
| 머리 | `px-8 py-5` / `px-5 py-4`, 제목 **Heading/Screen** / **Heading/H2**, 닫기 44(`p-2.5`, 아이콘 24) | 같음. 자간만 1.2 |
| 본문 | `px-8 py-6` / `px-5 py-6`, `gap-6`, 본문만 스크롤 | 같음 |
| 불러오는 중 | `약관을 불러오는 중이에요.` Body/Small `text-ink-soft` + 문단 뼈대 3개(제목 16 높이 315/169폭, 줄 10 높이 ×4, 마지막 줄 70%) | `DialogBodySkeleton` 같음 |
| 버튼 줄 | `pt-4 pb-5`, Primary `닫기` 240 / 꽉 찬 폭 | 같음 |
| 제목 | `서비스 이용약관` / `개인정보 수집·이용 동의` | 1.0.2에서 라벨 매핑을 되살리면 맞음 |

#### 1.5.3 개인정보 항목: 이름과 여는 문서가 다르다 — P1 🔶

- 체크 줄과 다이얼로그 제목(시안): **`[필수] 개인정보 수집·이용 동의`**
- 시안 메모(`911:33946`)가 연결한 문서: **`개인정보처리방침`** `https://terms.gistory.me/cheers/privacy/261101/`
- 푸터 링크: `개인정보 수집·이용` → 같은 처리방침 URL

개인정보 보호법에서 **처리방침**(제30조, 공개하는 안내문)과 **수집·이용 동의**(제15조, 목적·항목·보유 기간·거부할 권리와 불이익을 알리고 받는 동의)는 다른 문서다. "수집·이용 동의"에 체크하게 하고 처리방침 전문을 보여 주는 것이 괜찮은지는 FE가 정할 일이 아니다.

→ 🔶 **D1-2: 서비스 정책 담당(필요하면 법무)에게 확인한다.**
- (a) `privacy/261101` 페이지에 동의에 필요한 네 항목이 따로 정리되어 있으면 시안 라벨을 그대로 둔다.
- (b) 아니라면 수집·이용 동의 전용 문서(URL)를 받거나, 서버의 consent `type`을 나눈다(BE).

FE는 답이 오기 전에도 1.0.2를 진행한다. 라벨은 시안 문구로 둔다.

> 시안 정리 메모(디자이너 전달용): `911:33945`는 `911:33944`와 같은 자리에 겹친 `서비스 이용약관` 글 상자(둘째 줄 비어 있음)다. 지워도 되는 것으로 보인다.

---

### 1.6 약관 URL을 한 곳에서 관리 — P2

지금 약관 주소가 두 곳에 따로 적혀 있다.
- `site-footer.tsx`: 일반 경로(`/cheers/tos/261101/`). 새 탭으로 열기 때문에 일반 경로가 맞다.
- `terms.tsx`(1.0.2에서 되살린 뒤): `/embedded/` 경로(iframe 안에서 약관 사이트 헤더가 겹치지 않게 하려고).

약관을 개정하면 버전(`261101`)을 두 파일에서 같이 올려야 하는데, 한쪽을 놓치기 쉽다. `src/lib/legal.ts`로 모은다.

```ts
const VERSION = "261101";
export const LEGAL_DOCS = {
  tos:     { label: "서비스 이용약관",          path: `cheers/tos/${VERSION}/` },
  privacy: { label: "개인정보 수집·이용 동의", path: `cheers/privacy/${VERSION}/` }, // D1-2 결과에 따라
} as const;
export const pageUrl  = (k: keyof typeof LEGAL_DOCS) => `https://terms.gistory.me/${LEGAL_DOCS[k].path}`;
export const embedUrl = (k: keyof typeof LEGAL_DOCS) => `https://terms.gistory.me/embedded/${LEGAL_DOCS[k].path}`;
```

- 푸터 라벨(`이용약관`, `개인정보 수집·이용`)은 푸터 시안 글자라서 `label`과 따로 둔다.
- 같이 정리할 것: `site-footer.tsx`의 `tos_link` / `privacy_link` 이름(이 저장소의 다른 상수는 camelCase나 UPPER_CASE다), 10행 끝의 세미콜론 누락, 26~27행의 공백 두 칸.

---

### 1.7 결정·확인이 필요한 것

| # | 질문 | 결정 | 남은 일 |
|---|---|---|---|
| D1-1 | 이용 흐름 1단계 제목: `선배를 찾고`(Desktop) vs `선배를 만나고`(Mobile) | ✅ **`선배를 찾고`**. 시안 모바일도 고쳐짐(새 노드 `1259:9533`) | — |
| D1-2 | `개인정보 수집·이용 동의` 항목이 `개인정보처리방침` 문서를 여는 것 | ✅ **해결됨(2026-11-14).** 시안 라벨 `개인정보 수집·이용 동의` 그대로 + 문서는 `embedded/cheers/privacy/261101/` | — |
| D1-3 | 로그인 Kakao·Naver 다시 보이기(0.3.5) | ✅ **숨김 유지**(시안도 숨김) | — |

---

### 1.8 작업 체크리스트 (권장 순서)

> **구현 기록 (2026-11-14).** 아래 체크한 항목은 `42-sync-figma-design-service-policy` 작업 트리에 반영했다(커밋 전). 구현하면서 정한 세부 사항:
> - 회귀 대조 결과, `5a5795e`에서 되돌아간 파일은 `site-header.tsx`와 `terms.tsx` 둘뿐이었다. 0.7의 나머지 `[x]` 항목(토큰, `action.ts`, Hashtag, RequestItem, Select, Choice, ContactChoice, 사원증 CTA, shadcn 정리, `CheckRow`)은 HEAD에 들어 있다.
> - Hero 그림은 고정 폭이 아니라 **시안 크기를 최대 폭**(`max-w-[238.4px] lg:max-w-[489.7px]`)으로 두었다. 1024~1440에서는 콘텐츠 폭이 1248보다 좁아서, 고정 폭이면 그림 칸이 넘친다. 1440에서는 시안과 같은 489.7×760이 된다. WebP는 477w 48KB / 884w 95KB다(예전 740w/1254w).
> - 그림 칸은 `lg:w-167` 고정 대신 `lg:min-w-0 lg:flex-1` + `lg:gap-8`로 두었다. 1440에서 남는 폭이 정확히 668이다.
> - 배경은 `SectionBackdrop`(`<picture>`) 하나로 Hero와 닫는 CTA에 같이 쓴다. 모바일 SVG는 시안과 같아서(내부 id만 다름) 그대로 두었다.
> - 약관 주소는 `lib/legal.ts`(`pageUrl` / `embedUrl`, `VERSION` 하나)로 모았다. 서버 `type`(`tos`/`privacy`)을 키로 쓰고, 모르는 `type`은 서버가 준 `url`을 쓴다.
> - `dev/tokens.tsx`의 Screen·H2 설명도 `%`로 고쳤다.

**P0: 회귀 복구 (다른 섹션 작업보다 먼저)**
- [x] `site-header.tsx`: 117행 `p` 삭제, `cat-cheers.svg` import 제거 → `BrandCat` + `w-8 lg:w-10` (1.0.1, 0.3.7, 0.3.13)
- [x] `terms.tsx`: `TermsFrame` iframe(`/embedded/` URL), `tos`·`privacy` 매핑, `bleed` 되살리기. 라벨은 시안 문구 (1.0.2)
- [x] `terms.tsx`: 파일 안 `CheckRow`를 지우고 `ui/check-row` 사용 (1.0.2, 0.3.4)
- [x] `5a5795e`에서 0.7의 `[x]` 항목이 실제로 들어갔는지 나머지 파일도 대조 (1.0.2 메모) — 위 구현 기록 참고

**P0: 토큰**
- [x] `tokens.css`: `--text-screen--letter-spacing: -0.02em`, `--text-h2--letter-spacing: -0.008em`, 머리 주석 고치기 (1.2)

**P1**
- [x] Hero 3D 그림을 `1218:9067` 자산으로 교체: 477w/884w WebP, `width/height 884×1372`, `sizes`, 시안 크기 최대 폭, `lg:gap-8` (1.3.1)
- [x] Hero·닫는 CTA 데스크톱 배경 SVG 추가 + `<picture>` (1.3.2)

**P2**
- [x] `index.tsx` Hero 주석(`함께`/`한 잔`), 그림·배경 주석 고치기 (1.3.3)
- [x] `lib/legal.ts`로 약관 URL 모으기, 푸터 정리 (1.6)
- [x] D1-1: `STEPS[0].title` → `선배를 찾고` (1.3.5)
- [x] D1-2: 라벨은 시안 그대로, 문서는 처리방침 embedded URL (1.5.3)

**검증**
- [x] `tsc -b`, `bun run lint`, `bun run build` 통과
- [x] 393 / 1100 / 1440에서 랜딩 스크린샷을 시안과 비교. Hero 그림(1440에서 위아래 끝에 닿음, 1100에서 칸에 맞게 줄어듦), 데스크톱 배경 빛 위치(사원증 뒤), 1단계 제목, 푸터 링크 확인
- [x] 두 embedded 약관 페이지가 같은 `sandbox` 속성의 iframe 안에서 그려지는 것 확인(임베딩을 막는 헤더 없음)
- [ ] 로그인 두 변형 393 / 1440 비교 — 이번 작업으로 바뀐 것은 헤더뿐이라 랜딩 헤더로 갈음했다
- [ ] 약관 동의 화면 실제 확인: 가입 중 세션이 필요해서 아직 못 봤다. 항목 이름이 시안 문구로 나오는지, 다이얼로그에서 뼈대 → 본문으로 바뀌는지, 모바일에서 본문만 스크롤되는지 볼 것
- [x] 다이얼로그 제목 자간: 빌드된 CSS에서 `--text-screen--letter-spacing:-.02em`, `--text-h2--letter-spacing:-.008em` 확인. 화면에서 computed 값 확인은 위 약관 확인 때 같이 한다
