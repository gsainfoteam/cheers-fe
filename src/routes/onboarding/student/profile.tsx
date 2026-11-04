import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import {
  studentDepartmentsQuery,
  studentInterestsQuery,
  userInfoQuery,
} from "@/api";
import { PageContainer } from "@/components/layout/page-container";
import { SignupProgress } from "@/components/signup-progress";
import { action } from "@/components/ui/action";
import {
  StudentIdentityFields,
  StudentInterestsField,
} from "@/features/profile/student-fields";
import { studentBasicsSchema } from "@/features/profile/student-form";
import { useStudentSignupDraft } from "@/lib/student-signup-draft";
import { cn } from "@/lib/utils";

/**
 * 학생 기본 정보. 피그마 `Cheers / 학생 기본 정보`(335:6814 / 335:6675).
 *
 * 앞의 세 화면과 같은 2열 뼈대지만 **카드가 넓다** — 이름·학과가 데스크톱에서
 * 좌우로 서야 해서 시안이 560 이 아니라 800 을 썼다(작업 영역 976 → 1216).
 *
 * 여기서 모은 값은 서버로 가지 않고 `student-signup-draft` 에 담긴다. 저장은
 * 다음 화면(추가 정보)에서 한 번에 일어난다 — 서버가 두 화면을 한 단계로
 * 보기 때문이다(`lib/onboarding-steps.ts`).
 *
 * 폼 본체(스키마 · 칸 묶음)는 정보 수정과 같이 쓴다 — `features/profile/`.
 */
export const Route = createFileRoute("/onboarding/student/profile")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(userInfoQuery()),
      context.queryClient.ensureQueryData(studentDepartmentsQuery()),
      context.queryClient.ensureQueryData(studentInterestsQuery()),
    ]),
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const { data: me } = useSuspenseQuery(userInfoQuery());
  const { data: departments } = useSuspenseQuery(studentDepartmentsQuery());
  const { data: interests } = useSuspenseQuery(studentInterestsQuery());
  const { draft, patch } = useStudentSignupDraft();

  /**
   * 구글 로그인이 이름을 주므로 보통은 이미 채워져 있다. 명세상 `name` 은
   * **내 정보의 이름이 null 일 때만** 받는 값이라, 있으면 고칠 수 없는 칸으로
   * 보여준다(시안의 도움말 "가입 후 변경할 수 없어요." 가 그 뜻이다).
   */
  const nameLocked = Boolean(me.name);

  const form = useForm({
    resolver: zodResolver(studentBasicsSchema(!nameLocked)),
    // 버튼을 처음부터 막으려면 값이 바뀔 때마다 검사해야 한다
    mode: "all",
    defaultValues: {
      name: draft.name || me.name || "",
      departmentId: draft.departmentId,
      interests: draft.interests,
    },
  });

  const next = form.handleSubmit((values) => {
    patch({
      name: nameLocked ? "" : values.name.trim(),
      departmentId: values.departmentId,
      interests: values.interests,
    });
    void navigate({ to: "/onboarding/student/extra" });
  });

  return (
    <PageContainer className="flex flex-col items-center pt-8 pb-12 lg:pt-16 lg:pb-18">
      {/* 피그마 `Task workspace` — 1216 = 352 + 64 + 800 */}
      <div className="flex w-full flex-col gap-7 lg:w-304 lg:flex-row lg:items-start lg:gap-16">
        {/* 피그마 `Task introduction` */}
        <div className="flex flex-col gap-7 lg:w-88 lg:shrink-0 lg:gap-10 lg:pt-4">
          {/* 모바일은 제목 위, 데스크톱은 제목 아래 */}
          <div className="order-first lg:order-last">
            <SignupProgress current={2} />
          </div>
          <div className="flex flex-col gap-3 lg:gap-5">
            <h1 className="text-task-title text-ink">기본 정보</h1>
            <p className="text-body text-ink-soft">
              커피챗을 신청할 때 선배에게 전달되는 정보예요.
            </p>
          </div>
        </div>

        {/* 피그마 `Content` — 카드 껍데기는 데스크톱에만 있다 */}
        <FormProvider {...form}>
          <form
            noValidate
            className="lg:border-line lg:bg-surface lg:shadow-work flex flex-col gap-7 lg:w-200 lg:shrink-0 lg:rounded-lg lg:border lg:p-10"
            onSubmit={next}
          >
            <StudentIdentityFields
              nameLocked={nameLocked}
              nameHint="가입 후 변경할 수 없어요."
              departments={departments}
            />
            <StudentInterestsField
              options={interests}
              description="하나 이상 선택해 주세요."
            />

            {/*
             * 피그마 `Form actions`.
             *
             * **`이전` 은 두지 않았다.** 시안에는 있지만 이 화면의 앞은 이미
             * 끝난 단계(본인 확인)라, `/onboarding` 가드가 돌아가려는 사람을
             * 곧바로 여기로 되돌려 보낸다. 누르면 제자리인 버튼이 된다.
             */}
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={!form.formState.isValid}
                className={cn(action(), "flex-1 lg:w-60 lg:flex-none")}
              >
                추가 정보 입력
              </button>
            </div>
          </form>
        </FormProvider>
      </div>
    </PageContainer>
  );
}
