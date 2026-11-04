import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * 학생 쪽 옛 경로의 우회로. `cheers/received/$requestId.tsx` 와 같은 이유다 —
 * 보낸 신청 42 와 받은 신청 42 는 같은 객체라 프론트 경로가 `/applications/{id}`
 * 하나다. 학생에게 가는 링크가 이 모양으로 나올 경우를 대비해 같이 받는다.
 */
export const Route = createFileRoute("/cheers/sent/$requestId")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/applications/$applicationId",
      params: { applicationId: params.requestId },
      replace: true,
    });
  },
});
