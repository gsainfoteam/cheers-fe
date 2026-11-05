import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * 메일·알림톡 링크의 옛 경로를 받는 우회로.
 *
 * 백엔드가 지금 보내는 링크는 `https://{프론트}/cheers/received/{id}` 다 —
 * API 경로(`/api/v1/cheers/received/{id}`)에서 `/api/v1` 만 뗀 모양이다.
 * 프론트의 신청 상세는 학생·선배가 함께 쓰는 `/applications/{id}` 하나라
 * (설계 4-3c), 이 경로로 들어오면 그대로 넘긴다. 로그인·가입·계정 확인은
 * 넘어간 뒤 `/_app` 가드와 상세 화면이 한다.
 *
 * 백엔드가 링크를 `/applications/{id}` 로 바꾸면(이슈 참고) 이미 나간 링크를
 * 위해 한동안 두었다가 지운다.
 */
export const Route = createFileRoute("/cheers/received/$requestId")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/applications/$applicationId",
      params: { applicationId: params.requestId },
      // 뒤로가기로 이 우회로에 다시 오지 않게 기록을 바꿔 끼운다
      replace: true,
    });
  },
});
