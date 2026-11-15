# 피그마 ↔ FE 동기화: 04 · 선배 탐색·커피챗 신청

작성일: 2026-11-14 (2026-11-15 결정 반영)
브랜치: `42-sync-figma-design-service-policy`
피그마: `figma.com/design/coVd5RXl0QhMXBVwOqlsju` (취얼스), 섹션 `04 · 선배 탐색·커피챗 신청` (node `375:15124`)
선행 문서:
- [`2026-11-14-figma-design-sync-guideline.md`](./2026-11-14-figma-design-sync-guideline.md) (0장 디자인 시스템). 형식, 우선순위(P0/P1/P2), 🔶 표기, 결정 번호(D0-*)는 그 문서를 따른다. 이 장은 0.3.9(사원증), 0.3.10(Profile row 이름표 칸), 0.4.3(Iconoir) 결정을 이어받는다.
- [`2026-11-14-figma-sync-02-student-signup-verify.md`](./2026-11-14-figma-sync-02-student-signup-verify.md) (2장). 2.6.4(첨부 여러 개 표시)의 "각 화면 모양은 04·05·06장에서 정한다"를 이 장에서 커피챗 신청 화면 몫만 정한다.
- [`2026-11-14-figma-sync-03-mentor-signup-verify.md`](./2026-11-14-figma-sync-03-mentor-signup-verify.md) (3장). 둘 다 끈 선배의 `can_request=false` 확인이 이 장의 화면에서 일어난다(3.6).

---

## 4. 선배 탐색·커피챗 신청

읽은 날: 2026-11-14. 기준 커밋은 `f738869`이다. 비교한 코드:
- 화면: `routes/_app/mentors.tsx`, `routes/_app/mentors/$mentorId/apply.tsx`, `routes/_app/mentors_/$mentorId/sent.tsx`
- 컴포넌트: `components/{employee-badge,employee-badge-data,completion-card}.tsx`, `components/ui/{responsive-dialog,profile-row}.tsx`
- 도우미: `features/profile/student-profile-rows.ts`, `features/profile/student-form.ts`(`studentSharedEmailOf`), `lib/attachments.ts`
- 참고: `routes/_app/applications/$applicationId.tsx`의 `AttachmentLink`(presigned URL 갱신)
- API: `api/openapi.json` (`CheersCardDto`, `CreateRequestDto`, `StudentAttachmentDto`)

**목록과 완료 화면은 거의 그대로 맞다.** 이번 섹션의 변화는 **커피챗 신청 대화상자**에 몰려 있다.
1. 상자가 커졌다(880×736 → **1000×720**). 안내 문구가 데스크톱에서는 **머리 제목 아래**로 올라갔다.
2. 맨 위 `{닉네임} 선배 / 회사 · 직무` 줄이 **선배 카드**(회사 로고 + 부서 + LinkedIn 링크)로 바뀌어 왼쪽 열 안으로 들어갔다.
3. `함께 전달되는 내 정보`의 설명 문구가 사라지고, 이력서·포트폴리오가 **파일마다 누를 수 있는 상자**로 바뀌었다. `수정` 링크 자리가 바뀌었다.
4. 질문 칸 높이 규칙이 생겼다(데스크톱 280 고정, 모바일 120부터 내용에 맞춰 160까지).

이 섹션에 있는 프레임:

| 프레임 | Desktop | Mobile | 코드 |
|---|---|---|---|
| 선배 둘러보기 · 학생 | `352:9466` | `352:9467` | `mentors.tsx` |
| 선배 둘러보기 · 선배 | `336:7652` | `336:7423` | 같음(`canApply=false`) |
| 커피챗 신청 | `336:7965`(대화상자 `336:7980`) | `336:7879`(대화상자 `336:7880`) | `mentors/$mentorId/apply.tsx` |
| 커피챗 신청 완료 | `337:7304` | `337:7217` | `mentors_/$mentorId/sent.tsx`, `completion-card.tsx` |

> 신청 데스크톱 프레임 안의 목록(`336:7966`)은 학생 목록을 복사한 배경이다. 비교하지 않는다.

### 4.1 요약

| # | 대상 | 피그마 노드 | 코드 | 상태 | 우선순위 |
|---|---|---|---|---|---|
| 4.2.1 | 둘러보기 머리·결과 제목·격자 간격 | `355:10094`, `355:10113` 외 | `mentors.tsx` | ✅ 일치 | — |
| 4.2.2 | 사원증 부서 줄 | `I355:10120;1202:45874` | `employee-badge.tsx` | ✅ 2026-11-15 반영 (D0-5 해결) | P2 |
| 4.2.3 | 선배 시점(신청 줄 없음, 설명 문구, 모바일 줄 간격 24) | `336:7652` / `336:7423` | `mentors.tsx` | ✅ 일치 | — |
| 4.3.1 | 대화상자 크기·머리 안내 문구·버튼 줄 구분선 | `336:7981`, `336:8018` | `responsive-dialog.tsx`, `apply.tsx` | ⚠️ 크기, 안내 위치, 데스크톱 구분선 | P1 |
| 4.3.2 | **선택한 선배 카드**(로고·부서·LinkedIn) | `1197:10107` / `1248:17975` | `apply.tsx:142-150` | ❌ 구조가 바뀜 | **P0** (부서 줄만 🔶 BE) |
| 4.3.3 | 질문 칸 높이·여백, FAQ 아이콘 | `336:7999` / `336:7899` | `apply.tsx:156-209` | ⚠️ 높이 규칙, 아이콘 없음 | P1 |
| 4.3.4 | 함께 전달되는 내 정보: 줄 순서·설명 삭제·빈 값 색·`수정` 링크 | `336:8005` / `1119:10741` | `apply.tsx:218-261`, `profile-row.tsx` | ⚠️ | P1 |
| 4.3.5 | **이력서·포트폴리오 파일 상자** | `1119:10695` / `1119:10752` | `apply.tsx:259`(`attachmentLabelsOf`) | ❌ 글자 한 줄 → 파일별 링크 상자 | **P0** (2.6.4 후속) |
| 4.4 | 신청 완료 | `337:7306` / `337:7219` | `sent.tsx`, `completion-card.tsx` | ✅ 일치(Ghost 위 간격만 다름) | P2 |

