import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/index.css";

/**
 * 개발용 토큰 확인 페이지 (`/tokens.html`).
 *
 * 단계 1이 끝났다는 걸 눈으로 보는 자리다. 설계 문서가 각 단계마다 요구하는
 * "끝나면 확인할 수 있는 상태" 가 토큰 층에서는 이것 말고 달리 없다 —
 * 화면이 아직 하나도 없으니 토큰이 제대로 깔렸는지 알 방법이 없다.
 *
 * 부수 효과가 하나 더 있다. Tailwind 는 **소스에서 실제로 발견한 클래스만**
 * CSS 로 내보낸다. 이 페이지가 모든 토큰을 문자열 그대로 한 번씩 쓰고 있어서,
 * 빌드가 통과하고 이 페이지가 제대로 그려지면 토큰이 전부 살아 있다는 뜻이다.
 * 그래서 클래스 이름을 `bg-${name}` 처럼 조립하지 않는다 — 조립하면 Tailwind
 * 가 못 찾아서 아무것도 안 나온다.
 *
 * `verify.html` 과 같은 방식으로 dev 서버에서만 뜬다. `bun run build` 는
 * `index.html` 만 번들하므로 배포에 섞이지 않는다.
 */

type Swatch = {
  figma: string;
  token: string;
  hex: string;
  box: string;
  dark?: boolean;
};

const COLORS: Swatch[] = [
  { figma: "v05-text-primary", token: "--color-ink", hex: "#22201c", box: "bg-ink", dark: true },
  { figma: "v05-text-secondary", token: "--color-ink-soft", hex: "#685e52", box: "bg-ink-soft", dark: true },
  { figma: "v05-text-disabled", token: "--color-ink-faint", hex: "#9c8f7f", box: "bg-ink-faint", dark: true },
  { figma: "v05-text-inverse", token: "--color-ink-inverse", hex: "#ffffff", box: "bg-ink-inverse" },
  { figma: "v05-bg-ink", token: "--color-ink-fill", hex: "#22201c", box: "bg-ink-fill", dark: true },
  { figma: "v05-text-brand", token: "--color-brand", hex: "#965a15", box: "bg-brand", dark: true },
  { figma: "v05-brand-accent", token: "--color-brand-accent", hex: "#ff9447", box: "bg-brand-accent" },
  { figma: "brand-gold", token: "--color-brand-gold", hex: "#f4c542", box: "bg-brand-gold" },
  { figma: "v05-text-error", token: "--color-danger", hex: "#b42318", box: "bg-danger", dark: true },
  { figma: "v05-bg-canvas", token: "--color-canvas", hex: "#fff9f3", box: "bg-canvas" },
  { figma: "v05-bg-surface", token: "--color-surface", hex: "#ffffff", box: "bg-surface" },
  { figma: "v05-bg-muted", token: "--color-muted", hex: "#f8f0e5", box: "bg-muted" },
  { figma: "bg-champagne", token: "--color-champagne", hex: "#fff0d2", box: "bg-champagne" },
  { figma: "v05-border-default", token: "--color-line", hex: "#e8ddcf", box: "bg-line" },
  { figma: "v05-border-strong", token: "--color-line-strong", hex: "#685e52", box: "bg-line-strong", dark: true },
  { figma: "v05-web-border-control", token: "--color-control", hex: "#8a7d6d", box: "bg-control", dark: true },
  { figma: "v05-border-focus", token: "--color-focus", hex: "#ad681a", box: "bg-focus", dark: true },
  { figma: "v05-action-primary", token: "--color-action", hex: "#22201c", box: "bg-action", dark: true },
  { figma: "v05-action-primary-hover", token: "--color-action-hover", hex: "#40392f", box: "bg-action-hover", dark: true },
];

type TypeSpec = { figma: string; cls: string; spec: string; responsive?: boolean };

const RESPONSIVE_TYPE: TypeSpec[] = [
  { figma: "Display/Hero", cls: "text-hero", spec: "40/54/-1.9 → 64/84/-3.3", responsive: true },
  { figma: "Brand/Statement", cls: "text-statement", spec: "28/40/-1 → 44/60/-1.8", responsive: true },
  { figma: "Task/Title", cls: "text-task-title", spec: "32/44/-1 → 40/56/-1.4", responsive: true },
  { figma: "Display/Page", cls: "text-page", spec: "28/38/-1 → 36/48/-1.4", responsive: true },
];

