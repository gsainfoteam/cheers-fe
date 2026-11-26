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
import { track } from "@/lib/analytics";
import { mySharedContactOf } from "@/lib/mentor-contact";
import { formatPhone } from "@/lib/profile-form";

/**
 * 내 연락처 공유 확인. 피그마 `내 연락처 공유 모달`(1245:16975) — 받은 신청
 * 내용의 `내 연락처 공유하기` 주석: *"내 연락처 공유 모달로 한 번 더 확인"*.
 * 동기화 가이드 06장 6.5.5.
 *
 * 선배 → 학생 단방향이고, **한번 보내면 되돌릴 수 없다.** 확인 단계에 URL 을
 * 주는 이유: 되돌릴 수 없는 작업일수록 새로고침이나 뒤로가기로 사고가 나면
 * 안 되고, 나중에 "어떤 연락처를 공유할지 선택" 이 붙어도 구조가 바뀌지 않는다.
 *
 * 받은 신청 내용 화면 위에 뜬다(`$applicationId.tsx` 의 `<Outlet/>`). 보내면
 * 그 화면으로 돌아가고, `내 연락처` 카드 버튼이 `내 연락처 공유 완료` 로
 * 바뀐다. 옛 `연락처 공유 완료` 한 장(`applications_/$applicationId/shared`)은
 * 시안에서 없어져 지웠다.
 *
 * **입력한 연락처가 모두 간다**(동기화 가이드 D3-3) — 커피챗 참여 설정에서 켠
 * 채널의 이메일 · 휴대전화번호. 시안은 이메일 · 전화번호 두 줄을 늘 그리고 빈
 * 값은 `등록하지 않음` 이다. 이름도 함께 가지만 시안에 줄이 없다(D6-6).
 *
 * 수락 단계 없이 바로 열린다(이슈 #85).
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
    // 사고는 아니지만, "보낼까요?" 를 다시 묻는 건 거짓말이 된다.
    if (request.contact_shared_at) {
      throw redirect({
        to: "/applications/$applicationId",
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
  const share = useShareContact();
  const contact = mySharedContactOf(me);

  const back = () =>
    void navigate({
      to: "/applications/$applicationId",
      params: { applicationId },
    });

  return (
    <ConfirmDialog
      layout="choice"
      open
      onOpenChange={(open) => {
        // 보내는 중에는 닫히지 않게 한다 — 결과를 못 본 채 떠나면 보냈는지 모른다
        if (!open && !share.isPending) back();
      }}
      title="내 연락처를 공유할까요?"
      cancelLabel="아니오"
      confirmLabel="네"
      onConfirm={() =>
        share.mutate(applicationId, {
          onSuccess: () => {
            track("Contact Shared", { request_id: applicationId });
            back();
          },
        })
      }
      busy={share.isPending}
      busyLabel="보내는 중…"
    >
      <dl>
        <ProfileRow label="이메일" value={contact.email} />
        <ProfileRow
          label="전화번호"
          value={contact.phone ? formatPhone(contact.phone) : null}
        />
      </dl>

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

  // 409 는 내 연락 설정이 "희망하지 않음" 이라 공유할 연락처가 없는 경우다
  if (error.status === 409)
    return "공유할 연락처가 없어요. 정보 수정에서 커피챗 참여 설정을 등록해 주세요.";
  if (error.status === 410) return "학생이 탈퇴해 연락처를 보낼 수 없어요.";
  if (error.status === 404) return "신청을 찾을 수 없어요. 목록에서 다시 확인해 주세요.";
  if (error.status === 403) return "이 계정에서는 연락처를 공유할 수 없어요.";
  return "연락처를 보내지 못했어요. 다시 시도해 주세요.";
}
