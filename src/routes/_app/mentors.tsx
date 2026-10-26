import { Link, Outlet, createFileRoute, useChildMatches } from "@tanstack/react-router";

/**
 * 멘토 리스트. 학생/선배 모두에게 같은 목록을 보여주므로 role 세그먼트 밖에 둔다.
 *
 * 목록 본체를 index 가 아니라 레이아웃에 두는 이유:
 * 자식 라우트(/mentors/:id/apply)로 이동해도 목록이 언마운트되지 않아야
 * 모달 뒤에 그대로 남고, 닫고 돌아왔을 때 스크롤과 필터가 보존된다.
 */
export const Route = createFileRoute("/_app/mentors")({
  component: RouteComponent,
});

function RouteComponent() {
  const hasOverlay = useChildMatches().length > 0;

  return (
    <div>
      {/* 모바일에서는 신청 화면이 전체를 덮으므로 감추되, 언마운트하지는 않는다 */}
      <div className={hasOverlay ? "hidden md:block" : "block"}>
        <MentorList />
      </div>
      <Outlet />
    </div>
  );
}

function MentorList() {
  // TODO: 실제 멘토 목록 로드. 카드 목적지는 role 과 무관하게 하나다.
  const mentors = [{ id: "1", name: "선배 A" }];

  return (
    <ul>
      {mentors.map((mentor) => (
        <li key={mentor.id}>
          <Link to="/mentors/$mentorId/apply" params={{ mentorId: mentor.id }}>
            {mentor.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}
