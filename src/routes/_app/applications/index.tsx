import { Link, createFileRoute } from "@tanstack/react-router";
import { useSession } from "@/lib/session";

/**
 * 신청 목록. 학생에게는 보낸 신청, 선배에게는 받은 신청.
 * "나와 관련된 신청"이라는 한 리소스이므로 경로도 하나다.
 */
export const Route = createFileRoute("/_app/applications/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { role } = useSession();

  // TODO: 실제 목록 로드. 서버가 세션을 보고 보낸/받은 신청을 가려 내려준다.
  const applications = [{ id: "42", title: "신청 42" }];

  return (
    <div>
      <h1>{role === "student" ? "보낸 신청" : "받은 신청"}</h1>
      <ul>
        {applications.map((application) => (
          <li key={application.id}>
            <Link to="/applications/$applicationId" params={{ applicationId: application.id }}>
              {application.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
