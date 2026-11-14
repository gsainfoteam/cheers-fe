import { useMemo, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { consentListQuery, useSubmitConsent, type Consent } from "@/api";
import { PageContainer } from "@/components/layout/page-container";
import { SignupProgress } from "@/components/signup-progress";
import { action } from "@/components/ui/action";
import { CheckRow } from "@/components/ui/check-row";
import {
  DialogBodySkeleton,
  ResponsiveDialog,
} from "@/components/ui/responsive-dialog";
import { embedUrl, isLegalDoc, type LegalDoc } from "@/lib/legal";
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
 * 본문 주소는 `lib/legal.ts` 가 들고 있다(푸터와 같은 곳).
 *
 * 서버가 실제로 주는 값은 `tos` / `privacy` 다(`7a9596a` 에서 확인). 모르는
 * 값이 오면 이름은 `type` 을, 본문은 서버가 준 `url` 을 그대로 쓴다 — 빈칸
 * 보다는 낫고, 화면에서 바로 드러난다.
 *
 * 이름은 체크 줄과 다이얼로그 제목에 쓰고, 피그마 시안 문구 그대로다
 * (`828:8731` / `828:8732`, `335:6380` / `335:6561`, 동기화 01장 D1-2).
 */
const CONSENT_LABEL: Record<LegalDoc, string> = {
  tos: "서비스 이용약관",
  privacy: "개인정보 수집·이용 동의",
};

function nameOf(consent: Consent): string {
  return isLegalDoc(consent.type) ? CONSENT_LABEL[consent.type] : consent.type;
}

function labelOf(consent: Consent): string {
  const name = nameOf(consent);
  return consent.is_required ? `[필수] ${name}` : name;
}

/** iframe 에 넣을 본문 주소. 약관 사이트 자체 헤더가 빠진 `/embedded/` 판이다 */
function urlOf(consent: Consent): string {
  return isLegalDoc(consent.type) ? embedUrl(consent.type) : consent.url;
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

      {/* 약관 본문. 설계 5.3 대로 PC 는 모달, 모바일은 전체 화면이다 */}
      <ResponsiveDialog
        open={opened !== null}
        onOpenChange={(next) => !next && setOpened(null)}
        title={opened ? nameOf(opened) : ""}
        bleed
      >
        {opened ? (
          // 약관마다 새로 마운트해야 로딩 상태가 처음부터 다시 돈다
          <TermsFrame
            key={opened.type}
            title={nameOf(opened)}
            src={urlOf(opened)}
          />
        ) : null}
      </ResponsiveDialog>
    </PageContainer>
  );
}

/**
 * 외부 약관 페이지(terms.gistory.me)를 그대로 끼워 보여준다.
 *
 * 본문을 받아와 다시 그리지 않고 iframe 을 쓰는 이유: 그 페이지는 완성된
 * HTML 문서(자체 스타일·목차)라서, 가져와 파싱하면 약관 사이트가 바뀔
 * 때마다 이쪽도 따라 고쳐야 한다. 그 서버는 `X-Frame-Options` /
 * `frame-ancestors` 를 걸지 않아 임베딩이 막히지 않는다(2026-11-14 확인).
 *
 * iframe 이 첫 화면을 그릴 때까지는 시안의 "불러오는 중" 화면
 * (`335:6348` / `335:6313`, `Loading paragraph`)을 위에 덮어 둔다.
 * `sandbox` 는 페이지가 쓰는 스크립트와 목차 앵커, 새 창 링크만 허용하고
 * **최상위 창을 이동시키는 것은 막는다.**
 */
function TermsFrame({ title, src }: { title: string; src: string }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      <iframe
        src={src}
        title={`${title} 전문`}
        onLoad={() => setLoaded(true)}
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="strict-origin-when-cross-origin"
        className="absolute inset-0 size-full border-0"
      />
      {loaded ? null : (
        // 기본 본문 영역과 같은 여백 — `bleed` 라서 여기서 직접 준다
        <div className="bg-surface absolute inset-0 flex flex-col gap-6 px-5 py-6 lg:px-8">
          <DialogBodySkeleton />
        </div>
      )}
    </>
  );
}
