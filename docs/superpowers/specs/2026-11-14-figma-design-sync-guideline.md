# 피그마 ↔ FE 동기화 개발 가이드라인

작성일: 2026-11-14
브랜치: `42-sync-figma-design-service-policy`
대상 독자: 피그마 `취얼스` 파일의 최신 시안과 현재 구현의 차이를 메우는 프론트엔드 개발자
피그마: `figma.com/design/coVd5RXl0QhMXBVwOqlsju` (취얼스)

---

## 이 문서 사용법

- 피그마 섹션 하나가 이 문서의 장 하나다. **`0. 디자인 시스템`부터 시작하고, 섹션을 하나 볼 때마다 장을 하나씩 덧붙인다.**
- 각 장은 같은 순서로 쓴다: **요약 표 → 항목별 "현재 / 시안 / 바꿀 것" → 결정이 필요한 것 → 작업 체크리스트**.
- 우선순위:
  - **P0**: 여러 화면에 번지는 것(토큰, 공통 컴포넌트). 화면 작업보다 먼저 한다.
  - **P1**: 컴포넌트 하나 안에서 끝나는 시각 차이.
  - **P2**: 상태 추가, 다듬기. 시안에는 있지만 아직 쓰는 화면이 없는 것.
- 🔶 표시는 **디자이너나 백엔드에게 확인을 받아야 진행할 수 있는 항목**이다. 개발자가 혼자 정하지 않는다.
- 시안 수치는 `get_design_context`가 돌려준 값이다. 이 문서의 노드 ID로 다시 열어 확인할 수 있다.

---

## 0. 디자인 시스템 (`00 · 디자인 시스템`, node `373:10164`)

읽은 날: 2026-11-14. 비교 대상: `src/styles/tokens.css`, `src/components/**`.

토큰 층은 2026-11-02에 이 섹션에서 옮겨 왔다(`tokens.css` 머리 주석 참고). 그 뒤로 **시안이 컴포넌트 쪽에서 많이 바뀌었다.** 색 변수 값은 그대로지만, 상태(hover/focus/disabled)가 추가됐고, 컴포넌트 4종(`Received Requests`, `Sent Requests`, `Hastag` 상태 2개, `Iconoir`)이 새로 생겼으며, 브랜드 고양이 자산이 벡터에서 3D 렌더 이미지로 바뀌었다.

> **결정 반영 (2026-11-14).** 0.6의 D0-1~D0-9 중 D0-7을 뺀 나머지가 정해졌다. 아래 본문은 그 결정을 반영해 고쳐 두었다. 결정과 근거는 0.6 표에 있다.

### 0.1 요약

| # | 대상 | 피그마 노드 | 코드 | 상태 | 우선순위 |
|---|---|---|---|---|---|
| 0.2.1 | 색·간격·모서리·그림자 토큰 | 변수 | `styles/tokens.css` | ✅ 일치 | — |
| 0.2.2 | 타이포 자간(H3, Label/Small) | 텍스트 스타일 | `styles/tokens.css` | ⚠️ 단위 오해석 | **P0** |
| 0.3.1 | Button | `353:9626` | `ui/action.ts` | ⚠️ hover/focus 없음, Secondary 글자 크기 다름, Ghost 다름 | **P0** |
| 0.3.2 | Field / Select | `332:5729` | `ui/field.tsx` | ⚠️ 커스텀 드롭다운이 새로 생김 → **listbox로 교체** | P1 |
| 0.3.3 | Choice | `332:6032` | `ui/choice.tsx` | ⚠️ 체크 아이콘 없어짐, 연필 아이콘 생김 → **체크 제거, 연필은 수정 화면에서만** | P1 |
| 0.3.4 | Checkbox | `332:6136` | `routes/onboarding/terms.tsx` `CheckRow` | ⚠️ Disable 상태가 새로 생김 | P2 |
| 0.3.5 | Social | `332:6152` | `google-sign-in-button.tsx`, `login.tsx` | ✅ 의도적으로 다름(GIS 버튼) | — |
| 0.3.6 | Contact choice | `338:7636` | `applications/$applicationId.tsx` `ContactChoice` | ⚠️ hover 색, focus 두께 | P1 |
| 0.3.7 | Header | `353:9429` | `layout/site-header.tsx` | ⚠️ 데스크톱 로고 크기, 로고 자산 | P1 |
| 0.3.8 | Footer | `353:9657` | `layout/site-footer.tsx` | ✅ 일치 | — |
| 0.3.9 | Employee badge | `354:9525` | `employee-badge.tsx`, `mentors.tsx` | ⚠️ 띠의 인장 교체, 부서 줄 추가(BE 필드 없음), CTA 상태 없음 | P1 🔶 BE |
| 0.3.10 | Profile row / Profile identity | `332:5713` / `410:5945` | `ui/profile-row.tsx`, `ui/profile-identity.tsx` | ⚠️ 이름표 칸 폭 96 ↔ 112 | P2 (화면 장에서 결정) |
| 0.3.11 | Signup step / progress | `476:5165` / `476:5241` / `486:5821` | `signup-progress.tsx` | ✅ 일치 | — |
| 0.3.12 | Hastag | `875:30520` | `ui/tag-input.tsx` 안쪽 | ⚠️ Focused·Candidate 상태 없음, 공통 칩이 없음 → **4상태 모두 만들어 둠** | **P0** (0.4가 의존) |
| 0.3.13 | Brand / Cat cheers | `253:464` | `assets/brand/cat-cheers.svg` | ⚠️ 벡터 → 3D 렌더 이미지 → **3D로 진행** | P1 |
| 0.3.14 | Brand / Credential reverse | `398:5927` | 없음(랜딩 `badge-scene.png`에 구워짐) | — 랜딩 장에서 다룸 | — |
| 0.4.1 | **Received Requests** (신규) | `1237:10977` | `ui/request-item.tsx` | ❌ 구조가 바뀜 | **P0** 🔶 BE |
| 0.4.2 | **Sent Requests** (신규) | `1237:11072` | `ui/request-item.tsx` | ❌ 구조가 바뀜 | **P0** 🔶 |
| 0.4.3 | **Iconoir** 아이콘 세트 (신규) | `920:41347` | `assets/icons/*.svg` | ⚠️ 출처·이름 정리 | P2 |
| 0.5 | shadcn 잔재 | — | `ui/button·input·label·separator.tsx`, `tokens.css` 다리 블록 | 🧹 안 쓰임, 삭제 | P1 |

---

### 0.2 토큰

#### 0.2.1 색·간격·모서리·그림자 — 일치 ✅