const FIXED_TYPE: TypeSpec[] = [
  { figma: "Heading/H1", cls: "text-h1", spec: "32/42/-1.2 · 700" },
  { figma: "Task/Person", cls: "text-task-person", spec: "28/40/-0.8 · 700" },
  { figma: "Heading/Screen", cls: "text-screen", spec: "28/38/-2 · 700" },
  { figma: "Heading/H2", cls: "text-h2", spec: "24/34/-0.8 · 700" },
  { figma: "Heading/H3", cls: "text-h3", spec: "20/28/-0.5 · 700" },
  { figma: "Heading/Card", cls: "text-card-title", spec: "18/26/0 · 700" },
  { figma: "Body/Large", cls: "text-body-lg", spec: "18/28/0 · 400" },
  { figma: "Body/Medium", cls: "text-body", spec: "16/24/0 · 400" },
  { figma: "Body/Small", cls: "text-body-sm", spec: "14/20/0 · 400" },
  { figma: "Label/Large", cls: "text-label-lg", spec: "16/24/0 · 500" },
  { figma: "Label/Medium", cls: "text-label", spec: "14/20/0 · 500" },
  { figma: "Label/Small", cls: "text-label-sm", spec: "12/16/+0.2 · 500" },
  { figma: "Label/Micro", cls: "text-label-xs", spec: "11/16/0 · 500" },
  { figma: "Web/Button", cls: "text-button", spec: "16/24/0 · 500" },
];

const BADGE_TYPE: TypeSpec[] = [
  { figma: "Badge/Name mobile", cls: "text-badge-name", spec: "20/28/-0.7 · 700" },
  { figma: "Badge/Role mobile", cls: "text-badge-role", spec: "14/20/-0.4 · 400" },
  { figma: "Badge/Company mobile", cls: "text-badge-company", spec: "12/18/-0.3 · 500" },
  { figma: "Badge/Meta mobile", cls: "text-badge-meta", spec: "12/18/-0.4 · 400" },
];

const SAMPLE = "취얼스 선배에게 커피챗 Cheers 2026";

export function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="mb-16">
      <h2 className="text-h3 text-ink mb-1">{title}</h2>
      {note ? <p className="text-body-sm text-ink-soft mb-5">{note}</p> : <div className="mb-5" />}
      {children}
    </section>
  );
}

export function TypeRow({ figma, cls, spec, responsive }: TypeSpec) {
  return (
    <div className="border-line border-b py-4 last:border-b-0">
      <div className="text-label-sm text-ink-soft mb-2 flex flex-wrap gap-x-3">
        <span className="text-ink">{cls}</span>
        <span>{figma}</span>
        <span>{spec}</span>
        {responsive ? <span className="text-brand">폭 따라 바뀜</span> : null}
      </div>
      <p className={`${cls} text-ink`}>{SAMPLE}</p>
    </div>
  );
}

