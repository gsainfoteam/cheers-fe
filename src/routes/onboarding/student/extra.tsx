import { useState } from "react";
import {
  createFileRoute,
  redirect,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { isApiError, useSubmitStudentInfo, userInfoQuery } from "@/api";
import { PageContainer } from "@/components/layout/page-container";
import { SignupProgressSlot } from "@/components/signup-progress";
import { action } from "@/components/ui/action";
import {
  StudentActivitiesField,
  StudentAttachmentsField,
  StudentContactFields,
} from "@/features/profile/student-fields";
import {
  activitiesOf,
  attachmentRequestsOf,
  studentContactDefaults,
  studentContactEmailOf,
  studentExtraSchema,
  type StudentExtraValues,
} from "@/features/profile/student-form";
import { contactRequestFrom } from "@/lib/profile-form";
import { hasBasics, useStudentSignupDraft } from "@/lib/student-signup-draft";
import { cn } from "@/lib/utils";

/**
 * 학생 추가 정보. 피그마 `Cheers / 학생 추가 정보`(335:7095 / 335:6954), 참여
 * 활동 입력(875:30619 / 875:30665), 파일 첨부(923:44145 / 923:44552), 알림
 * 설정(943:9742 / 943:9806). 동기화 가이드 02장 2.6.
 *
 * 가입의 마지막 화면이다. 앞 화면이 담아 둔 기본 정보와 여기서 받은 값이
 * 합쳐져 `POST /user/student/info` **한 번**으로 저장되고, 그 응답에 새
 * 토큰이 실려 온다(`useSubmitStudentInfo` 가 받아 넣는다).
 *
 * 저장이 끝나면 `next_step` 이 null 이 되므로 라우터를 다시 평가시키기만
 * 하면 `/onboarding` 가드가 선배 둘러보기(`/mentors`)로 보낸다.
 *
 * 폼 본체(스키마 · 칸 묶음)는 정보 수정과 같이 쓴다 — `features/profile/`.
 */
export const Route = createFileRoute("/onboarding/student/extra")({
  /**
   * 새로고침하면 앞 화면의 값이 사라진다. 그 상태로 저장을 누르면 학과도
   * 관심 분야도 없이 요청이 나가 400 이 돌아오므로, 먼저 기본 정보로
   * 되돌려 보낸다.
   */
  beforeLoad: () => {
    if (!hasBasics(useStudentSignupDraft.getState().draft)) {
      throw redirect({ to: "/onboarding/student/profile" });
    }
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(userInfoQuery()),
  component: RouteComponent,
});

function RouteComponent() {
  const router = useRouter();
  const navigate = useNavigate();
  const { data: me } = useSuspenseQuery(userInfoQuery());
  const { draft, patch, reset } = useStudentSignupDraft();
  const submit = useSubmitStudentInfo();

  const form = useForm({
    resolver: zodResolver(studentExtraSchema),
    mode: "all",
    defaultValues: {
      activities: draft.activities,
      attachments: draft.attachments,
      // 처음 들어오면 이메일 체크 + 인증한 학교 이메일(가이드 2.6.3)
      contact: draft.contact ?? studentContactDefaults(null, studentContactEmailOf(me)),
    },
  });

  /** 첨부를 올리는 중. 끝나기 전에 저장하면 그 파일이 빠진다 */
  const [uploading, setUploading] = useState(false);

  /** `이전` 으로 돌아갈 때 쳐 둔 값을 보관함에 남긴다 — 검사는 하지 않는다 */
  const keep = (values: StudentExtraValues) =>
    patch({
      activities: values.activities,
      attachments: values.attachments,
      contact: values.contact,
    });

  const back = () => {
    keep(form.getValues());
    void navigate({ to: "/onboarding/student/profile" });
  };

  const finish = form.handleSubmit((values) => {
    if (draft.departmentId === null) return; // beforeLoad 가 막아주지만 타입을 위해

    submit.mutate(
      {
        // 명세상 `name` 은 내 정보의 이름이 null 일 때만 받는다
        ...(me.name ? {} : { name: draft.name }),
        department_id: draft.departmentId,
        // 고정 칩과 직접 넣은 `기타` 값이 한 배열이다(가이드 D2-3)
        interests: draft.interests,
        activities: activitiesOf(values.activities),
        attachments: attachmentRequestsOf(values.attachments),
        // 끈 채널의 값은 보내지 않는다(`contactRequestFrom`)
        contact: contactRequestFrom(values.contact),
      },
      {
        onSuccess: () => {
          // 가입이 끝났으니 임시 보관함을 비운다. 남겨두면 다음 가입(계정
          // 전환)에서 남의 값이 폼에 올라온다
          reset();
          void router.invalidate();
        },
      }
    );
  });

  const canSubmit = form.formState.isValid && !uploading && !submit.isPending;

  return (
    <PageContainer className="flex flex-col items-center pt-8 pb-12 lg:pt-16 lg:pb-18">
      {/* 피그마 `Task workspace` — 1216 = 352 + 64 + 800 */}
      <div className="flex w-full flex-col gap-7 lg:w-304 lg:flex-row lg:items-start lg:gap-16">
        {/* 피그마 `Task introduction` */}
        {/* 모바일에서는 풀어서 단계 막대가 본문 전체를 기준으로 고정되게 한다 */}
        <div className="flex flex-col gap-7 max-lg:contents lg:w-88 lg:shrink-0 lg:gap-10 lg:pt-4">
          {/* 모바일은 제목 위에 고정, 데스크톱은 제목 아래 */}
          <SignupProgressSlot current={3} type="student" />
          <div className="flex flex-col gap-3 lg:gap-5">
            <h1 className="text-task-title text-ink">추가 정보</h1>
            <p className="text-body text-ink-soft">
              참여 활동과 포트폴리오는 나중에 입력해도 괜찮아요.
            </p>
          </div>
        </div>

        {/* 피그마 `Content` — 카드 껍데기는 데스크톱에만 있다 */}
        <FormProvider {...form}>
          <form
            noValidate
            className="lg:border-line lg:bg-surface lg:shadow-work flex flex-col gap-7 lg:w-200 lg:shrink-0 lg:rounded-lg lg:border lg:p-10"
            onSubmit={finish}
          >
            <StudentActivitiesField />
            <StudentAttachmentsField onBusyChange={setUploading} />
            <StudentContactFields />

            {submit.error ? (
              <p role="alert" className="text-body-sm text-danger">
                {describeSubmitError(submit.error)}
              </p>
            ) : null}

            {/* 피그마 `Form actions` */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={back}
                className={cn(action({ variant: "secondary" }), "w-25 lg:w-26")}
              >
                이전
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className={cn(action(), "flex-1 lg:w-60 lg:flex-none")}
              >
                {submit.isPending ? "저장 중…" : uploading ? "파일 올리는 중…" : "가입 완료"}
              </button>
            </div>
          </form>
        </FormProvider>
      </div>
    </PageContainer>
  );
}

function describeSubmitError(error: unknown): string {
  if (!isApiError(error)) return "저장하지 못했습니다. 다시 시도해 주세요.";

  if (error.status === 404) return "학교 이메일 인증을 먼저 마쳐 주세요.";
  if (error.status === 403) return "지금은 이 단계를 저장할 수 없어요.";
  if (error.status === 400) return "입력한 내용을 다시 확인해 주세요.";
  return "저장하지 못했습니다. 다시 시도해 주세요.";
}