`get_variable_defs(373:10164)`로 다시 읽은 변수 30여 개가 `tokens.css`의 대조표와 **값까지 모두 같다.** 바꿀 것 없다.

- 색 20개(`v05-text-*`, `v05-bg-*`, `v05-border-*`, `v05-action-*`, `brand-*`, `bg-champagne`)
- `space-0~8`은 Tailwind 기본 스케일과 같다(토큰을 따로 두지 않는 방침 유지)
- `radius-sm/md/lg = 4/8/12`, `radius-full = 999`
- `Elevation/Work surface`, `Shadow/Employee badge`

`--color-subtle`(#fff0e1)은 이 섹션 변수에는 없다. 명함 첨부 화면(`960:9646`)에서 들어온 값이므로 그 화면 장에서 확인한다.

#### 0.2.2 자간 단위 — **P0**

피그마 텍스트 스타일의 `letterSpacing`은 **스타일마다 단위가 다르다.** 어떤 스타일은 px이고 어떤 스타일은 %(글자 크기의 백분율)다. `get_variable_defs`는 숫자만 주고 단위는 알려 주지 않는다. 그래서 2026-11-02에 토큰을 옮길 때 전부 px로 읽었고, % 스타일 두 개가 틀렸다.

`get_design_context`가 실제 노드에 적용한 값과 대조해서 단위를 확인했다.

| 스타일 | 변수 값 | 노드에 적용된 값 | 단위 | 현재 토큰 | 바꿀 값 |
|---|---|---|---|---|---|
| Heading/H3 (20) | -0.5 | `-0.1px` (헤더 워드마크, 받은 신청 이름) | **%** | `-0.03125rem` (-0.5px) | **`-0.005em`** |
| Label/Small (12) | 0.2 | `0.024px` (푸터, 단계 표시, Profile identity) | **%** | `0.0125rem` (+0.2px) | **`0.002em`** |
| Task/Person (28) | -0.8 | `-0.8px` | px | `-0.05rem` | 유지 |
| Badge/* mobile | -0.3 ~ -0.7 | 같은 px 값 | px | 일치 | 유지 |
| Brand/Micro (10) | 1 | `1px` | px | 일치 | 유지 |
| Heading/Screen (28) | -2 | `-0.56px` (약관 다이얼로그 제목, 01장) | **%** | `-0.125rem` (-2px) | **`-0.02em`** |
| Heading/H2 (24) | -0.8 | `-0.192px` (모바일 약관 다이얼로그 제목, 01장) | **%** | `-0.05rem` (-0.8px) | **`-0.008em`** |
| Display/Hero · Brand/Statement · Task/Title (두 폭) | -3.3 / -1.9 · -1.8 / -1 · -1.4 / -1 | 같은 px 값 (01장) | px | 일치 | 유지 |

- % 스타일은 **`em`으로 적는다.** -0.5% = -0.005em이다. em으로 적으면 글자 크기가 바뀌어도 비율이 유지되므로 피그마의 의미와 같다.
- 이 섹션에 나오지 않는 스타일(H1, Display/Page)은 **아직 확인하지 않았다.** (H2, Screen, Display/Hero, Statement, Task/Title은 01장 `2026-11-14-figma-sync-01-start-login-terms.md` 1.2에서 확인했다.) 각 스타일이 처음 나오는 화면 장에서 같은 방법(노드에 적용된 px ÷ 글자 크기)으로 단위를 확인하고, 이 표에 행을 추가한다.
- 차이는 0.4px 안팎이라 눈으로는 거의 보이지 않는다. 그래도 P0로 두는 이유는 토큰이 모든 화면에 퍼져 있어서 나중에 고치면 전부 다시 비교해야 하기 때문이다.

```css
/* tokens.css — 바꿀 곳 */
--text-h3--letter-spacing: -0.005em;       /* Heading/H3 -0.5% */
--text-label-sm--letter-spacing: 0.002em;  /* Label/Small +0.2% */
```

`tokens.css` 머리의 "피그마 letterSpacing 은 px" 주석도 **"스타일마다 px 또는 %. 표 0.2.2 참고"**로 고친다.

---

### 0.3 기존 컴포넌트

#### 0.3.1 Button (`353:9626`) → `ui/action.ts` — **P0**

시안은 Primary / Secondary / Ghost 3종에 상태 5개(Default / Hover / Focus / Pressed / Disabled)를 그렸다. **Hover와 Pressed는 같은 모양이다.** 코드는 Default와 Primary Disabled만 있다.

| | Default | Hover = Pressed | Focus | Disabled |
|---|---|---|---|---|
| **Primary** | `bg-action` / `text-ink-inverse` | `bg-action-hover` | `bg-action` + **2px `border-focus`** | `bg-muted` / `text-ink-soft` |
| **Secondary** | `bg-surface` + 1px `border-line` / `text-ink` | `bg-canvas` + 1px `border-line` | `bg-surface` + **2px `border-focus`** | `bg-muted` + 1px `border-line` / `text-ink-soft` |
| **Ghost** | `bg-surface` / `text-ink` | `bg-muted` | `bg-surface` + **2px `border-focus`** | `bg-muted` / `text-ink-soft` |

공통: 높이 52(`h-13`), `px-4 py-3`, `gap-2`, `rounded-md`, 글자 **Web/Button 16 Medium**(세 종류 모두).

**현재 코드와 다른 점**

1. **Secondary 글자 크기.** `action.ts`가 Secondary에 `text-label`(14)을 붙이고 있다. 시안은 세 종류 모두 16이다. 그래서 호출부 두 곳(`onboarding/mentor/verify.tsx:369`, `applications/$applicationId.tsx:557`)이 `text-button`으로 다시 덮어쓰고 있다. → `text-label`을 빼고, 덮어쓰는 호출부도 정리한다.
   - 단, `w-25 lg:w-26`으로 폭을 고정한 `이전` 버튼 3곳(`*/extra.tsx`, `student/verify.tsx`)은 16px에서 줄이 넘치지 않는지 확인한다.
2. **Hover/Pressed가 없다.** `hover:` 와 `active:` 를 같은 값으로 단다.
3. **Focus가 없다.** 2px 테두리는 자리를 밀어내므로 `Field`와 같은 방식(`ring-2 ring-inset ring-focus`, 또는 테두리 1px + 안쪽 링 1px)으로 낸다. `focus-visible:` 만 쓴다(마우스 클릭으로 링이 뜨지 않게).
4. **Ghost.** 시안에 그려진 Default 바탕은 `bg-surface`(흰색)이지만, 컴포넌트 설명은 *"transparent contextual ghost"* 다.
   - ✅ **결정(D0-1): 바탕을 투명하게 둔다.** 놓인 바탕(랜딩 `routes/index.tsx:104`는 캔버스)을 그대로 보여 준다. 코드는 지금처럼 Default에 배경 클래스를 주지 않는다. Hover·Pressed·Disabled의 `bg-muted`만 더한다.
5. **Secondary Disabled가 없다.** 지금 쓰는 곳은 없지만 상태 묶음을 맞춰 둔다.

```ts
// action.ts 방향 (클래스 이름은 예시)
const focus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus";
primary:   `bg-action text-ink-inverse hover:bg-action-hover active:bg-action-hover ${focus} disabled:bg-muted disabled:text-ink-soft`,
secondary: `bg-surface border border-line text-ink hover:bg-canvas active:bg-canvas ${focus} disabled:bg-muted disabled:text-ink-soft`,
ghost:     `text-ink hover:bg-muted active:bg-muted ${focus} disabled:bg-muted disabled:text-ink-soft`,
```

> 컴포넌트 설명의 *"Bright orange and champagne are brand colors, not low-contrast label backgrounds"* 도 지킨다. 0.3.6의 `hover:bg-champagne`이 이 규칙에 어긋난다.

#### 0.3.2 Field / Select (`332:5729`) → `ui/field.tsx` — P1

5개 상태(Empty / Filled / Focus / Error / ReadOnly)는 **코드와 일치한다.** 라벨 Label/Medium, 입력 52px·`px-4 py-3.5`, placeholder `text-ink-soft`, 오류 테두리·문구 `danger`, ReadOnly `bg-canvas`. 포커스를 2px 테두리 대신 안쪽 링으로 내는 현재 방식도 그대로 둔다.

**새로 생긴 것: `select` + `dropdown` 속성.** Filled·Focus 상태에 커스텀 옵션 목록이 그려져 있다(`862:17197`, `875:25360`).

- 목록: `bg-surface`, 1px `border-control`, `rounded-md`, 그림자 `0 2px 5px rgba(0,0,0,.15)`. 입력 칸 위를 덮는다(`top: 28px`, 라벨 바로 아래).
- 옵션 한 줄: 높이 51, `px-4 py-3.5`, Body/Medium, 줄 사이 1px `border-control`.
- 키보드로 가리킨 옵션(Focus 쪽): 2px `border-focus`, `rounded-[2px]`.
- 오른쪽 위에 쐐기(chevron)가 위로 뒤집혀 있다.

현재 `Select`는 **네이티브 `<select>`** 다(`field.tsx` 주석에 이유가 적혀 있다). 네이티브 select는 목록 모양을 바꿀 수 없다.

✅ **결정(D0-3): listbox로 바꾼다.**

- **직접 만들지 않는다.** 이미 의존성에 있는 `@base-ui/react/select`를 쓴다(`node_modules/@base-ui/react/select` 있음). 키보드 이동, 타이핑으로 찾기, `aria-activedescendant`, 바깥 클릭으로 닫기, 스크롤 고정이 들어 있다. `field.tsx` 주석에 적힌 "목록을 직접 그리면 키보드·포커스·모바일 스크롤을 전부 다시 만들어야 한다"는 걱정이 이렇게 해결된다. 그 주석도 함께 고친다.
- **사용처는 지금 한 곳이다.** `features/profile/student-fields.tsx:70`의 `학과` 칸(온보딩 학생 기본 정보와 `/me/edit`가 같이 쓴다). 지금은 `react-hook-form`의 `Controller`로 `value`/`onChange(e)`를 넘기고 있다. 새 컴포넌트는 `value` / `onValueChange(value)` 형태가 되므로 호출부도 같이 바꾼다. 빈 값을 `null`로, 선택한 값을 `Number`로 바꾸는 처리는 그대로 둔다.
- **API 방향.** `<option>` 자식 대신 데이터를 받는다. 학과 목록이 서버 데이터라서 이쪽이 단순하다.

```tsx
<Select
  label="학과"
  placeholder="학과를 선택해 주세요"
  options={departments.map((d) => ({ value: String(d.id), label: d.name }))}
  value={field.value == null ? null : String(field.value)}
  onValueChange={(v) => field.onChange(v == null ? null : Number(v))}
  onBlur={field.onBlur}
  error={...}
/>
```

- **모양 대응.**

| 부분 | 시안 | 구현 |
|---|---|---|
| 트리거 | Field와 같은 상자 + 오른쪽 `Select chevron` 20 | `controlClass()`를 그대로 쓴다. Empty일 때 placeholder는 `text-ink-soft` |
| 열린 목록(Popup) | `bg-surface`, 1px `border-control`, `rounded-md`, `0 2px 5px rgba(0,0,0,.15)` | 그림자는 이 한 곳에서만 쓰므로 임의값으로 적는다. 다른 곳에서 또 쓰이면 토큰으로 올린다 |
| 목록 위치 | 라벨 바로 아래(`top: 28px`)에서 **트리거를 덮으며** 열린다. 오른쪽 위에 위로 뒤집힌 쐐기가 있다 | Base UI Select의 기본 동작(`alignItemWithTrigger`, 선택한 항목을 트리거 위에 겹쳐 연다)이 시안과 같다. 쐐기는 팝업 안 오른쪽 위에 절대 위치로 둔다 |
| 옵션 | 높이 51, `px-4 py-3.5`, Body/Medium `text-ink`, 줄 사이 1px `border-control`(마지막 줄 제외) | `[&:not(:last-child)]:border-b` |
| 가리킨 옵션 | 2px `border-focus`, `rounded-[2px]` | `data-highlighted:` 에 안쪽 링 2px. 자리가 밀리지 않게 한다 |
| 선택된 옵션 | 시안에 따로 없다 | `aria-selected`만 둔다. 모양은 더하지 않는다 |
| 높이 | 옵션 5개가 보이는 높이(255) | `max-h-[255px] overflow-y-auto`. 학과는 5개보다 많다 |

- **모바일.** 시안은 두 폭을 나누지 않았다. 같은 팝업을 쓰고, 화면 아래쪽에서 열 때 잘리지 않는지(Base UI가 자동으로 뒤집는지) 393px에서 확인한다.
- 폼 제출과 검증은 `react-hook-form`이 값으로 처리하므로 숨은 네이티브 `<select>`는 두지 않는다. 오류 연결(`aria-invalid`, `aria-describedby`)은 트리거에 단다.

#### 0.3.3 Choice (`332:6032`) → `ui/choice.tsx` — P1

| | 시안 | 코드 |
|---|---|---|
| 틀 | 44px, `px-2`, `gap-1`, `rounded-md`, 1px 테두리 | 같음 |
| Off | `bg-surface` `border-line` `text-ink` | 같음 |
| On | `bg-champagne` `border-brand` `text-brand` | 같음 |
| On 아이콘 | **없음.** `edit` 속성이 켜지면 라벨 **오른쪽**에 `edit-pencil` 14px | 라벨 **왼쪽**에 체크 14px |

컴포넌트 설명은 여전히 *"선택 상태는 … 체크 아이콘으로 함께 표시"* 라고 적혀 있는데, 그림에서는 체크가 빠졌다. 설명과 그림이 서로 다르다.

✅ **결정(D0-2): 체크 아이콘을 뺀다.**

- `choice.tsx`에서 체크 `<img>`와 `check-brand.svg` import를 지운다. `check-brand.svg`는 다른 사용처가 없으므로 파일도 지운다.
- 체크가 빠져도 선택 상태는 색만으로 구분되지 않는다. 테두리가 `line`(#e8ddcf)에서 `brand`(#965a15)로 바뀌어 **명도 차이가 크고**, 글자색도 `ink`에서 `brand`로 바뀐다. 보조기술에는 지금처럼 `aria-pressed`로 알린다. 컴포넌트 머리 주석에 인용된 "체크 아이콘으로 함께 표시" 문장은 지금 시안과 다르므로 지우고 이 근거로 바꾼다.

✅ **결정(D0-2, 위임받음): 연필(`edit`)은 "이미 저장된 값을 고치는 화면"에서 선택된 칩에만 켠다.**

- 켜는 곳: **`/me/edit`(마이페이지 · 정보 수정)** 의 관심 분야 칩과 연락 설정 칩.
- 끄는 곳: 온보딩(`/onboarding/*/profile`, `*/extra`). 처음 고르는 화면이라 "고친다"는 뜻이 맞지 않는다.
- 이유: 연필이 선택된 칩에만 붙는 것은 "선택"이 아니라 **"이건 지금 저장된 값이고, 여기서 바꿀 수 있다"** 는 뜻으로 읽힌다. 그 뜻이 맞는 곳은 저장된 값을 불러와 고치는 화면뿐이다. 이렇게 하면 같은 칩 컴포넌트를 쓰더라도 사용자가 온보딩 중인지 수정 중인지를 칩 모양만 보고 알 수 있다.
- 구현:
  - `Choice`에 `edit?: boolean`(기본값 `false`)을 추가한다. `selected && edit`일 때만 라벨 **오른쪽**에 14px 칸을 두고 Iconoir `edit-pencil`(Regular, `1111:9893`)을 넣는다. 아이콘은 꾸밈이므로 `alt=""`.
  - 아이콘은 Choice 안의 인스턴스(`1111:9899`)에서 받은 SVG를 손대지 않고 쓴다(0.4.3 규칙). 색이 `text-brand`와 다르면 받은 색 그대로 둔다. 파일 이름은 색에 맞춰 `assets/icons/edit-pencil-brand.svg` 같은 꼴로 짓는다.
  - `features/profile/student-fields.tsx`의 관심 분야·연락 설정 필드에 `editing?: boolean` prop을 받아 `Choice edit={editing}`로 넘긴다. `/me/edit`만 `editing`을 넘긴다. 선배 쪽(`mentor-fields.tsx`)에 Choice가 생기면 같은 규칙을 따른다.
- 화면 장에서 이 규칙과 다른 시안(예: 온보딩에 연필이 그려져 있음)이 나오면 그 장에서 이 결정을 다시 본다.

#### 0.3.4 Checkbox (`332:6136`) → `terms.tsx`의 `CheckRow` — P2

Off(22px, `rounded-sm`, 1px `border-line-strong`, `bg-surface`)와 On(`bg-ink-fill`, 흰 체크 20px)은 **코드와 일치한다.** 줄 높이 48, `gap-3`, 라벨 Body/Small, 오른쪽 chevron 옵션도 이미 있다.

**새로 생긴 것: `Selected=Disable`(`943:10132`).** 상자 안에 대각선이 그어진 모양이다(벡터 자산 하나).

- 쓰는 화면이 정해지면 `CheckRow`에 `disabled` prop을 추가한다. 네이티브 `disabled`를 주고, 대각선 자산은 `get_design_context(943:10134)`로 받는다.
- 이 단계에서 `CheckRow`를 공통 컴포넌트로 올린다(두 번째 사용처가 생기는 시점이 이때다).
- 포커스 링이 지금 `ring-focus/50 ring-3`이다. 시안에는 체크박스 포커스 상태가 없다. 다른 컴포넌트와 맞춰 `ring-2 ring-focus`로 통일하는 것을 권한다.

#### 0.3.5 Social (`332:6152`) — 변경 없음 ✅

시안: Google(흰 바탕, `border-line`, `rounded-lg`, 56px, Label/Large) / Kakao·Naver(`bg-muted`, `text-ink-faint`, 오른쪽 `준비 중`).

현재 코드는 **구글이 그린 GIS 버튼을 그대로 쓴다.** `google-sign-in-button.tsx` 주석에 이유가 있다. 시안 버튼 위에 투명한 GIS를 덮으면 재로그인 때 클릭이 버려진다(클릭재킹 방지 때문). 이 결정은 유지한다. **Social 컴포넌트를 시안대로 다시 그리지 않는다.** Kakao·Naver는 `login.tsx`에서 숨김 처리되어 있다(설계 5.3 "Google만 활성화"). 다시 보이게 할지는 로그인 화면 장에서 정한다.

#### 0.3.6 Contact choice (`338:7636`) → `ContactChoice`, `CHOICE_ACTION` — P1

| | 시안 | 코드 |
|---|---|---|
| 카드 | `bg-surface` 1px `border-line` `rounded-lg` `p-6` `gap-3`, 그림자 Work surface | 확인 후 맞춤 |
| 버튼 | Secondary Button 그대로(52px, 16 Medium) | `action({variant:"secondary"}) + text-button` |
| 버튼 Hover | **`bg-canvas`** | `hover:bg-champagne` ❌ |
| 버튼 Focus | **2px `border-focus`** | `ring-1` + 테두리색 |
| 카드 Focus | 그림자 없음 | — |

- 0.3.1에서 Secondary에 hover·focus가 들어가면 `CHOICE_ACTION`에서 `hover:bg-champagne`와 포커스 클래스를 **지운다.** 이 버튼은 Secondary 그대로다. 따로 상태를 붙이지 않는다.
- 그림자는 `shadow-work`를 쓴다(시안의 `0 2 4 rgba(34,32,28,.04)`는 Work surface를 CSS drop-shadow로 옮긴 값이다).

#### 0.3.7 Header (`353:9429`) → `layout/site-header.tsx` — P1

골격·메뉴·여백(모바일 min-h 60 / `px-5`, 데스크톱 min-h 72 / `px-24`, `py-3.5`, `gap-6`), 메뉴 Label/Medium, 모바일 2줄 배치, 구분선 위치는 **모두 일치한다.**

다른 점:
1. **데스크톱 로고 마크 크기.** 시안은 모바일 32×27.29, **데스크톱 40×34.12**다. 코드는 두 폭 모두 `w-8`이다. → `w-8 lg:w-10`. `width`/`height` 속성도 데스크톱 기준으로 다시 준다(CLS 방지, 성능 가이드 P0-2).
2. **로고 자산이 바뀌었다.** 0.3.13 참고.
3. 워드마크 `취얼스`의 자간은 0.2.2를 고치면 자동으로 맞는다(-0.1px).

#### 0.3.8 Footer (`353:9657`) — 일치 ✅

배치·글자·색·여백이 모두 같다. 법적 링크가 `<a>`가 된 것(이슈 반영)은 시안과 같은 모양을 유지하므로 문제없다. 단 `site-footer.tsx`의 "아직 누를 수 없는 글자다" 주석은 지금 상태와 맞지 않으니 고친다.

#### 0.3.9 Employee badge (`354:9525`) → `employee-badge.tsx`, `mentors.tsx` — P1 🔶

카드 본체(ID-1 비율, `--u` 배율, 글자 두 벌)는 **현재 구현과 일치한다.** 데스크톱 값(로고 118×42, `pt-44 px-28`, 띠 72, `cheers!` 22px)이 모바일 값 × 1.689와 맞는 것도 확인했다.

다른 점:

1. **띠 오른쪽 인장(brand seal)이 바뀌었다.**
   - 코드: `brand-seal.svg`, 18.94×16.16, `left 137.35 / top 13.62`(모바일 단위).
   - 시안: **3D 고양이(`Cheers / Brand / Cat cheers` 인스턴스)**, 31.83×27.15, `left 127.12`, 세로 가운데. 0.3.13과 같은 자산이다.
   - → 0.3.13의 새 자산으로 바꾸고 위치·크기를 시안 값(`--u` 단위)으로 옮긴다.
2. **부서 줄이 새로 생겼다(`showDepartment`, 기본값 꺼짐).** 회사명 아래에 놓인다. 데스크톱은 13/20 Regular, 모바일은 10px `DemiLight(350)`.
   - 🔶 **BE 필드가 없다(D0-5).** 2026-11-14에 `bun run api:sync`로 스테이징 OpenAPI를 다시 받아 DTO를 맞췄다(이번에 추가된 것은 어드민 감사·열람 로그 API뿐이다. `check-dto-drift` 통과). 그래도 `CheersCardDto`(`GET` 선배 카드 목록)에는 부서 필드가 없다. 선배 본인 프로필(`GraduatedProfileDto`)에는 `department`가 있으므로 데이터는 서버에 있다. → **백엔드에 `CheersCardDto.department: string | null` 추가를 요청한다.**
   - 추가되기 전에도 FE 작업은 막히지 않는다. `EmployeeBadgeData`에 `department?: string`을 두고, 값이 있을 때만 줄을 그린다. 시안의 `showDepartment` 스위치는 이 "값이 있느냐"로 대신한다.
   - 모바일 10px/350은 토큰이 없는 값이다. 이 카드 안에서만 쓰므로 다른 카드 글자처럼 임의값으로 적는다.
3. **카드 밖 `Request action`(커피챗 신청)에 상태가 없다.** `mentors.tsx`의 `REQUEST_ACTION`.
   - Hover: `bg-canvas`
   - Focus: 2px `border-focus`(위쪽 1px 테두리 대신 사방 2px)
   - → `hover:bg-canvas focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus focus-visible:outline-none`
   - 카드 자체의 Hover/Focus 변형은 **본체가 Default와 똑같다.** 상태는 CTA에만 있다.

#### 0.3.10 Profile row (`332:5713`) / Profile identity (`410:5945`) — P2

- **Profile identity: 일치 ✅** (`pt-3 pb-6`, `gap-1`, Label/Small + Task/Person, 아래 구분선)
- **Profile row: 디자인 시스템 원본과 코드 변형의 값이 다르다.**
  - 원본: 이름표 칸 **96px**, `gap-4`, `py-2.5`, Body/Small → Body/Medium.
  - 코드: 이름표 칸 **112px**(`w-28`) 고정, 크기 변형 4개(`compact`/`card`/`comfortable`/`document`). 각 화면 인스턴스에서 옮겨 온 값이다.
  - → **이 장에서는 바꾸지 않는다.** 화면 인스턴스가 원본을 덮어쓰고 있을 수 있기 때문이다. 각 화면 장에서 그 화면의 Profile row 이름표 칸이 96인지 112인지 확인하고, 모든 화면이 96으로 바뀌었으면 `w-28` → `w-24`로 바꾼다.

#### 0.3.11 Signup step / progress — 일치 ✅

`Building blocks / Signup step`(3상태), Desktop 4변형, Mobile 4변형이 `signup-progress.tsx`와 색·크기·글자·`✓` 표기까지 같다. 바꿀 것 없다.

#### 0.3.12 Hastag (`875:30520`) → 공통 칩으로 분리 — **P0**

시안 상태 4개:

| 상태 | 모양 | 용도(추정) | 코드 |
|---|---|---|---|
| **Complete** | `bg-muted` `rounded-md` `px-2.5 py-1` `gap-1`, Body/Small `text-brand`, `#` + 값, 모바일에서만 ✕(16×20) | 확정된 태그 | `tag-input.tsx` 안에 있음. `pr-1`만 다름 |
| **Processing** | 배경 없음, Body/Medium `text-ink`, `#` + 입력 중 글자 | 입력 중 | `tag-input.tsx` 안에 있음 |
| **Focused** (신규) | Complete와 같은데 바탕만 `bg-champagne` | 키보드로 칩을 가리킨 상태(Backspace를 한 번 누르면 지울 칩을 표시) 🔶 | 없음 |
| **Candidate** (신규) | `bg-champagne` **`rounded-full`** `px-2.5 py-1`, Body/Small `text-brand`, 그림자 `1px 2px 2px rgba(0,0,0,.15)` | 자동완성 후보 🔶 | 없음 |

- 0.4.1·0.4.2의 신청 카드와 사원증 꼬리표에서 **읽기 전용 칩(Complete, ✕ 없음)** 이 쓰인다. 사용처가 둘을 넘으므로 `ui/hashtag.tsx`로 올린다.

```tsx
// 방향
<Hashtag value="연구인턴" />                       // Complete, 읽기 전용
<Hashtag value="연구인턴" onRemove={...} />         // Complete + ✕
<Hashtag value="연구인턴" focused onRemove={...} /> // Focused
<Hashtag value="연구인턴" variant="candidate" />    // Candidate
```

- ✕를 두 폭 모두에 두는 현재 결정(`tag-input.tsx` 주석)은 유지한다. 데스크톱에서도 마우스로 지울 방법이 있어야 한다.
- Complete 오른쪽 여백을 시안대로 `px-2.5`로 맞추고, ✕ 자리는 `gap-1`로 띄운다.
- ✅ **결정(D0-9): 4상태를 지금 모두 만들어 둔다.** Focused와 Candidate를 어느 화면에서 어떤 동작(키보드로 칩 가리키기, 자동완성 후보)에 연결할지는 남은 섹션을 진행하면서 정한다. 그때까지는 `tag-input.tsx`가 Complete와 Processing만 쓴다.
  - 연결 전에도 `src/dev/tokens.tsx`에 4상태를 나란히 그려 두어 시안과 비교할 수 있게 한다.
  - Candidate의 그림자(`1px 2px 2px rgba(0,0,0,.15)`)는 이 칩에서만 쓰므로 임의값으로 둔다.

#### 0.3.13 Brand / Cat cheers (`253:464`) — P1

- 코드: `assets/brand/cat-cheers.svg`. 2D 벡터 고양이다(32×27.29). 헤더와 `me.tsx`가 쓴다.
- 시안: **3D 렌더 PNG(`popo-cheers-front-2048`) + 그 뒤의 벡터 그림자(`bgShadow` 속성)** 를 겹친 구성. 원본은 340×290이다. 헤더(32/40), 사원증 인장(0.3.9), 뒷면(0.3.14)에서 같은 자산을 쓴다.
- 컴포넌트 설명에는 *"editable vector UI용 **임시** 브랜드 자산"* 이라고 적혀 있다. ✅ **결정(D0-4): 지금의 3D 고양이로 진행한다.** 나중에 자산이 또 바뀌어도 아래 3번처럼 `BrandCat` 하나만 고치면 되도록 감싸 둔다.

교체할 때(성능 가이드 `2026-11-14-rendering-performance-guideline.md`와 맞춘다):
1. `get_design_context(253:464)`가 주는 PNG와 그림자 SVG를 `assets/brand/`에 받는다. 임시 URL을 코드에 남기지 않는다.
2. 2048px PNG를 그대로 쓰지 않는다. `vite-imagetools`로 **쓰는 크기의 2배(헤더 80w, 인장 ~110w)** WebP를 만든다.
3. 그림자 SVG와 PNG를 겹치는 구조는 `BrandCat` 컴포넌트 하나로 감싼다. 헤더, 사원증, `me.tsx`가 모두 그 컴포넌트를 쓴다.
4. 그 뒤 `cat-cheers.svg`와 `landing/brand-seal.svg`를 지운다(다른 사용처가 없는 것은 확인했다).

#### 0.3.14 Brand / Credential reverse (`398:5927`)

사원증 뒷면이다. 코드에는 컴포넌트로 없고 랜딩의 `badge-scene.png`에 그려져 있다. 랜딩 장에서 다룬다. 메모: `Brand/Poster`(Geist Bold 70) 글꼴이 여기서 쓰인다. 지금은 Geist 700 latin을 이미 받고 있다(`index.css`).

---

### 0.4 새로 생긴 컴포넌트

#### 0.4.1 Received Requests (`1237:10977`) — **P0** 🔶 BE

선배의 **받은 신청 목록** 행이다. 현재 `RequestItem`(옛 `Cheers / Request item` `332:5717`)과 구조가 다르다. **`332:5717`은 이 섹션에서 사라졌다.**

```
┌──────────────────────────────────────────────────────── 24 ┐
│ 김후배  2026.10.12 신청                                  │
│ 학과       전기전자컴퓨터공학부                       ›  │
│ 관심 분야  AI/데이터, 연구/R&D, 경영                    │
│ #연구인턴  #SAP  #인포팀                                 │
└────────────────────────────────────────────────────────────┘
```

| 부분 | PC | Mobile |
|---|---|---|
| 카드 | `bg-surface` 1px `border-line` **`rounded-lg` `p-6` `gap-6`** | 같음 |
| 이름 + 날짜 | 이름 H3(20/28), 날짜 **Label/Micro(11)** `text-ink-soft` `"YYYY.MM.DD 신청"`, `gap-2` 가로 | 같음 |
| 정보 행 | 이름표 80px `text-ink-soft` + 값 `text-ink`, 둘 다 Body/Medium 16, `gap-3` 가로 | 이름표 Label/Micro 위, 값 Body/Medium 아래로 **세로로 쌓는다** |
| 참여 활동 | 칩만 한 줄(`gap-2`), 이름표 없음 | 이름표 `참여 활동`(Label/Micro) + 칩 |
| 꼬리 | chevron 20 | 같음 |
| 커피 아이콘 | **없음** | 없음 |

현재와 다른 점:
- 커피 아이콘(`coffee.svg`)이 빠지고, 정보가 `학과 · 관심 분야` 한 줄에서 **정의 행 2개 + 칩 줄**로 바뀌었다.
- 시안의 제목은 `{이름}`뿐이다. ✅ **결정(D0-8): 제목은 지금처럼 `{이름}님의 신청`을 유지한다.** 시안과 다르게 두는 의도된 차이다. 이 줄의 글자 스타일(H3)과 날짜 배치만 시안을 따른다.
- 여백이 `px-4 py-5 / lg:p-7`에서 **두 폭 모두 `p-6`** 으로 바뀌었다.

🔶 **백엔드 의존(D0-6).** 2026-11-14에 OpenAPI를 다시 받아 맞췄지만(0.3.9-2와 같은 동기화) `ReceivedRequestDto`는 여전히 `id`, `student_name`, `department`, `student_withdrawn`, `status`, `created_at`뿐이다. **`interests`, `activities`가 없다.** 상세(`RequestStudentDto`)에는 둘 다 있지만, 상세를 조회하면 읽음 처리가 되므로 목록에서 상세를 불러 채울 수 없다(`applications.tsx` 주석, 가이드 §7 #13). → **백엔드에 목록 DTO에 `interests: string[]`, `activities: string[]` 추가를 요청한다.** 추가되기 전에는 값이 없으면 그 행을 그리지 않도록 만들어 둔다. 그러면 지금은 `학과` 한 줄만 나온다.

탈퇴한 학생 행(`student_withdrawn`)은 시안에 없는 상태다. 지금처럼 링크 없는 `<div>`와 chevron 없는 모양을 유지한다.

#### 0.4.2 Sent Requests (`1237:11072`) — **P0** 🔶

학생의 **보낸 신청 목록** 행이다. 카드 틀, 이름·날짜 줄, 정보 행, 칩 줄, chevron은 Received Requests의 **PC 변형과 같다.** 모바일 변형은 그려져 있지 않다.

🔶 **시안 내용 확인이 필요하다.** 예시 데이터가 `김선배` + `학과 / 관심 분야 / #연구인턴…`이다. 이건 학생의 정보이고, 보낸 신청 목록에 보여야 할 것은 **선배의 정보**(`RequestGraduatedDto`: `nickname`, `company`, `job`)다. Received Requests를 복사한 뒤 이름만 바꾼 것으로 보인다. 디자이너에게 아래를 확인한다.
1. 정보 행의 이름표와 값(예: `회사` / `직무`?)
2. 칩 줄을 두는가? 둔다면 선배 해시태그인가? 그렇다면 `RequestGraduatedDto`에 `hashtags`가 필요하다(BE).
3. 모바일에서 Received처럼 세로로 쌓는가?

**구현 방향.** 둘을 따로 만들지 않는다. `RequestItem`을 아래 모양으로 다시 짠다.

```tsx
<RequestItem
  applicationId?: string        // 없으면 누를 수 없는 행(지금과 같음)
  name: string
  date: string                  // ISO → "YYYY.MM.DD 신청"
  rows: { label: string; value: string }[]
  tags?: string[]               // 0.3.12 Hashtag(읽기 전용)
  tagsLabel?: string            // 모바일에서만 보이는 이름표(예: "참여 활동")
/>
```

- 정보 행은 `<dl>`로 그린다(Profile row와 같은 이유: 보조기술이 "학과: 전기전자…"로 읽는다).
- 모바일 세로 배치는 `flex-col lg:flex-row`로 처리한다. Sent에 모바일 시안이 없으므로 Received의 모바일 규칙을 같이 쓴다.
- `formatDate` 뒤에 `신청`을 붙이는 일은 호출부가 아니라 컴포넌트가 한다.

#### 0.4.3 Iconoir 아이콘 세트 (`920:41347`) — P2

시안에 **Iconoir** 아이콘 12종이 Dynamic / Regular / Solid 3가지 굵기로 들어왔다: `trash`, `media-image-plus`, `upload-square`, `page-plus`, `page-plus-in`, `page-minus`, `attachment`, `xmark-circle`, `search`, `plus`, `plus-circle`, `edit-pencil`.

현재 코드는 `assets/icons/`에 SVG를 하나씩 받아 `<img>`로 쓴다. `media-image-plus`, `plus`, `search-*`는 이미 이 세트에서 받은 것으로 보인다. 이 방식은 유지한다.

- **`iconoir-react` 패키지는 들이지 않는다.** 쓰는 아이콘이 열 몇 개뿐이고, 지금 방식이 번들과 렌더링(성능 가이드)에 더 가볍다.
- 새 아이콘은 **노드에서 받은 SVG를 손대지 않고** `assets/icons/<iconoir 이름>.svg`로 둔다. 굵기가 Regular가 아니면 `-solid`처럼 접미사를 붙인다.
- 색이 다른 같은 아이콘(`search-brand` / `search-neutral`, `check-*`)이 따로 있는 것은 `<img>` 방식의 한계다. 아이콘이 더 늘어나면 SVG를 `currentColor`로 바꾸고 인라인 컴포넌트로 옮기는 것을 검토한다. 지금은 하지 않는다.
- `lucide-react`는 쓰는 곳이 없다(shadcn 잔재와 같이 0.5에서 정리).

---

### 0.5 정리: shadcn 잔재 — P1

`ui/button.tsx`, `ui/input.tsx`, `ui/label.tsx`, `ui/separator.tsx`는 **import하는 곳이 없다**(2026-11-14 grep 결과). `tokens.css`의 "shadcn 다리" `@theme inline` 블록은 이 파일들 때문에 남겨 둔 임시 다리였다(설계 8절).

1. 네 파일을 지운다.
2. `tokens.css`의 shadcn 다리 블록(`--color-background` … `--color-ring`)을 지운다. 그 이름(`bg-primary`, `text-muted-foreground`, `ring-ring` 등)을 쓰는 곳이 남았는지 먼저 grep한다.
3. `lucide-react`, `shadcn` 의존성과 `components.json`, `index.css`의 `@import "shadcn/tailwind.css"`를 지워도 되는지 확인한다. `@base-ui/react`는 계속 쓴다.
4. `bun run build`로 깨지는 곳이 없는지 확인한다.

---

### 0.6 결정·확인이 필요한 것

결정일 2026-11-14.

| # | 질문 | 결정 | 남은 일 |
|---|---|---|---|
| D0-1 | Ghost 버튼 바탕 | ✅ **투명** | — |
| D0-2 | Choice 체크 아이콘 / `edit` 연필 | ✅ **체크 제거.** 연필은 FE가 정함: **`/me/edit`의 선택된 칩에만** (0.3.3) | — |
| D0-3 | Field 드롭다운 | ✅ **listbox**(`@base-ui/react/select`). 사용처는 `학과` 한 곳 (0.3.2) | — |
| D0-4 | 3D 고양이 자산 | ✅ **현재 3D 자산으로 진행** | — |
| D0-5 | 사원증 부서 필드 | 🔶 OpenAPI 동기화 후에도 **`CheersCardDto`에 없음** | **BE에 추가 요청** |
| D0-6 | 받은 신청 목록의 `interests`, `activities` | 🔶 OpenAPI 동기화 후에도 **`ReceivedRequestDto`에 없음** | **BE에 추가 요청** |
| D0-7 | 보낸 신청 행에 무엇을 보여 주는가(예시 데이터가 학생 정보) | ⏳ 미정 | 디자인 확인. 보낸 신청 화면 장에서 다시 본다 |
| D0-8 | 받은 신청 제목 | ✅ **`{이름}님의 신청` 유지** | — |
| D0-9 | Hastag Focused·Candidate | ✅ **4상태를 지금 만들어 둠.** 어디에 연결할지는 섹션을 진행하며 정함 | 각 화면 장 |

> Notion API 명세(`API-3f2365ea…`)는 로그인이 필요한 페이지라 이 환경에서 열리지 않았다. D0-5·D0-6은 스테이징 OpenAPI(`api.stg.cheers.gistory.me/api-docs-json`)를 기준으로 판단했다. Notion 명세에만 먼저 반영된 변경이 있다면 그쪽도 확인한다.

---

### 0.7 작업 체크리스트 (권장 순서)

> **구현 기록 (2026-11-14).** 아래 체크한 항목은 `42-sync-figma-design-service-policy` 브랜치 작업 트리에 반영했다(커밋 전). 구현하면서 정한 세부 사항:
> - Hashtag의 Processing 상태는 칩이 아니라 `TagInput`의 입력 칸이라 `Hashtag` 변형에 넣지 않았다(`complete` / `focused` / `candidate`).
> - 보낸 신청 행은 D0-7이 정해질 때까지 `회사` / `직무` 정의 행을 쓴다. 탈퇴한 선배는 행 대신 `note`로 "탈퇴한 선배"를 적는다.
> - 신청 행에는 시안에 없는 키보드 포커스 링을 두었다(hover 모양은 더하지 않았다).
> - 3D 고양이 PNG(1024² 정사각)는 시안처럼 340×290 틀에 **늘려서** 채운다. WebP 64w(2.3KB) / 128w(5.3KB).
> - `Field`의 ReadOnly 모양을 CSS `:read-only`가 아니라 `readOnly` prop으로만 건다. `:read-only`가 `<button>`(Select 트리거)에도 맞아서 빈 Select가 늘 ReadOnly처럼 보였다(리뷰에서 발견, 수정).
> - 해시태그 칩은 칸 폭을 넘으면 줄을 바꾼다. 참여 활동이 50자까지라 한 줄로 고정하면 393 카드 밖으로 나간다.
> - 남은 다듬기(미해결): Select 트리거의 `onBlur`가 목록을 열 때도 불린다(`error`를 연결하기 전에 고칠 것). Secondary 포커스가 1px 테두리 + 2px 링이라 시안의 2px보다 굵어 보인다.
> - shadcn 정리 때 쓰는 곳이 없는 `tw-animate-css`도 같이 지웠다. `coffee.svg`, `check-brand.svg`, `cat-cheers.svg`, `brand-seal.svg`도 사용처가 없어져 지웠다.

**선행(완료)**
- [x] `bun run api:sync`: 스테이징 OpenAPI로 `openapi.json`·`schema.gen.ts`를 다시 생성. drift 검사 통과. 바뀐 것은 어드민 로그 API 2개뿐 (D0-5·D0-6 확인용)

**BE 요청**
- [ ] `CheersCardDto.department` 추가 (D0-5)
- [ ] `ReceivedRequestDto.interests`, `.activities` 추가 (D0-6)

**P0: 화면 작업 전에 끝낸다**
- [x] `tokens.css`: H3·Label/Small 자간을 em으로 바꾸고 머리 주석 고치기 (0.2.2)
- [x] `action.ts`: 3종 × 5상태 맞추기(Ghost 바탕 투명), Secondary `text-label` 제거, 호출부의 `text-button` 덮어쓰기 정리 (0.3.1)
- [x] `ui/hashtag.tsx`: 4상태(Complete·Processing·Focused·Candidate) 만들기, `tag-input.tsx`가 이 컴포넌트를 쓰게 바꾸기, dev 토큰 페이지에 나란히 그리기 (0.3.12)
- [x] `RequestItem` 재설계(이름·날짜 / 정의 행 / 칩). 받은 신청 제목은 `{이름}님의 신청` 유지, BE 필드가 없으면 그 행을 숨기기 (0.4.1). 보낸 신청은 D0-7이 정해질 때까지 지금 정보(회사·직무)를 정의 행으로 옮기기만 한다 (0.4.2)

**P1**
- [x] `Select`를 `@base-ui/react/select` 기반 listbox로 바꾸고 `학과` 호출부 고치기 (0.3.2)
- [x] `Choice`에서 체크 제거, `edit` prop + `edit-pencil` 아이콘, `/me/edit`에서만 켜기 (0.3.3)
- [x] `ContactChoice` 버튼에서 개별 hover·focus를 지우고 Secondary 상태를 따르게 하기 (0.3.6)
- [x] 사원증 `Request action` hover·focus 추가 (0.3.9-3)
- [x] 헤더 데스크톱 로고 40px (0.3.7)
- [x] `BrandCat` 컴포넌트 + 3D WebP 자산으로 헤더·`me.tsx`·사원증 인장 교체, 옛 SVG 2개 삭제 (0.3.13, 0.3.9-1)
- [x] shadcn 잔재 4파일 + 다리 블록 + 쓰지 않는 의존성 정리 (0.5)
- [x] `site-footer.tsx`의 오래된 주석 고치기 (0.3.8)

**P2**
- [ ] 사원증 `department?` 줄 (0.3.9-2) — **보류.** D0-5와 함께 BE 답을 기다린다
- [x] `CheckRow` Disable 상태 + 공통화, 포커스 링 통일 (0.3.4)
- [ ] Profile row 이름표 칸 96 ↔ 112: 화면 장마다 확인 (0.3.10)

**검증**
- [x] `tsc -b`, `bun run lint`, `bun run build` 통과
- [x] `src/dev/tokens.tsx`(`/tokens.html`)에 버튼 3종 · 체크박스 3상태 · 해시태그 3변형을 추가하고 headless Chrome 스크린샷으로 시안과 비교했다. **Hover와 Tab 포커스는 사람이 직접 확인해야 한다.**
- [ ] 393 / 1440 두 폭에서 헤더, 신청 목록, 사원증 스크린샷을 시안과 나란히 비교 — 랜딩 헤더(3D 로고 40px)와 Ghost 버튼만 확인했다. 신청 목록·사원증·학과 listbox는 로그인이 필요해서 아직 못 봤다

---

## 다음 섹션

피그마의 나머지 섹션(화면들)은 **섹션마다 별도의 가이드라인 문서**로 쓴다. 이 문서는 디자인 시스템(섹션 `00`)만 다룬다. 화면 문서는 같은 형식(요약 표 → 항목별 현재/시안/바꿀 것 → 결정 필요 → 체크리스트)을 따르고, 이 문서의 0.6 결정(D0-*)과 0.2.2 자간 단위 표를 참조한다. 화면 문서에서 정해야 하는 것은 아래와 같다.

- 0.2.2: 이 섹션에 없던 텍스트 스타일(H1, H2, Screen, Display, Statement, Task/Title)의 자간 단위
- 0.3.10: Profile row 이름표 칸 96 ↔ 112
- 0.3.12 / D0-9: Hashtag Focused · Candidate를 붙일 화면
- 0.4.2 / D0-7: 보낸 신청 행 내용
