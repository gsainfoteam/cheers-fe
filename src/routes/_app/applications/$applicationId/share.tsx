import {
  createFileRoute,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  isApiError,
  receivedRequestQuery,
  useShareContact,
  userInfoQuery,
} from "@/api";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ProfileRow } from "@/components/ui/profile-row";
import { myContactEmailOf } from "@/lib/mentor-contact";

/**
 * 연락처 공유 확인. 피그마 `Dialog / 연락처 공유 확인`(344:9450 / 344:9385).
 *
 * 선배 → 학생 단방향이고, **한번 보내면 되돌릴 수 없다.** 확인 단계에 URL 을
 * 주는 이유: 되돌릴 수 없는 작업일수록 새로고침이나 뒤로가기로 사고가 나면
 * 안 되고, 나중에 "어떤 연락처를 공유할지 선택" 이 붙어도 구조가 바뀌지 않는다.
 *
 * 받은 신청 내용 위에 또 뜬다(`$applicationId.tsx` 의 `<Outlet/>`).
 */
export const Route = createFileRoute("/_app/applications/$applicationId/share")({
  // `_app` 가드가 세션을 실어 준다. 학생이 주소로 들어오면 상세로 되돌린다
  beforeLoad: ({ context, params }) => {
    if (context.me.type !== "graduated") {
      throw redirect({
        to: "/applications/$applicationId",
        params: { applicationId: params.applicationId },
      });
    }
  },
  loader: async ({ context, params }) => {
    const request = await context.queryClient.ensureQueryData(
      receivedRequestQuery(params.applicationId)
    );
    // 이미 보낸 신청이면 다시 물을 일이 없다. 공유 API 는 멱등이라 보내도
    // 사고는 아니지만, "보낼까요?" 를 다시 묻는 건 거짓말이 된다
    if (request.contact_shared_at) {
      throw redirect({
        to: "/applications/$applicationId/shared",
        params: { applicationId: params.applicationId },
      });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { applicationId } = Route.useParams();
  const navigate = useNavigate();
  const { data: me } = useSuspenseQuery(userInfoQuery());
  const { data: request } = useSuspenseQuery(receivedRequestQuery(applicationId));
  const share = useShareContact();

  const back = () =>
    void navigate({
      to: "/applications/$applicationId",
      params: { applicationId },
    });

  const confirm = () =>
    share.mutate(applicationId, {
      onSuccess: () =>
        void navigate({
          to: "/applications/$applicationId/shared",
          params: { applicationId },
        }),
    });

  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => {
        // 보내는 중에는 닫히지 않게 한다 — 결과를 못 본 채 떠나면 보냈는지 모른다
        if (!open && !share.isPending) back();
      }}
      title="연락처를 공유할까요?"
      // ⚠️ 이슈 #26: 공유 응답에 `shared_phone` 이 실제로 실려 가면 이 라벨과
      // 아래 `알림톡 수신 번호는 공유되지 않아요.` 가 둘 다 거짓이 된다.
      // 스테이징에서 응답을 확인할 것(선배 가이드 §2.7)
      confirmLabel="이름·이메일 공유"
      onConfirm={confirm}
      busy={share.isPending}
      busyLabel="보내는 중…"
    >
      <p className="text-body text-ink">
        {request.student.name}님께 아래 정보를 보냅니다.
      </p>
      <dl>
        <ProfileRow label="이름" value={me.name ?? "—"} size="card" />
        <ProfileRow label="이메일" value={myContactEmailOf(me) ?? "—"} size="card" />
      </dl>
      <p className="text-body-sm text-ink-soft">
        알림톡 수신 번호는 공유되지 않아요.
      </p>

      {share.error ? (
        <p role="alert" className="text-body-sm text-danger">
          {describeShareError(share.error)}
        </p>
      ) : null}
    </ConfirmDialog>
  );
}

function describeShareError(error: unknown): string {
  if (!isApiError(error)) return "연락처를 보내지 못했어요. 다시 시도해 주세요.";

  // 내 연락 설정이 "희망하지 않음" 이라 공유할 연락처가 없음
  if (error.status === 409)
    return "공유할 연락처가 없어요. 마이페이지에서 연락처를 등록해 주세요.";
  if (error.status === 410) return "학생이 탈퇴해 연락처를 보낼 수 없어요.";
  if (error.status === 404) return "신청을 찾을 수 없어요. 목록에서 다시 확인해 주세요.";
  if (error.status === 403) return "이 계정에서는 연락처를 공유할 수 없어요.";
  return "연락처를 보내지 못했어요. 다시 시도해 주세요.";
}
