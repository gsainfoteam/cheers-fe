/**
 * vite-imagetools 쿼리 import 의 타입.
 *
 * TS 의 와일드카드 모듈 선언은 `*` 를 하나만 받으므로 쿼리의 **끝** 으로
 * 갈라 적는다. 그래서 쿼리를 쓸 때 출력 형태를 정하는 지시자를 맨 뒤에 둔다.
 *
 * - `…&as=srcset`      → `"a.webp 740w, b.webp 1254w"` 문자열
 * - `…&format=webp`    → 이미지 하나의 URL
 */
declare module "*&as=srcset" {
  const srcset: string;
  export default srcset;
}

declare module "*&format=webp" {
  const src: string;
  export default src;
}