---

### 4.2 선배 둘러보기 → `mentors.tsx`

#### 4.2.1 머리·결과 제목·격자 — 일치 ✅

| | 시안 | 코드 |
|---|---|---|
| 머리 | 데스크톱 `pt-14 pb-8`, 모바일 `pt-8 pb-6`, 제목 Display/Page 36·모바일 Task/Title, 설명 Body/Medium `text-ink-soft`, `gap-3` | `mentors.tsx:54-65` 같음 |
| `Brand companion`(고양이) | **숨김**(`hidden`) | 그리지 않음 ✅ |
| 결과 제목 | `선배 사원증` Label/Large `text-ink` + 개수 Label/Medium `text-brand`, `gap-2` | `:70-73` 같음 |
| 격자 | 데스크톱 4열 `gap-x-8 gap-y-10` / 모바일 2열 `gap-x-3 gap-y-8` | `:91-96` 같음 |
| 선반 아래 | 데스크톱 `pb-16`, 모바일 `pb-12` | 같음 |
| 신청 줄(`Request action`) | 48 높이, 위쪽 1px 테두리, Label/Medium, 화살표 20, hover `bg-canvas`, focus 2px | `REQUEST_ACTION*` 같음(0.3.9-3에서 맞춤) |

시안의 숨은 머리말 `GIST 선후배 커피챗`(hidden)은 그리지 않는다. 바꿀 것 없다.

#### 4.2.2 사원증 부서 줄 — P2 (D0-5)

