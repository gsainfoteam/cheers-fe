import { useId, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  studentDepartmentsQuery,
  studentInterestsQuery,
  userInfoQuery,
} from "@/api";
import { PageContainer } from "@/components/layout/page-container";
import { SignupProgress } from "@/components/signup-progress";
import { action } from "@/components/ui/action";
import { Choice } from "@/components/ui/choice";
import { Field, Select } from "@/components/ui/field";
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
  const interestsLabelId = useId();

  /**
   * 구글 로그인이 이름을 주므로 보통은 이미 채워져 있다. 명세상 `name` 은
   * **내 정보의 이름이 null 일 때만** 받는 값이라, 있으면 고칠 수 없는 칸으로
   * 보여준다(시안의 도움말 "가입 후 변경할 수 없어요." 가 그 뜻이다).
   */
  const nameLocked = Boolean(me.name);

  const [name, setName] = useState(draft.name || me.name || "");
  const [departmentId, setDepartmentId] = useState<number | null>(
    draft.departmentId
  );
  const [selected, setSelected] = useState<string[]>(draft.interests);

  const toggleInterest = (interest: string) =>
    setSelected((current) =>
      current.includes(interest)
        ? current.filter((v) => v !== interest)
        : [...current, interest]
    );

  const canSubmit =
    (nameLocked || name.trim().length > 0) &&
    departmentId !== null &&
    selected.length > 0;

  const next = () => {
    patch({
      name: nameLocked ? "" : name.trim(),
      departmentId,
      interests: selected,
    });
    void navigate({ to: "/onboarding/student/extra" });
  };

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
        <form
          className="lg:border-line lg:bg-surface lg:shadow-work flex flex-col gap-7 lg:w-200 lg:shrink-0 lg:rounded-lg lg:border lg:p-10"
          onSubmit={(e) => {
            e.preventDefault();
            next();
          }}
        >
          {/* 피그마 `Identity fields` — 모바일은 세로, 데스크톱은 좌우 반반 */}
          <div className="flex flex-col gap-7 lg:flex-row lg:gap-6">
            <Field
              label="이름"
              autoComplete="name"
              maxLength={64}
              placeholder="실명을 입력해 주세요"
              value={name}
              readOnly={nameLocked}
              onChange={(e) => setName(e.target.value)}
              hint={nameLocked ? "가입 후 변경할 수 없어요." : undefined}
              className="lg:w-87"
            />
            <Select
              label="학과"
              value={departmentId ?? ""}
              onChange={(e) =>
                setDepartmentId(e.target.value ? Number(e.target.value) : null)
              }
              className="lg:w-87"
            >
              <option value="" disabled>
                학과를 선택해 주세요
              </option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </Select>
          </div>

          {/*
           * 피그마 `관심 분야`.
           *
           * `fieldset`/`legend` 가 아니라 `role="group"` 이다 — legend 는
           * flex 자식으로 취급되지 않는 브라우저가 있어 `gap` 이 한 칸만
           * 어긋난다. 묶음 이름은 `aria-labelledby` 로 같은 값을 낸다.
           */}
          <div
            role="group"
            aria-labelledby={interestsLabelId}
            className="flex flex-col gap-3"
          >
            <p id={interestsLabelId} className="text-label text-ink">
              관심 분야
            </p>
            <p className="text-body-sm text-ink-soft">하나 이상 선택해 주세요.</p>
            {/*
             * 시안의 칩 폭(모바일 112.33 · 데스크톱 113.33)은 칸을 똑같이
             * 나눈 값이다 — 353 을 3열로, 720 을 6열로 나누면 정확히 그 수가
             * 나온다. 그래서 flex-wrap 이 아니라 격자로 짠다.
             */}
            <div className="grid grid-cols-3 gap-2 lg:grid-cols-6">
              {interests.map((interest) => (
                <Choice
                  key={interest}
                  selected={selected.includes(interest)}
                  onClick={() => toggleInterest(interest)}
                >
                  {interest}
                </Choice>
              ))}
            </div>
          </div>

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
              disabled={!canSubmit}
              className={cn(action(), "flex-1 lg:w-60 lg:flex-none")}
            >
              추가 정보 입력
            </button>
          </div>
        </form>
      </div>
    </PageContainer>
  );
}
