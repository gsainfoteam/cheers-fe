import { cva, type VariantProps } from "class-variance-authority";

/**
 * 피그마 `Cheers / Button`(353:9626)의 클래스.
 *
 * 컴포넌트가 아니라 **클래스를 내주는 함수**인 이유: 같은 모양이 때로는
 * `<button>`, 때로는 TanStack `<Link>` 로 그려진다. 둘을 하나로 감싸려면
 * 다형 컴포넌트가 필요한데, 여기서 필요한 건 생김새뿐이라 클래스만 내준다.
 *
 * 세 번째 사용처가 생겨서 올렸다 — 랜딩(3), 약관 동의(1), 약관 오버레이(1).
 * 설계 2절의 "두 번째로 같은 것이 필요해지는 순간 승격" 에 해당한다.
 * Secondary 는 인증 화면의 `이전` 버튼이 생기면서 뒤늦게 들어왔다.
 */
export const action = cva(
  "text-button flex items-center justify-center gap-2 rounded-md px-4 py-3 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        // Primary. 비활성은 시안 `State=Disabled` — 배경이 muted 로 내려앉는다
        primary:
          "bg-action text-ink-inverse disabled:bg-muted disabled:text-ink-soft",
        // Secondary. 흰 바탕에 옅은 테두리. 글자가 Label/Medium 으로 한 급 작다
        secondary: "bg-surface border-line text-ink text-label border",
        // Ghost. 배경 없이 글자만
        ghost: "text-ink",
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
