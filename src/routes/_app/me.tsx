import { Link, createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { userInfoQuery } from "@/api";
import { AccountActions } from "@/components/account-actions";
import { EmployeeBadge } from "@/components/employee-badge";
import { badgeDataOf, hashtagText } from "@/components/employee-badge-data";
import { PageContainer } from "@/components/layout/page-container";
import { action } from "@/components/ui/action";
import { AttachmentGroup } from "@/components/ui/attachment-group";
import { ProfileRow } from "@/components/ui/profile-row";
import {
  studentBasicRowsOf,
  studentContactOf,
} from "@/features/profile/student-profile-rows";
import { mySharedContactOf } from "@/lib/mentor-contact";
import { formatPhone, httpUrlOrNull, linkLabelOf } from "@/lib/profile-form";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

/**
 * 마이페이지. 학생은 피그마 `Cheers / 마이페이지 · 학생`(337:8236 / 337:8086,
 * 동기화 가이드 05장 5.2), 선배는 `Cheers / 마이페이지 · 선배`(338:8549 /
 * 338:8341, 06장 6.2).
 *
 * 두 역할이 **같은 뼈대**(`MyPageCard`)다 — 제목, 카드 한 장(구획들 + 오른쪽
 * 아래 `내 정보 수정`), 로그아웃 · 회원 탈퇴. 예전 두 열 뼈대 · 고양이 도장 ·
 * `ProfileIdentity` · 선배의 `사원증 미리보기`(`me/preview`)는 05 · 06장
 * 시안에서 없어져 지웠다. 미리보기 모달이 사라져 이 화면은 더 이상 레이아웃이
 * 아니다. 정보 수정은 `me_/edit` 으로 따로 선다.
 *
 * 데이터는 전부 내 정보(`GET /user/info`)에서 온다. 추가 요청이 없다.
 */
export const Route = createFileRoute("/_app/me")({
  component: RouteComponent,
});

function RouteComponent() {
  const { role } = useSession();
  return role === "mentor" ? <MentorMyPage /> : <StudentMyPage />;
}

/** 가드를 지나 여기 왔는데 프로필이 없으면 서버 쪽 사고다 */
function MissingProfile() {
  return (
    <PageContainer className="pt-8 pb-12 lg:pt-14 lg:pb-16">
      <p role="alert" className="text-body text-ink-soft">
        프로필을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
      </p>
    </PageContainer>
  );
}

/**
 * 뼈대(05장 5.2.1). 피그마 `Content`(학생 1251:9151 / 1251:9704, 선배 338:8552 /
 * 338:8344) — 제목, 카드 한 장(구획들 + 오른쪽 아래 `내 정보 수정`),
 * 로그아웃 · 회원 탈퇴. 카드와 계정 줄 사이 구분선은 없어졌다.
 *
 * 구획 사이는 모바일 40 · 데스크톱 48, 구획 → 버튼은 모바일 40 · 데스크톱 24.
 * 시안의 `로그인 정보` 구획은 만들지 않는다(D5-2, 선배도 같다).
 */
function MyPageCard({ children }: { children: React.ReactNode }) {
  return (
    <PageContainer className="flex flex-col items-center pt-8 pb-12 lg:pt-14 lg:pb-16">
      <div className="flex w-full flex-col gap-8 lg:w-280">
        {/* 모바일 Task/Title(32/44), 데스크톱 Display/Page(36/48) */}
        <h1 className="text-task-title lg:text-page text-ink">마이페이지</h1>

        {/* 피그마 `Profile layout` */}
        <div className="bg-surface border-line shadow-work flex flex-col items-end gap-10 rounded-lg border p-6 lg:gap-6 lg:p-8">
          <div className="flex w-full flex-col gap-10 lg:gap-12">{children}</div>
          {/* 피그마 Button Secondary — 글자에 맞춘 폭, 오른쪽 아래 */}
          <Link to="/me/edit" className={action({ variant: "secondary" })}>
            내 정보 수정
          </Link>
        </div>

        {/* 피그마 `Account management` */}
        <AccountActions />
      </div>
    </PageContainer>
  );
}

/** 카드 안 구획 하나. 제목 H3 + 설명 한 줄, 그 아래 내용 */
function MyPageSection({
  title,
  description,
  className,
  children,
}: {
  title: string;
  description: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-col gap-1">
        <h2 className="text-h3 text-ink">{title}</h2>
        <p className="text-body-sm text-ink-soft">{description}</p>
      </div>
      {children}
    </section>
  );
}

/* ───────────────── 학생 ───────────────── */

function StudentMyPage() {
  const queryClient = useQueryClient();
  const { data: me } = useSuspenseQuery(userInfoQuery());
  const profile = me.student?.profile;
  if (!profile) return <MissingProfile />;

  const contact = studentContactOf(me);

  /** presigned 첨부 URL 이 만료됐을 수 있어 누를 때 내 정보를 다시 받는다 */
  const refreshAttachments = async () =>
    (
      await queryClient.fetchQuery({
        ...userInfoQuery(),
        // presigned URL 의 수명을 모르므로 1분이 지났으면 새로 받는다
        staleTime: 60_000,
      })
    ).student?.profile?.attachments ?? [];

  return (
    <MyPageCard>
      {/* 피그마 `내 프로필`(1251:9157 / 1251:9709) */}
      <MyPageSection
        title="내 프로필"
        description="커피챗 신청 시 선배에게 프로필이 전달돼요."
      >
        <dl>
          {studentBasicRowsOf(me).map((row) => (
            <ProfileRow key={row.label} label={row.label} value={row.value} size="document" />
          ))}
        </dl>
        <AttachmentGroup
          attachments={profile.attachments}
          refresh={refreshAttachments}
          density="comfortable"
        />
      </MyPageSection>

      {/*
       * 피그마 `연락처`(1251:9170 / 1251:9722). 선배가 수락한 뒤에만 공개된다
       * (정책 변경 D5-1). 순서가 전화번호 → 이메일이다 — 신청 화면과 반대
       */}
      <MyPageSection
        title="연락처"
        description="커피챗을 수락한 선배에게만 연락처가 공개 돼요."
      >
        <dl>
          <ProfileRow label="전화번호" value={contact.phone} size="document" />
          <ProfileRow label="이메일" value={contact.email} size="document" />
        </dl>
      </MyPageSection>
    </MyPageCard>
  );
}

/* ───────────────── 선배 ───────────────── */

/**
 * 06장 6.2. 구획 둘 — `공개 사원증 정보`(줄 여섯 + 사원증), `비공개 정보`
 * (이름 · 전화번호 · 이메일). 옛 `연락 설정` 카드(`공유할 연락처` /
 * `신청 알림`)와 `사원증 미리보기` 버튼은 시안에서 없어졌다. 연락처는
 * `비공개 정보` 의 두 줄로 들어왔다.
 */
function MentorMyPage() {
  const { data: me } = useSuspenseQuery(userInfoQuery());
  const profile = me.graduated?.profile;
  if (!profile) return <MissingProfile />;

  // 커피챗 참여 설정에서 켠 채널만 — 수락한 학생에게 공유되는 값과 같다(D3-3)
  const contact = mySharedContactOf(me);
  const linkedin = httpUrlOrNull(profile.links[0]);

  return (
    <MyPageCard>
      {/*
       * 피그마 `공개 사원증 정보`(1200:12446 / 1200:12888). 데스크톱은 구획
       * (제목 + 줄) | 32 | 사원증 240 — 사원증 위가 제목 위와 맞는다. 모바일은
       * 줄 아래 16 에 사원증(위아래 12)
       */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-8">
        <MyPageSection
          title="공개 사원증 정보"
          description="모든 학생에게 기본 정보가 공개 돼요."
          className="min-w-0 lg:flex-1"
        >
          <dl>
            <ProfileRow label="닉네임" value={profile.nickname} size="document" />
            <ProfileRow label="회사" value={profile.company} size="document" />
            {/* 부서는 선택 입력이라 null 일 수 있다(3.4.1). 시안 자리가 회사 아래로 옮겨 왔다 */}
            <ProfileRow label="부서" value={profile.department || null} size="document" />
            <ProfileRow label="직무" value={profile.job} size="document" />
            <ProfileRow
              label="해시태그"
              value={hashtagText(profile.hashtags) || null}
              size="document"
            />
            <ProfileRow
              label="LinkedIn"
              value={
                linkedin ? (
                  // 시안 값은 URL 이 아니라 프로필 주소 끝(`sunbae-kim-a12345678`)에 밑줄이다
                  <a
                    href={linkedin}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="underline underline-offset-2"
                  >
                    {linkLabelOf(linkedin)}
                    <span className="sr-only">(새 탭에서 열림)</span>
                  </a>
                ) : null
              }
              size="document"
            />
          </dl>
        </MyPageSection>
        {/* 피그마 `Public badge` — 다른 회원에게 보이는 그 사원증 */}
        <div className="flex justify-center py-3 lg:shrink-0 lg:py-0">
          <EmployeeBadge data={badgeDataOf(profile)} className="w-60" />
        </div>
      </div>

      {/* 피그마 `비공개 정보`(1197:10569 / 1200:12952) — 두 폭 모두 같은 제목이 됐다 */}
      <MyPageSection
        title="비공개 정보"
        description="커피챗 수락 시 학생에게 연락처를 공유할 수 있어요."
      >
        <dl>
          <ProfileRow label="이름" value={me.name ?? null} size="document" />
          {/* 모바일 시안 이름표는 `카카오 알림톡` 이다. 데스크톱 `전화번호` 로 맞춘다(D6-3) */}
          <ProfileRow
            label="전화번호"
            value={contact.phone ? formatPhone(contact.phone) : null}
            size="document"
          />
          <ProfileRow label="이메일" value={contact.email} size="document" />
        </dl>
      </MyPageSection>
    </MyPageCard>
  );
}
