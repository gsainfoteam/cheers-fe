import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { createQueryClient, onUnauthenticated } from "@/api";
import { routeTree } from "./routeTree.gen";
import "./index.css";

const queryClient = createQueryClient();

/**
 * queryClient 를 라우터 컨텍스트에 실어 둔다. 가드(`beforeLoad`)가
 * `context.queryClient.ensureQueryData(userInfoQuery())` 로 내 정보를 받아
 * `next_step` 을 보고 리다이렉트할 수 있게 하기 위해서다.
 *
 * `defaultPreload: "intent"` 는 일부러 켜지 않았다. 커피챗 상세 GET 은
 * "확인함" 으로 기록되는 부수효과가 있어서, 링크에 마우스를 올리기만 해도
 * 읽음 처리가 되어버린다.
 */
const router = createRouter({
  routeTree,
  context: { queryClient },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

/**
 * refresh 까지 실패해 세션이 끊긴 경우. 남은 캐시는 모두 남의 것이 되므로
 * 비우고, 라우터를 다시 평가시켜 가드가 로그인 화면으로 보내게 한다.
 */
onUnauthenticated(() => {
  queryClient.clear();
  void router.invalidate();
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
);
