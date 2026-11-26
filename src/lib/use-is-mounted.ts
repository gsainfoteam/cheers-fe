import { useEffect, useRef } from "react";

/**
 * 이 컴포넌트가 아직 화면에 있는지 알려 주는 ref.
 *
 * TanStack Query 는 화면이 사라진 뒤에는 `mutate(…, { onSuccess })` 의 호출별
 * 콜백을 실행하지 않는다. 결과 기록처럼 **화면과 상관없이 끝까지 해야 하는
 * 일**은 `mutateAsync` 로 받아 하고, 화면 이동처럼 **아직 화면에 있을 때만
 * 할 일**은 이 ref 로 가린다.
 */
export function useIsMounted() {
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  return mounted;
}
