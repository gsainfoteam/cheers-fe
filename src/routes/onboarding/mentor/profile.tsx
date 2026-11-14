import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { checkGraduatedNickname, userInfoQuery } from "@/api";
import { PageContainer } from "@/components/layout/page-container";
import { SignupProgressSlot } from "@/components/signup-progress";
import { action } from "@/components/ui/action";
import {
  MentorIdentityFields,
  MentorWorkFields,
} from "@/features/profile/mentor-fields";
import { mentorBasicsSchema } from "@/features/profile/mentor-form";
import {
  draftFromProfile,
  useMentorSignupDraft,
} from "@/lib/mentor-signup-draft";
import { cn } from "@/lib/utils";

/**
 * 선배 기본 정보. 피그마 `Cheers / 선배 기본 정보`(336:6988 / 336:6837),
 * 입력 완료(960:9668 / 960:9690), 회사명 검색(971:10278 / 971:12664),
 * 닉네임 칸 상태(960:10009 · 960:10010 · 960:10011).
 *
 * 부서는 선택 입력이다(시안 `부서 (선택)`, 동기화 가이드 3.4.1). 닉네임 중복은
 * **`다음` 을 누를 때 확인한다**(시안 주석 960:10010, 가이드 D3-2, 이슈 #43).
 * 확인은 예약이 아니라서 가입 완료의 409 되돌림도 그대로 둔다.
 *
 * 학생 기본 정보와 같은 뼈대(작업 영역 1216 = 352 + 64 + 800)다. 여기서 모은
 * 값은 서버로 가지 않고 `mentor-signup-draft` 에 담겨 추가 정보 화면의 저장
 * 한 번에 같이 실려 간다.
 *
 * 폼 본체(스키마 · 칸 묶음)는 정보 수정과 같이 쓴다 — `features/profile/`.
 */
export const Route = createFileRoute("/onboarding/mentor/profile")({
  loader: ({ context }) => context.queryClient.ensureQueryData(userInfoQuery()),
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const { data: me } = useSuspenseQuery(userInfoQuery());
  const { draft, patch } = useMentorSignupDraft();

  /**
   * 명함 재인증으로 돌아온 선배는 이미 프로필이 있다. 저장이 전체 교체
   * 방식이라 빈 폼으로 시작하면 원래 값이 지워지므로 그 값으로 채운다.
   * 초안에 이미 값이 있으면(추가 정보에서 `이전` 으로 왔다) 그쪽이 먼저다.
   */
  const profile = me.graduated?.profile ?? null;
  const [initial] = useState(() =>
    profile && !draft.company ? { ...draft, ...draftFromProfile(profile) } : draft
  );

  /** 학생과 같은 규칙 — 내 정보에 이름이 있으면 고칠 수 없는 칸이다 */
  const nameLocked = Boolean(me.name);
  /** 닉네임은 첫 저장 뒤로 바꿀 수 없다(명세: 이후 보내면 무시) */
  const nicknameLocked = Boolean(profile);

  /** `다음` 에서 닉네임 중복을 묻는 중 */
  const [checking, setChecking] = useState(false);

  const form = useForm({
    resolver: zodResolver(
      mentorBasicsSchema({
        nameRequired: !nameLocked,
        nicknameLocked,
        takenNickname: draft.takenNickname,
      })
    ),
    // 버튼을 처음부터 막고 닉네임 공백·특수문자를 치는 즉시 알리려면
    // 값이 바뀔 때마다 검사해야 한다
    mode: "all",
    defaultValues: {
      name: initial.name || me.name || "",
      nickname: initial.nickname,
      company: initial.company,
      company_id: initial.company_id,
      department: initial.department,
      job: initial.job,
    },
  });

  const next = form.handleSubmit(async (values) => {
    // 첫 가입만 묻는다. 재인증 선배의 닉네임은 이미 그 사람 것이다
    if (!nicknameLocked) {
      setChecking(true);
      let available = true;
      try {
        available = await checkGraduatedNickname(values.nickname);
      } catch {
        // 확인하지 못했으면 막지 않는다 — 가입 완료의 409 가 마지막 방어선이다
      } finally {
        setChecking(false);
      }
      if (!available) {
        // 초안에 남겨 두면 스키마가 이 이름을 계속 막는다(같은 이름을 다시 쳐도).
        // 스키마는 다음 렌더에 바뀌므로 지금 보일 오류는 직접 세운다
        patch({ takenNickname: values.nickname });
        form.setError(
          "nickname",
          { type: "taken", message: "이미 사용 중인 닉네임이에요." },
          { shouldFocus: true }
        );
        return;
      }
    }

    patch({
      name: nameLocked ? "" : values.name.trim(),
      nickname: values.nickname,
      company: values.company,
      company_id: values.company_id,
      department: values.department,
      job: values.job,
      // 재인증 선배의 나머지 값도 추가 정보로 넘긴다
      ...(profile && !draft.company
        ? {
            hashtags: initial.hashtags,
            linkedin: initial.linkedin,
            contact: initial.contact,
          }
        : {}),
    });
    void navigate({ to: "/onboarding/mentor/extra" });
  });

  return (
    <PageContainer className="flex flex-col items-center pt-8 pb-12 lg:pt-16 lg:pb-18">
      {/* 피그마 `Task workspace` — 1216 = 352 + 64 + 800 */}
      <div className="flex w-full flex-col gap-7 lg:w-304 lg:flex-row lg:items-start lg:gap-16">
        {/* 피그마 `Task introduction` */}
        {/* 모바일에서는 풀어서 단계 막대가 본문 전체를 기준으로 고정되게 한다 */}
        <div className="flex flex-col gap-7 max-lg:contents lg:w-88 lg:shrink-0 lg:gap-10 lg:pt-4">
          {/* 모바일은 제목 위에 고정, 데스크톱은 제목 아래 */}
          <SignupProgressSlot current={2} />
          <div className="flex flex-col gap-3 lg:gap-5">
            <h1 className="text-task-title text-ink">기본 정보</h1>
            {/* 텍스트 노드 이름은 예전 문구(`…사원증에 담아드려요.`)다. 화면 글자를 옮겼다 */}
            <p className="text-body text-ink-soft">
              회사와 직무 정보가 후배들에게 공개돼요.
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
            <MentorIdentityFields
              nameLocked={nameLocked}
              nicknameLocked={nicknameLocked}
            />
            <MentorWorkFields />

            {/*
             * 피그마 `Form actions`.
             *
             * **`이전` 은 두지 않았다** — 학생 기본 정보(설계 3-5d)와 같은 결정.
             * 앞 단계(명함 첨부)는 이미 끝났고, 서버가 `next_step=profile` 인
             * 사람의 명함 제출을 403 으로 막으며, `/onboarding` 가드도 곧바로
             * 여기로 되돌려 보낸다. 디자이너 확인 필요(선배 가이드 §7 #4).
             */}
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={!form.formState.isValid || checking}
                className={cn(action(), "flex-1 lg:w-60 lg:flex-none")}
              >
                {checking ? "확인 중…" : "다음"}
              </button>
            </div>
          </form>
        </FormProvider>
      </div>
    </PageContainer>
  );
}
