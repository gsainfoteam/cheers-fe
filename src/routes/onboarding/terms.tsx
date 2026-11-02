import { useMemo, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { consentListQuery, useSubmitConsent, type Consent } from "@/api";
import chevronIcon from "@/assets/icons/chevron-right.svg";
import checkInverse from "@/assets/icons/check-inverse.svg";
import { PageContainer } from "@/components/layout/page-container";
import { SignupProgress } from "@/components/signup-progress";
import { action } from "@/components/ui/action";
import {
  DialogBodySkeleton,
  ResponsiveDialog,
} from "@/components/ui/responsive-dialog";
import { cn } from "@/lib/utils";

/**
 * 약관 동의. 피그마 `Cheers / 약관 동의`(334:6123 / 334:6011).
 *
 * 학생/선배 공통이다 — 항목 데이터만 서버가 role 에 맞춰 내려준다.
 *
 * 두 폭의 차이는 로그인 화면과 같은 꼴이다. 모바일은 한 줄로 쌓고 카드
 * 껍데기가 없다. 데스크톱은 2열(왼쪽 제목+단계, 오른쪽 카드)이다.
 * **순서도 바뀐다** — 모바일은 단계 막대가 제목 위에 오고, 데스크톱은
 * 제목 아래로 내려간다. 그래서 `order` 로 자리를 바꾼다.
 */
export const Route = createFileRoute("/onboarding/terms")({
  loader: ({ context }) => context.queryClient.ensureQueryData(consentListQuery()),
  component: RouteComponent,
});

/**
 * 서버가 주는 `type` 은 자유 문자열이라 사람이 읽을 이름을 코드가 들고 있다.
 *
 * **실제 값은 아직 확인하지 못했다.** 시안 문구에 맞춰 둘을 적어 뒀고,
 * 모르는 값이 오면 `type` 을 그대로 보여준다 — 빈칸보다는 낫고, 개발 중
 * `/verify.html` 로 실제 응답을 보면 바로 드러난다.
 */
const CONSENT_LABEL: Record<string, string> = {
  terms_of_service: "서비스 이용약관",
  privacy_policy: "개인정보 수집·이용 동의",
};

function labelOf(consent: Consent): string {
  const name = CONSENT_LABEL[consent.type] ?? consent.type;
  return consent.is_required ? `[필수] ${name}` : name;
}

function RouteComponent() {
  const { data: consents } = useSuspenseQuery(consentListQuery());
  const submit = useSubmitConsent();
  const router = useRouter();

  const [agreed, setAgreed] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(consents.map((c) => [c.type, c.agreed]))
  );
  /** 열려 있는 약관 본문. 닫혀 있으면 null */
  const [opened, setOpened] = useState<Consent | null>(null);

  const allChecked = consents.every((c) => agreed[c.type]);
  /** 필수를 다 체크해야 넘어간다. 선택 항목은 막지 않는다 */
  const canSubmit = useMemo(
    () => consents.every((c) => !c.is_required || agreed[c.type]),
    [consents, agreed]
  );

  const toggleAll = () => {
    const next = !allChecked;
    setAgreed(Object.fromEntries(consents.map((c) => [c.type, next])));
  };

  const next = () => {
    submit.mutate(
      {
        consents: consents.map((c) => ({
          type: c.type,
          version: c.version,
          agreed: Boolean(agreed[c.type]),
        })),
      },
      // 다음 화면은 가드가 정한다. 새 `next_step` 을 받은 뒤 라우터를
      // 다시 평가시키면 `/onboarding` 가드가 알아서 보낸다
      { onSuccess: () => void router.invalidate() }
    );
  };

  return (
    <PageContainer className="flex flex-col items-center pt-8 pb-12 lg:pt-16 lg:pb-18">
      {/* 피그마 `Task workspace` */}
      <div className="flex w-full flex-col gap-7 lg:w-244 lg:flex-row lg:items-start lg:gap-16">
        {/* 피그마 `Task introduction` */}
        <div className="flex flex-col gap-7 lg:w-88 lg:shrink-0 lg:gap-10 lg:pt-4">
          {/* 모바일은 제목 위, 데스크톱은 제목 아래 */}
          <div className="order-first lg:order-last">
            <SignupProgress current={0} />
          </div>
          <div className="flex flex-col gap-3 lg:gap-5">
            <h1 className="text-task-title text-ink">약관 동의</h1>
            <p className="text-body text-ink-soft">
              서비스 이용에 필요한 약관을 확인해 주세요.
            </p>
          </div>
        </div>

        {/* 피그마 `Content` — 카드 껍데기는 데스크톱에만 있다 */}
        <div className="lg:border-line lg:bg-surface lg:shadow-work flex flex-col gap-7 lg:w-140 lg:shrink-0 lg:rounded-lg lg:border lg:p-10">
          {/* 피그마 `Action / consentChecked` — 전체 동의 */}
          <CheckRow
            label="전체 동의"
            checked={allChecked}
            onChange={toggleAll}
          />

          <div className="bg-line h-px" />

          {/* 피그마 `Required agreements` */}
          <div className="flex flex-col gap-4">
            {consents.map((consent) => (
              <CheckRow
                key={consent.type}
                label={labelOf(consent)}
                checked={Boolean(agreed[consent.type])}
                onChange={() =>
                  setAgreed((prev) => ({
                    ...prev,
                    [consent.type]: !prev[consent.type],
                  }))
                }
                onOpen={() => setOpened(consent)}
              />
            ))}
          </div>

          <button
            type="button"
            className={cn(action(), "w-full")}
            disabled={!canSubmit || submit.isPending}
            onClick={next}
          >
            {submit.isPending ? "저장 중…" : "동의하고 다음"}
          </button>

          {submit.error ? (
            <p role="alert" className="text-body-sm text-danger">
              동의 저장에 실패했습니다. 다시 시도해 주세요.
            </p>
          ) : null}
        </div>
      </div>

      {/*
       * 약관 본문. 설계 5.3 대로 PC 는 모달, 모바일은 전체 화면이다.
       *
       * 본문은 서버가 준 `url` 에 있다. 여기서는 아직 받아오지 않고 뼈대만
       * 보여준다 — 그 URL 이 HTML 인지 마크다운인지, 교차 출처인지에 따라
       * 받는 방법이 갈려서 실제 응답을 한 번 봐야 한다.
       */}
      <ResponsiveDialog
        open={opened !== null}
        onOpenChange={(next) => !next && setOpened(null)}
        title={opened ? (CONSENT_LABEL[opened.type] ?? opened.type) : ""}
      >
        <DialogBodySkeleton />
      </ResponsiveDialog>
    </PageContainer>
  );
}