export function TokensPage() {
  return (
    <main className="bg-canvas text-ink min-h-svh px-4 py-10 lg:px-16">
      <header className="mb-14">
        <p className="text-micro text-brand mb-3">CHEERS DESIGN TOKENS</p>
        <h1 className="text-task-title text-ink">토큰 확인 (개발용)</h1>
        <p className="text-body text-ink-soft mt-3 max-w-prose">
          피그마 <code className="text-label">00 · 디자인 시스템</code> 에서 옮긴 토큰이 전부
          살아 있는지 보는 페이지. 창 폭을 1024px 아래위로 움직이면 아래 네 가지 타이포가 같이
          바뀐다 — 호출부는 클래스 하나만 쓴다.
        </p>
      </header>

      <Section title="색" note="19개. 왼쪽이 피그마 변수명, 오른쪽이 코드에서 쓰는 이름.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {COLORS.map((c) => (
            <div key={c.token} className="border-line bg-surface flex items-center gap-3 rounded-md border p-3">
              <div className={`${c.box} border-line size-12 shrink-0 rounded-sm border`} />
              <div className="min-w-0">
                <p className="text-label text-ink truncate">{c.box}</p>
                <p className="text-label-sm text-ink-soft truncate">{c.figma}</p>
                <p className="text-label-xs text-ink-faint">{c.hex}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="타이포 — 폭에 따라 바뀌는 것"
        note="피그마에 desktop/mobile 이 별도 스타일로 그려진 네 쌍. 창을 좁혔다 넓혀 보면 된다."
      >
        {RESPONSIVE_TYPE.map((t) => (
          <TypeRow key={t.cls} {...t} />
        ))}
      </Section>

      <Section title="타이포 — 고정" note="14종.">
        {FIXED_TYPE.map((t) => (
          <TypeRow key={t.cls} {...t} />
        ))}
      </Section>

      <Section title="타이포 — 사원증(선배 카드)" note="피그마 이름에 mobile 이 붙어 있지만 desktop 짝이 없다.">
        {BADGE_TYPE.map((t) => (
          <TypeRow key={t.cls} {...t} />
        ))}
      </Section>

      <Section title="그림자 · 모서리" note="그림자 3종, 모서리 4종 + full.">
        <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            { cls: "shadow-work", figma: "Elevation/Work surface" },
            { cls: "shadow-modal", figma: "Shadow/Modal" },
            { cls: "shadow-badge", figma: "Shadow/Employee badge" },
          ].map((s) => (
            <div key={s.cls} className={`bg-surface rounded-lg p-5 ${s.cls}`}>
              <p className="text-label text-ink">{s.cls}</p>
              <p className="text-label-sm text-ink-soft">{s.figma}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-4">
          {[
            { cls: "rounded-sm", label: "rounded-sm · 4" },
            { cls: "rounded-md", label: "rounded-md · 8" },
            { cls: "rounded-lg", label: "rounded-lg · 12" },
            { cls: "rounded-xl", label: "rounded-xl · 16" },
            { cls: "rounded-full", label: "rounded-full · 999" },
          ].map((r) => (
            <div key={r.cls}>
              <div className={`bg-muted border-line size-20 border ${r.cls}`} />
              <p className="text-label-sm text-ink-soft mt-2">{r.label}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="간격"
        note="토큰을 만들지 않았다. 피그마 --cheers-space-N 이 Tailwind 기본 N 과 값까지 같아서, p-4 가 곧 space-4(16px) 다."
      >
        <div className="flex flex-wrap items-end gap-4">
          {[
            { cls: "h-1", label: "1 · 4" },
            { cls: "h-2", label: "2 · 8" },
            { cls: "h-3", label: "3 · 12" },
            { cls: "h-4", label: "4 · 16" },
            { cls: "h-5", label: "5 · 20" },
            { cls: "h-6", label: "6 · 24" },
            { cls: "h-8", label: "8 · 32" },
            { cls: "h-10", label: "10 · 40" },
            { cls: "h-12", label: "12 · 48" },
            { cls: "h-14", label: "14 · 56" },
            { cls: "h-16", label: "16 · 64" },
          ].map((s) => (
            <div key={s.cls}>
              <div className={`bg-brand-accent w-8 ${s.cls}`} />
              <p className="text-label-xs text-ink-soft mt-2">{s.label}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="shadcn 다리"
        note="단계 0에서 색을 잃은 shadcn 5종이 Cheers 토큰 위에서 다시 보이는지. 단계 5에서 없어질 수 있는 임시 블록이다."
      >
        <div className="flex flex-wrap items-center gap-3">
          <button className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium">
            bg-primary
          </button>
          <button className="bg-secondary text-secondary-foreground rounded-md px-4 py-2 text-sm font-medium">
            bg-secondary
          </button>
          <span className="bg-accent text-accent-foreground rounded-md px-4 py-2 text-sm">bg-accent</span>
          <span className="text-destructive text-sm">text-destructive</span>
          <input
            className="border-input bg-background text-foreground focus-visible:ring-ring rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
            placeholder="border-input / ring-ring"
          />
        </div>
      </Section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TokensPage />
  </StrictMode>
);
