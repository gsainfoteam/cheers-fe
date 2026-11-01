import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { Button } from "@/components/ui/button";
import { redirectIfSignedIn } from "@/lib/guards";
import { rememberRole } from "@/lib/role";
import type { Role } from "@/lib/session";

/**
 * 랜딩. 유형을 먼저 고르고 구글 로그인으로 넘어간다.
 *
 * 순서가 뒤바뀌면 안 된다 — `POST /user/oauth/login` 이 `type` 을 필수로 받고,
 * 처음 로그인하는 사용자는 그 값으로 가입이 시작된다.
 */
export const Route = createFileRoute("/")({
  // 이미 로그인한 사람에게 유형 선택을 다시 보여주지 않는다. 가입 중인
  // 사용자가 다른 유형을 누르면 인증과 추가 정보가 지워지기 때문이다
  beforeLoad: async ({ context }) => {
    await redirectIfSignedIn(context.queryClient);
  },
  component: RouteComponent,
});

function RouteComponent() {
  const [role, setRole] = useState<Role | null>(null);
  const router = useRouter();

  const choose = (next: Role) => {
    setRole(next);
    // `/login` 으로 재로그인할 때 같은 유형을 써야 한다. lib/role.ts 주석 참고
    rememberRole(next);
  };

  /**
   * 로그인 후 어디로 갈지는 가드가 정한다. 라우터를 다시 평가시키면
   * 이 화면의 beforeLoad 가 새 세션을 보고 알아서 보낸다.
   */
  const afterLogin = () => void router.invalidate();

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
          <GoogleSignInButton role={role} onSuccess={afterLogin} />
        </section>
      ) : null}
    </div>
  );
}
