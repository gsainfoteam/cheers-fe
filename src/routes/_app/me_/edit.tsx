import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  isApiError,
  useSubmitGraduatedInfo,
  userInfoQuery,
  type UserInfo,
} from "@/api";
import { PageContainer } from "@/components/layout/page-container";
import { MentorContactFields } from "@/components/mentor-contact-fields";
import { action } from "@/components/ui/action";
import { Field } from "@/components/ui/field";
import { SearchSelect } from "@/components/ui/search-select";
import { TagInput } from "@/components/ui/tag-input";
import {
  contactInvalid,
  contactRequestOf,
  formatPhone,
  isValidLink,
  normalizeLink,
  searchCompanies,
} from "@/lib/mentor-profile-form";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

/**
 * 정보 수정. 선배는 피그마 `Cheers / 정보 수정 · 선배`(338:8984 / 338:8754).
 *
 * **한 장짜리 화면이라 마이페이지 레이아웃 밖에 선다** — `me_` 의 밑줄이
 * `me.tsx` 를 쓰지 않겠다는 표시다. 주소는 `/me/edit` 그대로다.
 *
 * ⚠️ 이 시안은 가입 화면의 최신 시안을 아직 따라오지 않았다 — 회사명이
 * 검색 칸이 아니라 그냥 입력 칸이고, 해시태그도 칩이 아니라 글자 한 줄이다
 * (피그마 TODO `889:31017` *"가입 단계 디자인 결정 후 수정 섹션도 통일"*).
 * **가입 화면과 같은 컴포넌트를 쓴다** — 수정만 자유 입력으로 두면 가입 때
 * 막은 표기 흔들림(삼성전자 / 삼성 전자)이 여기서 다시 생긴다.
 *
 * **전체 교체 방식이다.** 폼을 `me.graduated.profile` 로 채우고 전부 보낸다
 * — 빠진 `hashtags` 는 빈 배열로 교체된다. `nickname`·`name` 은 보내도
 * 무시되므로 싣지 않는다.
 */
export const Route = createFileRoute("/_app/me_/edit")({
  component: RouteComponent,
});

function RouteComponent() {
  const { role } = useSession();
  const { data: me } = useSuspenseQuery(userInfoQuery());
  const profile = me.graduated?.profile;

  if (role !== "mentor" || !profile) {
    // 학생 정보 수정은 학생 가이드의 범위다
    return (
      <PageContainer className="pt-8 pb-12 lg:pt-16 lg:pb-18">
        <p className="text-body text-ink-soft">정보 수정은 아직 준비 중이에요.</p>
      </PageContainer>
    );
  }

  return <MentorEditForm me={me} profile={profile} />;
}

type Profile = NonNullable<NonNullable<UserInfo["graduated"]>["profile"]>;

function MentorEditForm({ me, profile }: { me: UserInfo; profile: Profile }) {
  const navigate = useNavigate();
  const submit = useSubmitGraduatedInfo();

  const [company, setCompany] = useState(profile.company);
  const [companyQuery, setCompanyQuery] = useState(profile.company);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [department, setDepartment] = useState(profile.department);
  const [job, setJob] = useState(profile.job);
  const [hashtags, setHashtags] = useState(profile.hashtags);
  const [linkedin, setLinkedin] = useState(profile.links[0] ?? "");
  const [linkTouched, setLinkTouched] = useState(false);
  const [email, setEmail] = useState(profile.contact?.email ?? me.email ?? "");
  // 서버는 숫자만 준다. 시안처럼 `010-0000-0000` 으로 보여주고, 보낼 때 다시 숫자만 남긴다
  const [phone, setPhone] = useState(formatPhone(profile.contact?.phone ?? ""));

  const linkInvalid = linkedin.trim().length > 0 && !isValidLink(linkedin);

  const canSubmit =
    company.trim().length > 0 &&
    department.trim().length > 0 &&
    job.trim().length > 0 &&
    !linkInvalid &&
    !contactInvalid(email, phone) &&
    !submit.isPending;

  const save = () =>
    submit.mutate(
      {
        company: company.trim(),
        department: department.trim(),
        job: job.trim(),
        hashtags,
        // 시안은 LinkedIn 칸 하나, 명세는 배열(최대 5)이다. 두 번째 링크부터는
        // 이 화면이 보여주지 않으므로 보내지 않는다 — 전체 교체라 지워진다
        links: linkedin.trim() ? [normalizeLink(linkedin)] : [],
        // 임시: 이슈 #26 — 둘 다 필수, 둘 다 켠다(`contactRequestOf` 참고)
        contact: contactRequestOf(email, phone),
      },
      // 가입 완료가 아니라 응답에 토큰이 없다. `keys.user` 무효화는 훅이 한다
      { onSuccess: () => void navigate({ to: "/me" }) }
    );

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

        {/* 피그마 `Content` — 카드 껍데기는 데스크톱에만 있다 */}
        <form
          noValidate
          className="lg:border-line lg:bg-surface lg:shadow-work flex flex-col gap-7 lg:w-200 lg:shrink-0 lg:rounded-lg lg:border lg:p-10"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) save();
          }}
        >
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

          {/* 시안은 그냥 입력 칸이지만 가입과 같은 검색 칸을 쓴다(위 머리말) */}
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

          {/* 시안은 글자 한 줄이지만 가입과 같은 칩 입력을 쓴다 */}
          <TagInput
            label="해시태그 (선택)"
            placeholder="예) 전기전자"
            value={hashtags}
            onChange={setHashtags}
            max={5}
            maxLength={20}
          />

          <Field
            label="LinkedIn 프로필 링크 (선택)"
            // `type="url"` 을 쓰지 않는다 — 스킴 없는 주소를 브라우저가 틀렸다고 본다
            inputMode="url"
            autoComplete="url"
            maxLength={2048}
            placeholder="https://www.linkedin.com/in/…"
            value={linkedin}
            onChange={(e) => setLinkedin(e.target.value)}
            onBlur={() => setLinkTouched(true)}
            error={
              linkTouched && linkInvalid ? "링크 주소를 확인해 주세요." : undefined
            }
          />

          <div className="bg-line h-px" />

          {/* 마이페이지의 `연락처·알림 번호 수정` 이 여기로 온다(`#contact`) */}
          <MentorContactFields
            id="contact"
            email={email}
            phone={phone}
            onEmailChange={setEmail}
            onPhoneChange={setPhone}
          />

          {submit.error ? (
            <p role="alert" className="text-body-sm text-danger">
              {describeSaveError(submit.error)}
            </p>
          ) : null}

          {/* 피그마 `Save changes` — 위 8, `취소` 모바일 105 / 데스크톱 120 + `변경 내용 저장` 나머지 / 240 */}
          <div className="flex justify-end gap-3 pt-2">
            <Link
              to="/me"
              className={cn(
                action({ variant: "secondary" }),
                "text-button w-26.25 lg:w-30"
              )}
            >
              취소
            </Link>
            <button
              type="submit"
              disabled={!canSubmit}
              className={cn(action(), "flex-1 lg:w-60 lg:flex-none")}
            >
              {submit.isPending ? "저장 중…" : "변경 내용 저장"}
            </button>
          </div>
        </form>
      </div>
    </PageContainer>
  );
}

function describeSaveError(error: unknown): string {
  if (!isApiError(error)) return "저장하지 못했습니다. 다시 시도해 주세요.";

  if (error.status === 400) return "입력한 내용을 다시 확인해 주세요.";
  if (error.status === 403) return "지금은 정보를 수정할 수 없어요.";
  return "저장하지 못했습니다. 다시 시도해 주세요.";
}
