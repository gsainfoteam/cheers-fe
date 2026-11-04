import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useLogout, useWithdraw } from "@/api";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/**
 * 마이페이지 맨 아래 `로그아웃` · `회원 탈퇴`. 피그마 `Account management`
 * (338:8583). 학생 마이페이지와 같은 자리 · 같은 동작이라 한 번 만들어 둘 다
 * 쓴다(선배 가이드 §5.4).
 *
 * 둘 다 끝나면 **랜딩으로** 간다. 훅이 토큰과 쿼리 캐시를 비우므로 남은 화면이
 * 남의 데이터를 그리지 않는다.
 */
export function AccountActions() {
  const navigate = useNavigate();
  const logout = useLogout();
  const withdraw = useWithdraw();
  const [confirming, setConfirming] = useState(false);

  const toLanding = () => void navigate({ to: "/", replace: true });

  return (
    <div className="flex gap-6">
      <button
        type="button"
        disabled={logout.isPending}
        onClick={() => logout.mutate(undefined, { onSettled: toLanding })}
        className={TEXT_ACTION}
      >
        {logout.isPending ? "로그아웃 중…" : "로그아웃"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={TEXT_ACTION}
      >
        회원 탈퇴
      </button>

      {/*
       * 되돌릴 수 없어 보이는 작업이라 확인을 거친다 — 연락처 공유 확인과 같은
       * 상자(`ConfirmDialog` 의 두 번째 사용처). 06 섹션에 확인 시안이 없어
       * 문구는 지었다 — 디자이너 확인 필요(선배 가이드 §7 #8). 명세가 말하는
       * 유예기간이 있다는 사실을 문구에 적는다.
       */}
      <ConfirmDialog
        open={confirming}
        onOpenChange={(open) => {
          if (!withdraw.isPending) setConfirming(open);
        }}
        title="탈퇴할까요?"
        confirmLabel="회원 탈퇴"
        busy={withdraw.isPending}
        busyLabel="탈퇴하는 중…"
        // 훅이 성공·실패와 무관하게 세션을 비우므로 어느 쪽이든 랜딩으로 간다
        onConfirm={() => withdraw.mutate(undefined, { onSettled: toLanding })}
      >
        <p className="text-body text-ink">
          탈퇴를 신청하면 바로 로그아웃돼요.
        </p>
        <p className="text-body-sm text-ink-soft">
          유예기간 안에 다시 로그인하면 탈퇴가 취소되고, 유예기간이 지나면
          계정이 삭제돼요.
        </p>
      </ConfirmDialog>
    </div>
  );
}

/** 시안의 글자 버튼 — Body/Small 보조색, 폭 72 · 높이 20(줄 높이 그대로) */
const TEXT_ACTION =
  "text-body-sm text-ink-soft hover:text-ink min-w-18 text-left disabled:opacity-60";
