import { useEffect, useState } from "react";

/**
 * `value` 가 `delay` 동안 바뀌지 않으면 그 값을 돌려준다.
 *
 * 검색 칸이 IME 조합 중에도 `onChange` 로 검색어를 받으므로(`삼성ㅈ`) 글자
 * 하나마다 요청이 나가지 않게 한 번 거른다.
 */
export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