/**
 * 피그마 `Cheers / Checkbox`(332:6136).
 *
 * 네이티브 `<input type="checkbox">` 를 숨기고 그 위에 시안 모양을 그린다.
 * 라이브러리를 쓰지 않은 이유: 여기 필요한 건 켜짐/꺼짐뿐이고, 네이티브가
 * 레이블 연결·키보드·폼 제출을 이미 전부 해 준다.
 *
 * 오른쪽 꺾쇠는 **본문을 여는 따로 떨어진 버튼**이다. 체크 영역 안에 두면
 * 약관을 읽으려다 동의가 토글된다.
 */
function CheckRow({
  label,
  checked,
  onChange,
  onOpen,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  onOpen?: () => void;
}) {
  return (
    <div className="flex h-12 w-full items-center justify-between py-2">
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="peer sr-only"
        />
        <span
          className={cn(
            "flex size-[22px] shrink-0 items-center justify-center rounded-sm border",
            "peer-focus-visible:ring-focus/50 peer-focus-visible:ring-3",
            checked ? "bg-ink-fill border-ink" : "bg-surface border-line-strong"
          )}
        >
          {checked ? (
            <img src={checkInverse} alt="" className="w-[13px]" />
          ) : null}
        </span>
        <span className="text-body-sm text-ink">{label}</span>
      </label>

      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          aria-label={`${label} 전문 보기`}
          className="flex size-5 shrink-0 items-center justify-center"
        >
          <img src={chevronIcon} alt="" className="h-[13px]" />
        </button>
      ) : null}
    </div>
  );
}
