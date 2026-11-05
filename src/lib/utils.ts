import { createCn } from "cn/config";

/**
 * 클래스 병합. `cn` 패키지(tailwind-merge 호환)에 **우리 타이포 토큰을
 * 글자 크기로 알려준다.**
 *
 * 알려주지 않으면 `text-body`·`text-label` 같은 이름을 색으로 읽는다. 그러면
 * `cn("text-label", "text-brand")` 가 같은 그룹의 충돌로 보고 `text-label` 을
 * 지워 버려서, 칩·입력 칸·가입 단계 글자가 조용히 기본 크기(16px)로 그려졌다.
 *
 * 목록은 `styles/tokens.css` 의 `--text-*` 와 `@utility text-micro` 다.
 * 토큰을 더하면 여기에도 더한다.
 */
const TEXT_TOKENS = [
  // 폭에 따라 바뀌는 것
  "hero",
  "page",
  "statement",
  "task-title",
  // 폭에 따라 안 바뀌는 것
  "task-person",
  "screen",
  "h1",
  "h2",
  "h3",
  "card-title",
  "body-lg",
  "body",
  "body-sm",
  "label-lg",
  "label",
  "label-sm",
  "label-xs",
  "button",
  "badge-name",
  "badge-role",
  "badge-company",
  "badge-meta",
  "micro",
];

export const cn = createCn({
  extend: { classGroups: { "font-size": [{ text: TEXT_TOKENS }] } },
});
