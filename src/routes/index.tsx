import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { userInfoQuery } from "@/api";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { Button } from "@/components/ui/button";
import { rememberRole } from "@/lib/role";
import type { Role } from "@/lib/session";

/**
 * 랜딩. 유형을 먼저 고르고 구글 로그인으로 넘어간다.
 *
 * 순서가 뒤바뀌면 안 된다 — `POST /user/oauth/login` 이 `type` 을 필수로 받고,
 * 처음 로그인하는 사용자는 그 값으로 가입이 시작된다.
 */
export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  const [role, setRole] = useState<Role | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const choose = (next: Role) => {
    setRole(next);
    // `/login` 으로 재로그인할 때 같은 유형을 써야 한다. lib/role.ts 주석 참고
    rememberRole(next);
  };

  /**
   * 로그인 직후 어디로 갈지는 서버가 정한다. `next_step` 이 남아 있으면
   * 가입이 끝나지 않은 것이고, null 이면 메인이다.
   *
   * TODO: 이 분기는 결국 `_app` / `onboarding` 의 beforeLoad 가드로 옮겨간다.
   * 지금은 로그인 흐름을 끝까지 돌려보기 위해 여기 둔다.
   */
  const afterLogin = async () => {
    const me = await queryClient.fetchQuery(userInfoQuery());
    if (me.next_step) navigate({ to: "/onboarding" });
    else navigate({ to: "/home" });
  };

  return (
    <div>
      <h1>Cheers</h1>

      <section>
        <p>어떤 유형으로 시작할까요?</p>
        <Button
          variant={role === "student" ? "default" : "outline"}
          onClick={() => choose("student")}
        >
          학생으로 시작
        </Button>
        <Button
          variant={role === "mentor" ? "default" : "outline"}
          onClick={() => choose("mentor")}
        >
          선배로 시작
        </Button>
      </section>

      {role ? (
        <section>
          <GoogleSignInButton role={role} onSuccess={() => void afterLogin()} />
        </section>
      ) : null}
    </div>
  );
}
