import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import {
  isApiError,
  studentDepartmentsQuery,
  studentInterestsQuery,
  useSubmitGraduatedInfo,
  useSubmitStudentInfo,
  userInfoQuery,
  type GraduatedProfile,
  type UserInfo,
} from "@/api";
import { PageContainer } from "@/components/layout/page-container";
import { action } from "@/components/ui/action";
import { Field } from "@/components/ui/field";
import {
  MentorContactFields,
  MentorExtraFields,
  MentorWorkFields,
} from "@/features/profile/mentor-fields";
import {
  mentorEditDefaults,
  mentorEditSchema,
} from "@/features/profile/mentor-form";
import {
  StudentActivitiesField,
  StudentContactFields,
  StudentIdentityFields,
  StudentInterestsField,
  StudentPortfolioField,
} from "@/features/profile/student-fields";
import {
  activitiesOf,
  attachmentsOf,
  studentContactEmailOf,
  studentContactOf,
  studentEditDefaults,
  studentEditSchema,
} from "@/features/profile/student-form";
import { contactRequestOf, normalizeLink } from "@/lib/profile-form";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

/**
 * 정보 수정. 학생은 피그마 `Cheers / 정보 수정 · 학생`(338:7849 / 338:7637),
 * 선배는 `Cheers / 정보 수정 · 선배`(338:8984 / 338:8754).
 *
 * **한 장짜리 화면이라 마이페이지 레이아웃 밖에 선다** — `me_` 의 밑줄이
 * `me.tsx` 를 쓰지 않겠다는 표시다. 주소는 `/me/edit` 그대로다.
 *
 * **폼 본체는 가입 화면과 같다**(이슈 #10) — 스키마와 칸 묶음이
 * `features/profile/` 에 있고, 이 파일은 둘을 늘어놓고 저장만 한다.
 *
 * **전체 교체 방식이다.** 폼을 지금 내 정보로 채우고 전부 보낸다. 이름 ·
 * 닉네임은 가입 뒤로 바뀌지 않아(명세: 보내도 무시) 폼 밖의 읽기 전용 칸이다.
 */
