import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { userInfoQuery } from "@/api";
import { PageContainer } from "@/components/layout/page-container";
import { SignupProgress } from "@/components/signup-progress";
import { action } from "@/components/ui/action";
import { Field } from "@/components/ui/field";
import { SearchSelect } from "@/components/ui/search-select";
import {
  draftFromProfile,
  useMentorSignupDraft,
} from "@/lib/mentor-signup-draft";
// 회사 목록 API 가 아직 없어 결과는 늘 비어 있다 — 정보 수정과 같은 함수다
import { searchCompanies } from "@/lib/mentor-profile-form";
import { describeNicknameProblem, nicknameProblem } from "@/lib/nickname";
import { cn } from "@/lib/utils";

/**
 * 선배 기본 정보. 피그마 `Cheers / 선배 기본 정보`(336:6988 / 336:6837),
 * 입력 완료(960:9668 / 960:9690), 회사명 검색(971:10278 / 971:12664),
 * 닉네임 칸 상태(960:10009 · 960:10010 · 960:10011).
 *
 * 학생 기본 정보와 같은 뼈대(작업 영역 1216 = 352 + 64 + 800)다. 여기서 모은
 * 값은 서버로 가지 않고 `mentor-signup-draft` 에 담겨 추가 정보 화면의 저장
 * 한 번에 같이 실려 간다.
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

  const [name, setName] = useState(initial.name || me.name || "");
  const [nickname, setNickname] = useState(initial.nickname);
  const [nicknameTouched, setNicknameTouched] = useState(false);
  const [company, setCompany] = useState(initial.company);
  const [companyQuery, setCompanyQuery] = useState(initial.company);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [department, setDepartment] = useState(initial.department);
  const [job, setJob] = useState(initial.job);

  const problem = nicknameLocked ? undefined : nicknameProblem(nickname);
  /**
   * 공백·특수문자는 치는 즉시 알린다. 길이와 조합 중인 자모는 칸을 떠난
   * 뒤에만 — 한 글자 쳤을 뿐인데 "2~10자" 가 뜨거나, `반ㄷ` 처럼 조합하는
   * 도중에 빨간 칸이 깜빡이면 안 된다.
   */
  const nicknameError =
    problem && (problem === "space" || problem === "symbol" || nicknameTouched)
      ? describeNicknameProblem(problem)
      : // 저장 응답이 중복이라고 돌려보냈을 때. 확인 API 가 없어 이 경로뿐이다
        draft.takenNickname && draft.takenNickname === nickname
        ? "이미 사용 중인 닉네임이에요."
        : undefined;

  const canSubmit =
    (nameLocked || name.trim().length > 0) &&
    (nicknameLocked || (!problem && nickname !== draft.takenNickname)) &&
    company.trim().length > 0 &&
    department.trim().length > 0 &&
    job.trim().length > 0;

  const next = () => {
    patch({
      name: nameLocked ? "" : name.trim(),
      nickname,
      company: company.trim(),
      department: department.trim(),
      job: job.trim(),
      // 재인증 선배의 나머지 값도 추가 정보로 넘긴다
      ...(profile && !draft.company
        ? {
            hashtags: initial.hashtags,
            linkedin: initial.linkedin,
            email: initial.email,
            phone: initial.phone,
          }
        : {}),
    });
    void navigate({ to: "/onboarding/mentor/extra" });
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
            {/* 텍스트 노드 이름은 예전 문구(`…사원증에 담아드려요.`)다. 화면 글자를 옮겼다 */}
            <p className="text-body text-ink-soft">
              회사와 직무 정보가 후배들에게 공개돼요.
            </p>
          </div>
        </div>

        {/* 피그마 `Content` — 카드 껍데기는 데스크톱에만 있다 */}
        <form
          noValidate
          className="lg:border-line lg:bg-surface lg:shadow-work flex flex-col gap-7 lg:w-200 lg:shrink-0 lg:rounded-lg lg:border lg:p-10"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) next();
          }}
        >
          {/* 피그마 `Identity fields` — 모바일은 세로, 데스크톱은 좌우 반반 */}
          <div className="flex flex-col gap-7 lg:flex-row lg:items-start lg:gap-6">
            <Field
              label="이름 (비공개)"
              autoComplete="name"
              maxLength={64}
              placeholder="이름을 입력하세요"
              value={name}
              readOnly={nameLocked}
              onChange={(e) => setName(e.target.value)}
              hint="가입 후 변경할 수 없어요."
              className="lg:w-87"
            />
            <Field
              label="닉네임"
              autoComplete="nickname"
              maxLength={10}
              placeholder="사원증에 표시될 닉네임을 입력하세요"
              value={nickname}
              readOnly={nicknameLocked}
              onChange={(e) => setNickname(e.target.value)}
              onBlur={() => setNicknameTouched(true)}
              hint="사원증에 표시돼요. 가입 후 변경할 수 없어요."
              error={nicknameError}
              className="lg:w-87"
            />
          </div>

          {/* 피그마 `회사명 검색 및 선택` — 데스크톱은 칸이 펼쳐지고, 모바일은 전체 화면 */}
          <SearchSelect
            label="회사명"
            placeholder="회사명을 검색하여 선택하세요"
            searchTitle="회사명 검색"
            maxLength={128}
            value={company}
            onSelect={(value) => {
              setCompany(value);
              setCompanyQuery(value);
            }}
            query={companyQuery}
            onQueryChange={setCompanyQuery}
            results={searchCompanies(companyQuery)}
            open={companyOpen}
            onOpenChange={setCompanyOpen}
          />

          {/* 피그마 `Work fields` */}
          <div className="flex flex-col gap-7 lg:flex-row lg:gap-6">
            <Field
              label="부서 (비공개)"
              autoComplete="organization-title"
              maxLength={128}
              placeholder="부서를 입력하세요"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="lg:w-87"
            />
            <Field
              label="직무"
              maxLength={128}
              placeholder="직무를 입력하세요"
              value={job}
              onChange={(e) => setJob(e.target.value)}
              className="lg:w-87"
            />
          </div>

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
              disabled={!canSubmit}
              className={cn(action(), "flex-1 lg:w-60 lg:flex-none")}
            >
              다음
            </button>
          </div>
        </form>
      </div>
    </PageContainer>
  );
}
