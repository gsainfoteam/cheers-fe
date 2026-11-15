import { cva, type VariantProps } from "class-variance-authority";

/**
 * 피그마 `Cheers / Button`(353:9626)의 클래스.
 *
 * 컴포넌트가 아니라 **클래스를 내주는 함수**인 이유: 같은 모양이 때로는
 * `<button>`, 때로는 TanStack `<Link>` 로 그려진다. 둘을 하나로 감싸려면
 * 다형 컴포넌트가 필요한데, 여기서 필요한 건 생김새뿐이라 클래스만 내준다.
 *
 * 시안은 3종 × 5상태(Default / Hover / Focus / Pressed / Disabled)다.
 * **Hover 와 Pressed 는 같은 모양**이라 `hover:` 와 `active:` 에 같은 값을 준다.
 * 글자는 세 종류 모두 Web/Button 16 Medium 이다.
 *
 * 컴포넌트 설명: *"Bright orange and champagne are brand colors, not
 * low-contrast label backgrounds"* — 버튼 바탕에 주황·샴페인을 쓰지 않는다.
 */

/**
 * 시안 Focus — 2px `border-focus`. 테두리를 굵히면 글자가 밀리므로 같은
 * 두께의 안쪽 링으로 낸다(`Field` 와 같은 방식). 마우스로 눌렀을 때는 뜨지
 * 않게 `focus-visible` 만 쓴다.
 */
const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus";

export const action = cva(
  `text-button flex items-center justify-center gap-2 rounded-md px-4 py-3 disabled:pointer-events-none ${FOCUS}`,
  {
    variants: {
      variant: {
        // Primary. 비활성은 바탕이 muted 로 내려앉는다
        primary:
          "bg-action text-ink-inverse hover:bg-action-hover active:bg-action-hover disabled:bg-muted disabled:text-ink-soft",
        // Secondary. 흰 바탕에 옅은 테두리. 누르는 동안은 캔버스색
        secondary:
          "bg-surface border-line text-ink border hover:bg-canvas active:bg-canvas disabled:bg-muted disabled:text-ink-soft",
        /*
         * Ghost. 바탕이 **투명**하다 — 놓인 자리(랜딩은 캔버스)의 색을 그대로
         * 보여 준다. 시안 그림은 흰 바탕이지만 컴포넌트 설명이 "transparent
         * contextual ghost" 라서 설명을 따랐다(동기화 가이드 D0-1).
         */
        ghost:
          "text-ink hover:bg-muted active:bg-muted disabled:bg-muted disabled:text-ink-soft",
      },
      size: {
        /** 디자인 시스템 기본 높이 */
        md: "h-13",
        /** 랜딩 CTA 처럼 크게 쓰는 자리 */
        lg: "h-14",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export type ActionVariants = VariantProps<typeof action>;