export const Route = createFileRoute("/_app/me_/edit")({
  // 학생은 학과 · 관심 분야 목록이 있어야 칸을 그린다. 선배는 더 받을 게 없다
  loader: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(userInfoQuery());
    if (me.type === "student") {
      await Promise.all([
        context.queryClient.ensureQueryData(studentDepartmentsQuery()),
        context.queryClient.ensureQueryData(studentInterestsQuery()),
      ]);
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { role } = useSession();
  const { data: me } = useSuspenseQuery(userInfoQuery());
  const profile = me.graduated?.profile;

  return (
    <PageContainer className="flex flex-col items-center pt-8 pb-12 lg:pt-16 lg:pb-18">
      {/* 피그마 `Task workspace` — 1216 = 352 + 64 + 800 */}
      <div className="flex w-full flex-col gap-7 lg:w-304 lg:flex-row lg:items-start lg:gap-16">
        {/* 피그마 `Task introduction` — 가입 단계 인디케이터가 없다. 링크와 제목 사이 모바일 28 / 데스크톱 40 */}
        <div className="flex flex-col gap-7 lg:w-88 lg:shrink-0 lg:gap-10 lg:pt-4">
          {/* Label/Medium 14 보조색 */}
          <Link to="/me" className="text-label text-ink-soft self-start">
            ← 마이페이지
          </Link>
          <h1 className="text-task-title text-ink">내 정보 수정</h1>
        </div>

        {role === "mentor" && profile ? (
          <MentorEditForm me={me} profile={profile} />
        ) : role === "student" ? (
          <StudentEditForm me={me} />
        ) : (
          // 가드를 지나 여기 왔는데 선배 프로필이 없으면 서버 쪽 사고다
          <p role="alert" className="text-body text-ink-soft">
            프로필을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
          </p>
        )}
      </div>
    </PageContainer>
  );
}

/** 피그마 `Content` — 카드 껍데기는 데스크톱에만 있다 */
const FORM_CARD =
  "lg:border-line lg:bg-surface lg:shadow-work flex flex-col gap-7 lg:w-200 lg:shrink-0 lg:rounded-lg lg:border lg:p-10";

/* ───────────────── 학생 ───────────────── */

function StudentEditForm({ me }: { me: UserInfo }) {
  const navigate = useNavigate();
  const { data: departments } = useSuspenseQuery(studentDepartmentsQuery());
  const { data: interests } = useSuspenseQuery(studentInterestsQuery());
  const submit = useSubmitStudentInfo();
  const contactEmail = studentContactEmailOf(me);

  const form = useForm({
    resolver: zodResolver(studentEditSchema),
    mode: "all",
    defaultValues: studentEditDefaults(me),
  });

  const save = form.handleSubmit((values) =>
    submit.mutate(
      {
        department_id: values.departmentId,
        interests: values.interests,
        activities: activitiesOf(values.activities),
        // 화면에 칸이 없는 파일 첨부도 그대로 돌려보낸다 — 전체 교체라 안
        // 보내면 지워진다(`attachmentsOf` 참고)
        attachments: attachmentsOf(
          values.portfolioUrl,
          me.student?.profile?.attachments
        ),
        contact: studentContactOf(values, contactEmail),
      },
      // 가입 완료가 아니라 응답에 토큰이 없다. `keys.user` 무효화는 훅이 한다
      { onSuccess: () => void navigate({ to: "/me" }) }
    )
  );

  return (
    <FormProvider {...form}>
      <form noValidate className={FORM_CARD} onSubmit={save}>
        {/*
         * 시안은 이름을 고칠 수 있는 칸처럼 그렸지만 명세상 첫 저장 뒤로 바뀌지
         * 않는다(보내도 무시). 선배 정보 수정처럼 읽기 전용으로 세운다
         */}
        <StudentIdentityFields nameLocked departments={departments} />
        {/* 시안은 라벨과 칩 사이도 28 이다 — 가입 화면에 있는 설명 줄이 없다 */}
        <StudentInterestsField options={interests} className="gap-7" />

        <div className="bg-line h-px" />

        <StudentActivitiesField />
        <StudentPortfolioField />

        <div className="bg-line h-px" />

        <StudentContactFields contactEmail={contactEmail} />

        <SaveError error={submit.error} />
        <SaveActions busy={submit.isPending} disabled={!form.formState.isValid} />
      </form>
    </FormProvider>
  );
}

/* ───────────────── 선배 ───────────────── */

function MentorEditForm({
  me,
  profile,
}: {
  me: UserInfo;
  profile: GraduatedProfile;
}) {
  const navigate = useNavigate();
  const submit = useSubmitGraduatedInfo();

  const form = useForm({
    resolver: zodResolver(mentorEditSchema),
    mode: "all",
    defaultValues: mentorEditDefaults(me, profile),
  });

  const save = form.handleSubmit((values) =>
    submit.mutate(
      {
        company: values.company,
        department: values.department,
        job: values.job,
        hashtags: values.hashtags,
        // 시안은 LinkedIn 칸 하나, 명세는 배열(최대 5)이다. 두 번째 링크부터는
        // 이 화면이 보여주지 않으므로 보내지 않는다 — 전체 교체라 지워진다
        links: values.linkedin ? [normalizeLink(values.linkedin)] : [],
        // 임시: 이슈 #26 — 둘 다 필수, 둘 다 켠다(`contactRequestOf` 참고)
        contact: contactRequestOf(values.email, values.phone),
      },
      { onSuccess: () => void navigate({ to: "/me" }) }
    )
  );

  return (
    <FormProvider {...form}>
      <form noValidate className={FORM_CARD} onSubmit={save}>
        {/* 이름 · 닉네임 — 가입 뒤로는 바꿀 수 없다(명세: 보내도 무시) */}
        <div className="flex flex-col gap-7 lg:flex-row lg:items-start lg:gap-6">
          <Field
            label="이름"
            value={me.name ?? ""}
            readOnly
            hint="가입 후에는 변경할 수 없어요."
            className="lg:w-87"
          />
          <Field
            label="닉네임"
            value={profile.nickname}
            readOnly
            hint="가입 후에는 변경할 수 없어요."
            className="lg:w-87"
          />
        </div>

        <div className="bg-line h-px" />

        {/* 시안은 그냥 입력 칸이지만 가입과 같은 검색 칸 · 칩 입력을 쓴다(머리말) */}
        <MentorWorkFields />
        <MentorExtraFields linkedinPlaceholder="https://www.linkedin.com/in/…" />

        <div className="bg-line h-px" />

        {/* 마이페이지의 `연락처·알림 번호 수정` 이 여기로 온다(`#contact`) */}
        <MentorContactFields id="contact" />

        <SaveError error={submit.error} />
        <SaveActions busy={submit.isPending} disabled={!form.formState.isValid} />
      </form>
    </FormProvider>
  );
}

/* ───────────────── 공통 ───────────────── */

/** 피그마 `Save changes` — 위 8, `취소` 모바일 105 / 데스크톱 120 + `변경 내용 저장` 나머지 / 240 */
function SaveActions({ busy, disabled }: { busy: boolean; disabled: boolean }) {
  return (
    <div className="flex justify-end gap-3 pt-2">
      <Link
        to="/me"
        className={cn(action({ variant: "secondary" }), "text-button w-26.25 lg:w-30")}
      >
        취소
      </Link>
      <button
        type="submit"
        disabled={disabled || busy}
        className={cn(action(), "flex-1 lg:w-60 lg:flex-none")}
      >
        {busy ? "저장 중…" : "변경 내용 저장"}
      </button>
    </div>
  );
}

function SaveError({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <p role="alert" className="text-body-sm text-danger">
      {describeSaveError(error)}
    </p>
  );
}

function describeSaveError(error: unknown): string {
  if (!isApiError(error)) return "저장하지 못했습니다. 다시 시도해 주세요.";

  if (error.status === 400) return "입력한 내용을 다시 확인해 주세요.";
  if (error.status === 403) return "지금은 정보를 수정할 수 없어요.";
  return "저장하지 못했습니다. 다시 시도해 주세요.";
}