✅ **2026-11-15 반영.** `CheersCardDto.department`가 명세에 생겨(#46) `EmployeeBadgeData.department`로 넘긴다(`badgeDataOf`). 시안 `Company and Department`(`I355:10120;1202:46008` / `I355:10290;1204:46319`): 작은 카드 회사 12/18 Medium + 부서 10/18 DemiLight(350), 사이 0. 큰 카드 회사 13/20 Medium + 부서 13/20 Regular, 사이 4. `Company identity`는 시안대로 높이 93.538(큰 카드 158)을 최소 높이로 둬서 부서가 있든 없든 닉네임 선이 맞는다. 마이페이지 공개 사원증도 `GraduatedProfileDto.department`로 같은 줄을 그린다. 아래는 반영 전 기록이다.


시안의 사원증 4장 중 3장이 회사명 아래에 부서(`DA사업부`, `제네시스사업부`, `네트워크사업부`)를 보인다. 칩메이커 카드는 부서 없이 회사명만 있다. **"부서가 없으면 줄을 그리지 않는다"는 0.3.9-2의 규칙이 시안에서도 확인된다.**

- `CheersCardDto`에는 여전히 `department`가 없다. **2026-11-15에 `bun run api:sync`로 스테이징 명세를 다시 받아 확인했다.** `openapi.json`·`schema.gen.ts` 모두 바뀐 곳이 없고, `api:check`도 `dto.ts`와 일치(응답 DTO 31개 + 페이징 3개)로 끝났다. 필드: `graduated_id`, `nickname`, `company`, `company_logo_url`, `job`, `hashtags`, `links`, `last_active_at`, `can_request`.
  - 부서는 선배 **본인** 정보(`GraduatedProfileDto.department`)에만 있고, 다른 사람이 보는 카드 DTO로는 내려오지 않는다.
  - BE에는 사용자가 직접 알린다(4.5 D0-5).
- 3장에서 부서가 **선택 입력**이 됐다(3.4.1, 응답 nullable). BE 요청은 `department: string | null`로 한다.
- 이 장의 커피챗 신청 카드(4.3.2)도 같은 필드를 쓴다. **D0-5 요청에 "선배 카드 목록과 커피챗 신청 화면 두 곳에서 쓴다"를 덧붙인다.**
- 로고 없는 사원증(`company_logo_url=null`)은 로고 칸에 2D 고양이를 둔다(D4-1 확장). 로고 목록은 재학생 취업 목록을 받아 손으로 채우므로 목록에 없는 회사(예: Google)가 여기에 해당한다.
- FE 작업은 0.7의 보류 항목(`EmployeeBadgeData.department?`)과 같다. 필드가 오면 `badgeDataOf`에서 넘기기만 한다.

#### 4.2.3 선배 시점 — 일치 ✅

- 신청 줄이 없고(데스크톱 카드 높이 456.7 = 사원증만), 모바일 줄 사이가 24다. `mentors.tsx:91-96`의 `canApply ? "gap-y-8" : "gap-y-6"`과 같다.
- 설명 문구는 화면 글자 `GIST 선배들의 회사와 직무를 둘러보세요.`다(텍스트 노드 이름은 학생 문구 그대로). 코드 `:60-64`와 같다.
- 헤더 메뉴는 `받은 신청`(선배용 헤더 인스턴스). 0장 헤더에서 끝났다.

**시안에 없는 상태(유지):** 공개된 선배가 없을 때 한 줄(`아직 공개된 선배 사원증이 없어요.`), `can_request=false`인 선배의 `지금은 신청을 받지 않아요`. 둘 다 그대로 둔다. 3장 이후 처음으로 `can_request=false`가 실제로 생기므로 스테이징에서 한 번 본다(3.6과 같은 확인).

---

### 4.3 커피챗 신청 → `mentors/$mentorId/apply.tsx`

전체 배치:

```
데스크톱 1000×720                                         모바일 393 전체 화면
┌──────────────────────────────────────────────┐          ┌──────────────────────┐
│ 커피챗 신청                                ✕ │          │ 커피챗 신청        ✕ │
│ 보낸 질문과 프로필은 … 확정되지는 않아요.     │          ├──────────────────────┤
├──────────────────────────────────────────────┤          │ 보낸 질문과 …(2줄)   │
│ ┌선배 카드──────────┐  함께 전달되는 내 정보 │          │ ┌선배 카드─────────┐ │
│ │로고 반도체냥 선배 │  이름      김후배      │          │ └──────────────────┘ │
│ │     삼성전자 · 부서│  학과      …           │          │ 선배에게 궁금한 점   │
│ │     직무          │  …                     │          │ [질문 120~160]       │
│ │     LinkedIn ↗    │  이력서 / 포트폴리오   │          │ 자주하는 질문 ↗      │
│ └───────────────────┘  [포트폴리오.pdf]      │          │ 함께 전달되는…  수정 │
│ 선배에게 궁금한 점     [이력서.pdf]          │          │ 이름 …               │
│ [질문 280 고정]                              │          │ [포트폴리오.pdf]     │
│ 자주하는 질문 ↗              내 정보 수정하기 │          ├──────────────────────┤
│                       [취소] [신청 보내기]   │          │ [   신청 보내기   ]  │
└──────────────────────────────────────────────┘          └──────────────────────┘
```

#### 4.3.1 상자·머리·버튼 줄 — P1

| | 현재 | 시안 | 바꿀 것 |
|---|---|---|---|
| 데스크톱 상자 | `lg:h-184 lg:w-220`(880×736) | **1000×720**, `rounded-xl`, Shadow/Modal | `lg:h-180 lg:w-250`. `max-h-[calc(100svh-6rem)]`는 그대로 |
| 머리 | 제목만 | 데스크톱: 제목(Heading/Screen) 아래에 **안내 한 줄**(Body/Small `text-ink-soft`). 모바일: 제목만 | 아래 `description` |
| 안내 문구 | 왼쪽 열 질문 칸 아래 두 줄(`:186-190`) | `보낸 질문과 프로필은 수정할 수 없어요. 신청만으로 커피챗이 확정되지는 않아요.` 데스크톱은 머리에 한 줄, **모바일은 본문 맨 위에 두 줄**(문장마다 줄바꿈) | 왼쪽 열에서 지운다 |
| 본문 | `px-5 py-6 lg:px-8`, `gap-6` | 같음 | — |
| 버튼 줄 위 구분선 | 두 폭 모두 있음 | 모바일만 있음. **데스크톱은 없다** | 아래 `actionsDivider` |
| 머리 아래 구분선 | 1개 | 데스크톱에 1px 구분선이 **두 개 겹쳐** 있다(`336:7987`, `336:8017`) | 시안 실수로 본다. 1개 유지(메모) |
| 버튼 | 데스크톱 `취소` Secondary 100 + `신청 보내기` Primary 240, 모바일 `신청 보내기` 폭 전체 | 같음 | — |

- `취소` 인스턴스 글자가 14(옛 Secondary)로 남아 있다. **0.3.1 결정(세 종류 모두 16)대로 둔다.** 디자이너 메모에 넣는다.
- **`ResponsiveDialog`에 두 prop을 더한다.** 약관 다이얼로그 등 다른 사용처는 기본값으로 지금과 같다.
  - `description?: React.ReactNode`: `Dialog.Description`으로 그린다. 데스크톱(`hidden lg:block`)은 제목 아래, 모바일(`lg:hidden`)은 스크롤 본문 맨 위. DOM에 두 번 들어가므로 **`Dialog.Description`은 하나만** 쓰고(데스크톱 쪽), 모바일 쪽은 `aria-hidden` 보통 `<p>`로 둔다. 화면 읽기는 폭과 상관없이 대화상자 설명을 한 번 읽는다.
  - `actionsDivider?: "always" | "mobile"`(기본 `"always"`): `"mobile"`이면 버튼 줄 위 구분선에 `lg:hidden`.
- 모바일 본문의 안내 두 줄은 `<br />` 대신 문장 두 개를 블록으로 나눈다(시안이 문장 단위로 끊었다).

#### 4.3.2 선택한 선배 카드 — **P0** (부서 줄만 🔶 BE)

현재(`apply.tsx:142-150`): 본문 맨 위 폭 전체, `{닉네임} 선배`(**H2 24**) + `회사 · 직무`(Body/Small), 아래 1px 구분선.

시안(`1197:10107` / `1248:17975`):

| 부분 | 값 |
|---|---|
| 자리 | 데스크톱: **왼쪽 열 맨 위**(456 폭). 모바일: 안내 문구 아래, 폭 전체 |
| 상자 | `bg-canvas`, 1px `border-line`, `rounded-md`, `p-3`, 가로 `gap-4`. 아래 구분선 없음 |
| 회사 로고 | 60×40, `object-contain`, 상자 왼쪽 위 |
| 이름 | `{닉네임} 선배` **Label/Large 16** `text-ink` |
| 회사·부서 | `{회사} · {부서}` Body/Small `text-ink-soft` |
| 직무 | 다음 줄 Body/Small `text-ink-soft` (지금처럼 `·`로 잇지 않는다) |
| LinkedIn | `LinkedIn 프로필 보기` Body/Small **`text-brand`** 밑줄 + `linkedin` 아이콘 18 |
| 세로 간격 | 이름 → 회사 묶음 → 링크 `gap-1` |

데이터:

| 시안 | 출처 | 없을 때 |
|---|---|---|
| 로고 | `CheersCardDto.company_logo_url` | ✅ D4-1: **같은 60×40 칸에 `assets/brand/cat-cheers.svg`(이전 2D 고양이)를 넣는다.** 칸은 늘 있으므로 글자 묶음 위치가 로고 유무와 상관없이 같다 |
| 부서 | 🔶 `CheersCardDto`에 없음(D0-5, 4.2.2) | `{회사}`만. 필드가 오면 `{회사} · {부서}` |
| LinkedIn | `CheersCardDto.links[0]` (선배 가입·정보 수정이 LinkedIn을 `links[0]`에 저장한다. `mentor-form.ts:113`) | 줄을 그리지 않는다 |

구현 메모:
- `<SelectedMentorCard card={mentor} />`를 `apply.tsx` 안에 둔다. 다른 사용처가 생기기 전에는 `components/`로 올리지 않는다.
- **LinkedIn 링크는 새 탭으로 연다.** FAQ 링크와 같은 이유다(같은 탭에서 떠나면 대화상자가 닫히고 적던 질문이 사라진다). `target="_blank" rel="noopener noreferrer"` + `<span className="sr-only">(새 탭에서 열림)</span>`.
- **`href`에 넣기 전에 `^https?://`인지 확인한다.** 다른 회원이 넣은 값이라 `javascript:` 같은 스킴을 막는다. 저장할 때 `https://`를 붙이지만(`lib/profile-form.ts:37`) 화면에서도 한 번 더 막는다. 아니면 줄을 그리지 않는다.
- 누를 자리는 FAQ 링크처럼 `-my-3 min-h-11`로 44를 확보하되, 상자 안이라 위아래로 넘치지 않는지 393에서 확인한다. 넘치면 `min-h-11`만 빼고 글자 높이 그대로 둔다(링크가 한 줄뿐이라 이웃 대상과 겹치지 않는다).
- 아이콘: `get_design_context(1248:17886)`에서 받은 SVG를 손대지 않고 `assets/icons/linkedin.svg`로 둔다(0.4.3 규칙). `alt=""`.
- **로고 대체 고양이(D4-1).**
  - `cat-cheers.svg`는 지금 아무 데서도 쓰지 않는다(`brand-cat.tsx`는 3D PNG `cat-cheers-3d.png`). 파일은 손대지 않고(0.4.3) 그대로 import한다.
  - 3D 고양이는 이 작은 칸에 어색해서 로고 자리에는 2D 고양이를 쓴다. 다른 화면의 3D 고양이(`brand-cat.tsx`)는 바꾸지 않는다.
  - **사원증에도 넓혔다(2026-11-15, D4-1 확장).** 아래 표 참고.
  - 회사 로고와 같은 `<img className="h-10 w-15 shrink-0 object-contain">`에 `src`만 바꾼다. SVG 원본 비율(32×27.3)이 칸(60×40)과 달라 위아래 40에 맞고 좌우에 여백이 남는다. SVG 루트에 `preserveAspectRatio="none"`이 있으므로 393·1440에서 **찌그러지지 않는지** 눈으로 확인한다.
  - 고양이도 회사 로고도 `alt=""`. 회사 이름이 바로 옆 글자로 있으므로 사원증(`employee-badge.tsx:97`)처럼 꾸밈으로 둔다.
  - 권장: URL은 있는데 이미지를 못 받으면(`onError`) 같은 고양이로 바꾼다. 깨진 이미지 아이콘이 보이지 않게 하려는 것이다.
- 사원증 컴포넌트 설명의 *"No LinkedIn action"*은 **사원증 카드 안**의 규칙이다. 이 카드는 사원증이 아니므로 어긋나지 않는다.

#### 4.3.3 질문 칸 — P1

| | 현재 (`apply.tsx:156-209`) | 시안 데스크톱 (`336:7999`) | 시안 모바일 (`336:7899`) |
|---|---|---|---|
| 제목 | `선배에게 궁금한 점` Heading/Card | 같음 | 같음 |
| 제목 → 칸 → FAQ | `gap-4` | **`gap-3`** | **`gap-3`** |
| 칸 높이 | `h-45`(180) / `lg:h-59`(236) | **280 고정**(주석 *"H 280 고정"*) | **최소 120, 최대 160, 그 사이는 글자에 맞춰 늘어남**(주석 *"최소 높이 120, 그 이후로는 글자수에 맞춰 hug."*) |
| 칸 여백 | `p-5` | `px-5 py-4`, 글자·카운터 `justify-between` | `px-4 py-3`, 글자·카운터 `gap-2` |
| 칸 테두리 | `border-control`, 포커스 안쪽 링 | 같음 | 같음 |
| 카운터 | Label/Small `text-ink-soft` 오른쪽 | 같음 | 같음 |
| FAQ 링크 | `자주하는 질문 확인하기` 밑줄 | + **`open-new-window` 아이콘 18**(글자 오른쪽, `items-end`) | 같음 |
| 안내 두 줄 | 칸 아래 | **없음**(4.3.1로 이동) | 없음 |

- 데스크톱: 칸 상자 `lg:h-70`.
- 모바일 늘어남: `textarea`에 CSS `field-sizing: content`를 쓰면 가장 간단하지만 iOS Safari 지원이 늦다. **입력할 때 `scrollHeight`로 높이를 맞추는 작은 훅**(`useAutosize(ref, value)`)을 쓰고, 상자에 `min-h-30 max-h-40`(120/160)을 준다. 160을 넘으면 `textarea` 안에서 스크롤한다. 데스크톱(`lg:`)에서는 훅이 높이를 건드리지 않게 `lg:h-auto`가 아니라 상자 높이 고정으로 덮는다.
- FAQ 아이콘: `get_design_context(1248:17882)`에서 받아 `assets/icons/open-new-window.svg`(Iconoir 이름 그대로). 모바일 인스턴스 이름은 `icon/open-new-window`(`971:14315`)인데 같은 아이콘이다.
- FAQ 주소는 그대로 임시(`FAQ_URL = "/faq"`, #24)다.

#### 4.3.4 함께 전달되는 내 정보 — P1

| | 현재 (`apply.tsx:218-261`) | 시안 |
|---|---|---|
| 모바일 위 구분선 | `border-t pt-6` | **없음**. 본문 `gap-6`만 |
| 제목 | `함께 전달되는 내 정보` Heading/Card, `min-h-11` | 같음(제목 → 줄 → 첨부 사이 데스크톱 `gap-4`, 모바일 `gap-3`) |
| 설명 | `이름·이메일과 아래 프로필을⏎선배에게 함께 보냅니다.` | **없음** → 지운다 |
| 줄 순서 | 이름 · 이메일 · 학과 · 관심 분야 · 참여 활동 · 전화번호 · 이력서/포트폴리오 | **이름 · 학과 · 관심 분야 · 참여 활동 · 이메일 · 전화번호** + 아래 첨부 묶음(4.3.5) |
| 여러 값 구분 | ` · ` | **`, `** (`AI/데이터, 연구/R&D, 경영`) ✅ D4-2 |
| 빈 값 | `등록하지 않음` `text-ink` | `등록하지 않음` **`text-ink-faint`**(text-disabled) |
| 이름표 칸 | 112(`w-28`) | **96** |
| 줄 여백 | `compact` `py-2.5 gap-3`, Label/Small → Body/Small | 같음 |
| 수정 링크 | 아래 왼쪽 `내 정보 수정` Label/Medium `text-brand` 밑줄 | 데스크톱: 열 **맨 아래 오른쪽** `내 정보 수정하기`(오른쪽 열은 `justify-between`이라 왼쪽 FAQ 줄과 바닥이 맞는다). 모바일: **제목 줄 오른쪽** `수정` |

**줄은 `studentProfileRowsOf`로 만든다.** 시안 순서가 이제 마이페이지 미리보기·보낸 신청 상세(`student-profile-rows.ts`)와 **같아졌다.** `apply.tsx`의 `profileRowsOf`를 지우고 그 함수를 쓴다. 덤으로 지금 `profileRowsOf`의 두 문제가 같이 없어진다.
- 전화번호를 `kakao_enabled`와 상관없이 보인다(`:258`). 켠 채널만 전달되므로(2.6.3) 틀린 표시다.
- `formatPhone`을 거치지 않아 하이픈이 없다.

첨부 줄은 4.3.5의 상자로 따로 그리므로 `studentProfileRowsOf`에서 `이력서 / 포트폴리오` 줄을 빼고 쓰거나(`.filter`), 함수에 `{ withAttachments: false }` 옵션을 둔다. **옵션 쪽을 권한다.** 미리보기·보낸 신청 상세도 각 장에서 상자로 바뀔 가능성이 있다.

**빈 값 색.** `studentProfileRowsOf`가 `value: string | null`을 돌려주고, `ProfileRow`가 `null`이면 `등록하지 않음`을 `text-ink-faint`로 그린다. 다른 화면(미리보기·받은 신청 상세)도 함께 바뀐다. 그 화면들의 시안(05·06장)에서 빈 값이 다른 색이면 그 장에서 다시 본다.

**이름표 칸 96 (0.3.10).** 이 화면의 Profile row 인스턴스는 두 폭 모두 96이다. 0.3.10은 "모든 화면이 96이면 바꾼다"고 했으므로 **`compact` 크기만** 96(`w-24`)으로 바꾼다. `ProfileRow`의 이름표 칸을 크기별로 가르고, `card`·`comfortable`·`document`는 각 장에서 확인할 때까지 112로 둔다. `profile-row.tsx` 머리 주석 표에 "이름표 칸" 행을 더한다.

**수정 링크.**
- 두 링크를 DOM에 둔다: 모바일 제목 줄의 `수정`(`lg:hidden`), 데스크톱 바닥의 `내 정보 수정하기`(`hidden lg:flex`). `display:none`이라 보조기술에는 하나만 보인다.
- 모바일 `수정`은 글자가 짧다. 접근 이름을 `내 정보 수정`으로 맞춘다(`aria-label`).
- ✅ **D4-3: 같은 탭으로 `/me/edit`에 가면 적던 질문이 사라진다**(지금도 같다). 2026-11-15에 아래 방식으로 확정했다. 디자이너에게는 알리기만 한다.
  - 결정: 질문 초안을 `sessionStorage`(`apply-draft:{mentorId}`)에 두고, 다시 열면 채운다. 보내기에 성공하면 지운다. 정보를 고친 뒤 돌아오면 `userInfoQuery`가 새 값으로 다시 그린다.
  - 새 탭으로 열지 않는 이유: 고친 뒤 이 탭의 전달 정보가 낡은 채 남아 "보낼 내용"을 잘못 보여 줄 수 있다.

#### 4.3.5 이력서·포트폴리오 파일 상자 — **P0** (2.6.4 후속)

현재: `이력서 / 포트폴리오` 줄 하나에 이름들을 ` · `로 이어 붙인 글자(`attachmentLabelsOf`). 누를 수 없다.

시안(`1119:10695` / `1119:10752`):

| 부분 | 값 |
|---|---|
| 묶음 | 정의 행 목록 아래, 세로 `gap-1` |
| 이름표 | `이력서 / 포트폴리오` Label/Small `text-ink-soft`(한 줄) |
| 파일 하나 | `<a>` 상자: 높이 38, `bg-surface`, 1px `border-line`, `rounded-md`, `px-3 py-2`, 폭 전체 |
| 파일 이름 | Label/Small **`text-brand` 밑줄**, 왼쪽 정렬 |
| 첨부 없음 | ✅ D4-4: 이름표 아래에 **`등록된 이력서, 포트폴리오가 없습니다`**(Body/Small `text-ink-faint`) 한 줄. 상자는 그리지 않는다 |

- 첨부 최대 3개(2.6.2)이므로 상자 3개까지 쌓인다. 데스크톱 오른쪽 열이 상자 높이(720)를 넘으면 본문이 스크롤한다(`ResponsiveDialog` 본문만 스크롤).
- **파일 링크는 presigned URL이라 만료된다.** 받은 신청 상세의 `AttachmentLink`(`applications/$applicationId.tsx:211-250`)와 같은 처리가 필요하다. 그 컴포넌트를 `components/ui/attachment-link.tsx`로 올리고, 새 URL을 받는 방법만 prop으로 넘긴다.

```tsx
// 방향
<AttachmentLink
  attachment={a}
  refresh={async () =>
    (await queryClient.fetchQuery({ ...userInfoQuery(), staleTime: 60_000 }))
      .student?.profile?.attachments ?? []
  }
  className="..."   // 시안 상자 모양은 호출부가 준다. 받은 신청 상세는 지금 모양 유지
/>
```

  - 클릭과 같은 틱에 빈 창을 먼저 연다(팝업 차단 회피), `tab.opener = null`. 지금 코드 그대로 옮긴다.
  - 찾는 기준은 지금처럼 `file_name`이다. 같은 이름 파일이 둘이면 첫 번째가 열린다. `key`가 응답에 있으므로(`StudentAttachmentDto.key`) **`key`로 찾도록 바꾼다**(링크 첨부는 `url`로).
  - 링크 첨부(`source=link`)는 갱신 없이 그 URL로 연다. `^https?://` 확인은 4.3.2와 같다.
- 누를 자리는 38이다. 44보다 작지만 상자들이 4 간격으로 세로로만 쌓이고 폭이 넓어 잘못 누를 일이 적다. 시안대로 둔다.
- 파일 상자의 종류(`cv` / `portfolio`)는 시안에 표시가 없다. 파일 이름만 보인다.

---

### 4.4 신청 완료 → `sent.tsx`, `CompletionCard` — 일치 ✅ (P2 하나)

일치: 카드(데스크톱 560, `p-10 gap-6`, `rounded-lg`, `border-line`, Work surface 그림자 / 모바일 껍데기 없음), 체크 원 72 `bg-champagne`, 제목 `커피챗 요청을 보냈어요.`(데스크톱 Display/Page 36 · 모바일 Task/Title), 설명 `{닉네임} 선배에게 질문과 프로필을 전달했어요.`, `보낸 신청 보기` Primary, `선배 둘러보기` Ghost(흰 바탕), 바탕 여백(데스크톱 `pt-16`, 모바일 `pt-8`).

다른 점 하나(P2): **Ghost 버튼 위 간격.** 시안은 `Form actions`(`pt-2`, Primary 하나)와 Ghost가 카드의 형제라 둘 사이가 **24**(`gap-6`)다. 코드는 두 버튼을 `Form actions` 안에 `gap-3`(12)으로 넣는다.
- `CompletionCard`에 `secondaryAction?: React.ReactNode`를 더해 `Form actions` **바깥**(카드의 `gap-6` 자리)에 그린다. 연락처 공유 완료(버튼 하나)는 영향이 없다.

---

### 4.5 결정·확인이 필요한 것

| # | 질문 | 누구 | 결정 | 그 전까지 FE |
|---|---|---|---|---|
| D0-5 연장 | `CheersCardDto.department` — 사원증 부서 줄(4.2.2)과 **커피챗 신청 선배 카드(4.3.2)** 두 곳에서 쓴다. 선택 입력이라 `string \| null` | BE | ⏳ 2026-11-15 `api:sync`로 확인한 결과 아직 없음 → **사용자가 BE에 알린다** | 부서 없이 `{회사}`만. 사원증 부서 줄 보류. 필드가 생기면 `api:sync` → `dto.ts` `CheersCardSchema`에 `department` 추가 → 화면 반영 |
| D4-1 | 회사 로고가 없는 선배(`company_logo_url=null`)의 선배 카드 모양 | 디자이너 | ✅ **같은 60×40 칸에 `cat-cheers.svg`(이전 2D 고양이)** — 3D 고양이는 이 칸에 어색하다 (2026-11-15, 4.3.2) | — |
| D4-1 확장 | 사원증 로고 칸도 같은 규칙인가 | 디자이너 | ✅ **목록 사원증도 로고 칸(69.858×24.865)에 고양이** (2026-11-15). 고양이 크기는 눈으로 보고 다시 정한다 | 칸 그대로 `object-contain object-left`. 마이페이지·공개 사원증 미리보기는 로고를 **모르므로**(`GraduatedProfileDto`에 필드 없음) 칸을 그리지 않는다 |
| D4-2 | 여러 값 구분자: 시안 `, ` vs 지금 코드 ` · ` (관심 분야·참여 활동) | 디자이너 | ✅ **`, `(쉼표)** (2026-11-15) | — `studentProfileRowsOf`를 바꾸므로 미리보기·보낸 신청 상세도 함께 바뀐다. 0.4.1 받은 신청 행 시안도 `, `라 같은 방향이다 |
| D4-3 | `내 정보 수정`으로 떠났다 돌아올 때 적던 질문 | FE(디자이너에게 알림) | ✅ **초안을 `sessionStorage`(`apply-draft:{mentorId}`)에 보관** (2026-11-15 재확인, 4.3.4) | — |
| D4-4 | 첨부가 없을 때 첨부 묶음 모양 | 디자이너 | ✅ 이름표 + **`등록된 이력서, 포트폴리오가 없습니다`** (2026-11-15, 4.3.5) | — |

시안 정리 메모(디자이너 전달용):
- 데스크톱 신청 대화상자 머리 아래 구분선이 두 개 겹쳐 있다(`336:7987`, `336:8017`).
- `취소` 버튼 인스턴스 글자가 14다. 0장 Button은 세 종류 모두 16이다.
- 모바일 전달 정보 첫 줄(`1119:10746`)만 위아래 여백이 8이다(나머지 10). 코드는 10으로 통일한다.
- 선배 카드의 텍스트 노드 이름이 실제 글자와 다르다(`Notice` 안 글자 노드 이름이 `신청 후에는 보낸 질문과…`, 회사 줄 이름이 `삼성전자 · 반도체 공정 엔지니어`). 화면 글자를 따른다.
- 첨부 상자 레이어 이름이 둘 다 `Attachment / 포트폴리오.pdf`다.
- 시안에 없는 상태: 선배 목록 비어 있음, `can_request=false` 선배, 신청 오류 문구(409/404/403/400). 코드는 지금 문구를 유지한다.
- 로고 없는 선배 카드는 D4-1로 정했다(2D 고양이 `cat-cheers.svg`). 시안에 상태를 추가해 달라고 전한다.
- 첨부 없음 문구는 D4-4로 정했다(`등록된 이력서, 포트폴리오가 없습니다`). 시안에 상태를 하나 추가해 달라고 전한다.

---

### 4.6 작업 체크리스트 (권장 순서)

**BE 요청**
- [x] 스테이징 명세 재확인: 2026-11-15 `bun run api:sync` → 변화 없음, `CheersCardDto.department` 없음 (4.2.2)
- [ ] (사용자) D0-5 요청에 "커피챗 신청 선배 카드에서도 씀, `string | null`"을 덧붙여 BE에 알린다 (4.2.2, 4.3.2)
- [ ] 필드가 생기면 `bun run api:sync` → `CheersCardSchema.department` 추가 → `api:check` 통과 확인

**P0: 커피챗 신청 본문**
- [x] 선배 카드 `SelectedMentorCard`: 로고(없거나 못 받으면 `cat-cheers.svg`, D4-1)·`{닉네임} 선배` Label/Large·회사(부서는 필드 생기면)·직무 줄·LinkedIn(새 탭, `https?` 확인, 없으면 생략), 데스크톱 왼쪽 열 맨 위 / 모바일 안내 아래 (4.3.2)
- [x] `assets/icons/linkedin.svg`, `assets/icons/open-new-window.svg` 받기(노드 `1248:17886`, `1248:17882`, 손대지 않음) (4.3.2, 4.3.3)
- [x] `AttachmentLink`를 `components/ui/attachment-link.tsx`로 올리고 `refresh` prop, 찾는 기준을 `key`로. 받은 신청 상세는 모양 그대로 옮기기만 (4.3.5)
- [x] 신청 화면 첨부 묶음: 이름표 + 파일별 38 상자(`text-brand` 밑줄), 없으면 `등록된 이력서, 포트폴리오가 없습니다` (4.3.5, D4-4)

**P1**
- [x] `ResponsiveDialog`: `description`(데스크톱 머리 / 모바일 본문 맨 위, `Dialog.Description`은 하나), `actionsDivider: "mobile"` 추가. 기본값으로 다른 사용처가 바뀌지 않는지 확인 (4.3.1)
- [x] 신청 상자 `lg:h-180 lg:w-250`, 왼쪽 열의 안내 두 줄 삭제 (4.3.1)
- [x] 질문 칸: 데스크톱 `h-70 px-5 py-4`, 모바일 `min-h-30 max-h-40 px-4 py-3 gap-2` + `useAutosize`, 제목·칸·FAQ `gap-3`, FAQ 아이콘 (4.3.3)
- [x] `profileRowsOf` 삭제 → `studentProfileRowsOf({ withAttachments: false })`, 값 `string | null`, 구분자 `, ` (4.3.4, D4-2)
- [x] `ProfileRow`: `null` 값은 `등록하지 않음` `text-ink-faint`, `compact` 이름표 칸 96(`w-24`), 머리 주석 표 갱신 (4.3.4, 0.3.10)
- [x] 전달 정보: 모바일 위 구분선·설명 문구 삭제, `수정` 링크 두 자리(모바일 제목 줄 `수정` + `aria-label`, 데스크톱 바닥 오른쪽 `내 정보 수정하기`), 오른쪽 열 `justify-between` (4.3.4)
- [x] 질문 초안 `sessionStorage` 보관·복원·성공 시 삭제 (D4-3)
- [x] `student-profile-rows.ts` 머리 주석의 "커피챗 신청 화면(4-2)의 요약과는 순서가 다르다" 문장을 지운다(이제 같다)

**P2**
- [x] `CompletionCard`에 `secondaryAction`, 신청 완료의 `선배 둘러보기`를 그 자리로(간격 24) (4.4)
- [x] 사원증 로고 없을 때 고양이(`EmployeeBadgeData.companyLogo`: `null`=고양이, `undefined`=칸 없음) (D4-1 확장)
- [ ] 사원증 고양이 크기 눈으로 확인 후 결정 (D4-1 확장)
- [x] 사원증 부서 줄 (4.2.2, 2026-11-15)

**검증**
- [x] `bun run lint`, `bun run build`(`tsc -b` 포함) 통과 (2026-11-15)
- [ ] 1440에서 신청 대화상자를 시안(`336:7980`)과 나란히: 상자 1000×720, 머리 안내 한 줄, 버튼 줄 위 구분선 없음, 왼쪽 FAQ 줄과 오른쪽 `내 정보 수정하기`의 바닥이 맞는지
- [ ] 393에서 시안(`336:7880`)과 나란히: 안내 두 줄이 본문 맨 위, 질문을 길게 쓰면 칸이 120 → 160까지 늘고 그 뒤로는 칸 안에서 스크롤, 버튼 줄 위 구분선 있음
- [ ] 첨부: 파일 3개 학생으로 상자 3개, 받은 지 1분 넘은 뒤 눌러도 열리는지(presigned 갱신), 팝업 차단 없이 새 탭, 첨부 없는 학생은 `등록된 이력서, 포트폴리오가 없습니다`
- [ ] 전달 정보: 카카오를 끈 학생은 전화번호가 `등록하지 않음`(흐린 색), 켠 학생은 하이픈 번호
- [ ] 선배 카드: 로고 없는 회사는 2D 고양이가 60×40 칸에 찌그러지지 않고 들어가는지, LinkedIn 없는 선배, 긴 회사·직무 이름(393 줄바꿈)
- [ ] `수정` → `/me/edit` → 뒤로 → 같은 선배 신청을 다시 열면 질문이 채워져 있고, 보내기 성공 뒤 다시 열면 비어 있는지
- [ ] 키보드만으로: 닫기 → 선배 카드 LinkedIn → 질문 → FAQ → 첨부 → 수정 → 취소 → 신청 보내기 순서, 포커스 링이 모두 보이는지
- [ ] 선배 계정으로 목록: 신청 줄 없음, 모바일 줄 간격 24. 둘 다 끈 선배가 학생 목록에서 `지금은 신청을 받지 않아요`(3.6)
