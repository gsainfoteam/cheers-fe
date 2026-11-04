import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { userInfoQuery, type UserInfo } from "@/api";
import catSeal from "@/assets/brand/cat-cheers.svg";
import { AccountActions } from "@/components/account-actions";
import { EmployeeBadge } from "@/components/employee-badge";
import { badgeDataOf, hashtagText } from "@/components/employee-badge-data";
import { PageContainer } from "@/components/layout/page-container";
import { action } from "@/components/ui/action";
import { ProfileIdentity } from "@/components/ui/profile-identity";
import { ProfileRow } from "@/components/ui/profile-row";
import { studentContactEmailOf } from "@/features/profile/student-form";
import { formatPhone } from "@/lib/profile-form";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

/**
 * 마이페이지. 학생은 피그마 `Cheers / 마이페이지 · 학생`(337:8236 / 337:8086),
 * 선배는 `Cheers / 마이페이지 · 선배`(338:8549 / 338:8341).
 *
 * **index 가 아니라 레이아웃이다.** 미리보기(`me/preview` — 학생은 전달
 * 프로필, 선배는 공개 사원증)가 이 화면 위에 모달로 뜨는데, index 로 두면
 * 미리보기를 여는 순간 이 화면이 언마운트돼 모달 뒤가 빈다. 정보 수정은 한
 * 장짜리 화면이라 `me_/edit` 으로 이 레이아웃 밖에 선다(설계 4-0, 선배 가이드
 * §5.2).
 *
 * 두 유형이 같은 뼈대다 — 머리 줄(`마이페이지` + `내 정보 수정`), 704 + 32 +
 * 384 두 열, 아래 구분선과 로그아웃 · 회원 탈퇴. 열 안의 카드만 다르다.
 * 데이터는 전부 내 정보(`GET /user/info`)에서 온다. 추가 요청이 없다.
 */
export const Route = createFileRoute("/_app/me")({
  component: RouteComponent,
});

function RouteComponent() {
  const { role } = useSession();

  return (
    <>
      {role === "mentor" ? <MentorMyPage /> : <StudentMyPage />}
      {/* 미리보기. 이 화면은 그대로 남아 뒤에 깔린다 */}
      <Outlet />
    </>
  );
}

/**
 * 두 유형이 같이 쓰는 뼈대. 피그마 `Content`(데스크톱 1120) — 머리 줄,
 * `Profile layout`(두 열), 구분선, `Account management`. 구분선 위아래가 32 라
 * 바깥 `gap-8` 이 그 간격을 낸다.
 */
function MyPageFrame({
  main,
  aside,
}: {
  /** 왼쪽 704 열 */
  main: React.ReactNode;
  /** 오른쪽 384 열. 모바일은 왼쪽 열 아래에 온다 */
  aside: React.ReactNode;
}) {
  return (
    <PageContainer className="flex flex-col items-center pt-8 pb-12 lg:pt-14 lg:pb-16">
      <div className="flex w-full flex-col gap-8 lg:w-280">
        {/* 피그마 `Profile title and actions` */}
        <div className="flex items-center gap-4">
          {/* 모바일 Task/Title(32/44), 데스크톱 Display/Page(36/48) */}
          <h1 className="text-task-title lg:text-page text-ink flex-1">마이페이지</h1>
          <Link
            to="/me/edit"
            className={cn(
              action({ variant: "secondary" }),
              "text-button w-31 shrink-0 lg:w-40"
            )}
          >
            내 정보 수정
          </Link>
        </div>

        {/* 피그마 `Profile layout` — 데스크톱 704 + 32 + 384, 모바일은 한 줄로 쌓인다 */}
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-col gap-6 lg:w-176 lg:shrink-0">{main}</div>
          <div className="flex flex-col gap-6 lg:w-96 lg:shrink-0">{aside}</div>
        </div>

        <div className="bg-line h-px" />

        {/* 피그마 `Account management` */}
        <AccountActions />
      </div>
    </PageContainer>
  );
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

/** 카드 머리 오른쪽 위의 고양이 도장 — 로고 마크와 같은 그림. 데스크톱 40 / 모바일 32 */
function LetterheadSeal() {
  return (
    <img
      src={catSeal}
      alt=""
      aria-hidden
      className="absolute top-6 right-6 w-8 lg:top-8 lg:right-8 lg:w-10"
    />
  );
}

/* ───────────────── 학생 ───────────────── */

function StudentMyPage() {
  const { data: me } = useSuspenseQuery(userInfoQuery());
  const profile = me.student?.profile;
  if (!profile) return <MissingProfile />;

  const none = "등록하지 않음";
  const attachment = profile.attachments[0];
  const contact = profile.contact;
  const channels = [
    contact?.email_enabled ? "이메일" : null,
    contact?.kakao_enabled ? "카카오 알림톡" : null,
  ].filter(Boolean);
  const phone = contact?.kakao_enabled && contact.phone ? contact.phone : null;

  return (
    <MyPageFrame
      main={
        /* 피그마 `내 프로필` */
        <section className="bg-surface border-line shadow-work relative flex flex-col rounded-lg border p-6 lg:p-8">
          <LetterheadSeal />
          <h2 className="text-card-title text-ink min-h-11">내 프로필</h2>
          <dl>
            <ProfileIdentity label="이름" value={me.name ?? none} />
            <ProfileRow label="학과" value={profile.department.name} size="document" />
            <ProfileRow
              label="관심 분야"
              value={profile.interests.join(" · ") || none}
              size="document"
            />
            <ProfileRow
              label="참여 활동"
              value={profile.activities.join(" · ") || none}
              size="document"
            />
            <ProfileRow
              label={
                <>
                  이력서 /
                  <br />
                  포트폴리오
                </>
              }
              value={
                attachment ? (
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="underline-offset-2 hover:underline"
                  >
                    {/* 시안은 스킴 없이 도메인부터 보인다. 파일이면 파일 이름 */}
                    {attachment.file_name ??
                      attachment.url.replace(/^https?:\/\//i, "").replace(/\/$/, "")}
                  </a>
                ) : (
                  none
                )
              }
              size="document"
            />
          </dl>
          {/* 피그마 `Profile preview action` — 위 20, 데스크톱 224 · 모바일 카드 폭 */}
          <div className="pt-5">
            <Link
              to="/me/preview"
              className={cn(
                action({ variant: "secondary" }),
                "text-button h-12 w-full lg:w-56"
              )}
            >
              전달 프로필 미리보기
            </Link>
          </div>
        </section>
      }
      aside={
        /* 피그마 `연락 설정` — 이름표 Body/Small · 값 Body/Medium, 사이 12 */
        <section className="bg-surface border-line shadow-work flex flex-col rounded-lg border p-6">
          <h2 className="text-card-title text-ink min-h-11">연락 설정</h2>
          <dl>
            <ProfileRow
              label="연락받을 방법"
              value={channels.join(" · ") || none}
              size="comfortable"
              className="gap-3"
            />
            <ProfileRow
              label="이메일"
              value={contact?.email ?? studentContactEmailOf(me) ?? none}
              size="comfortable"
              className="gap-3"
            />
            <ProfileRow
              label="전화번호"
              value={phone ? formatPhone(phone) : none}
              size="comfortable"
              className="gap-3"
            />
          </dl>
        </section>
      }
    />
  );
}

/* ───────────────── 선배 ───────────────── */

function MentorMyPage() {
  const { data: me } = useSuspenseQuery(userInfoQuery());
  const profile = me.graduated?.profile;
  if (!profile) return <MissingProfile />;

  return (
    <MyPageFrame
      main={
        <>
          <ProfileCard me={me} profile={profile} />
          <ContactCard profile={profile} />
        </>
      }
      aside={
        /* 피그마 `Contact and preview` — 모바일은 연락처 카드 아래에 온다 */
        <>
          <h2 className="text-card-title text-ink lg:hidden">공개 사원증</h2>
          {/* 피그마 `Public badge` */}
          <div className="flex justify-center p-6">
            <EmployeeBadge data={badgeDataOf(profile)} className="w-72" />
          </div>
          <Link
            to="/me/preview"
            className={cn(action({ variant: "secondary" }), "text-button w-full")}
          >
            사원증 미리보기
          </Link>
        </>
      }
    />
  );
}

type Profile = NonNullable<NonNullable<UserInfo["graduated"]>["profile"]>;

/** 피그마 `Profile details` */
function ProfileCard({ me, profile }: { me: UserInfo; profile: Profile }) {
  const none = "등록하지 않음";
  const link = profile.links[0];

  return (
    <section className="bg-surface border-line shadow-work relative flex flex-col gap-6 rounded-lg border p-6 lg:p-8">
      <LetterheadSeal />

      {/* 피그마 `사원증 정보` */}
      <div className="flex flex-col">
        <h2 className="text-card-title text-ink min-h-11">공개 사원증 정보</h2>
        <dl>
          <ProfileIdentity label="닉네임" value={profile.nickname} />
          <ProfileRow label="회사" value={profile.company} size="document" />
          <ProfileRow label="직무" value={profile.job} size="document" />
          <ProfileRow
            label="해시태그"
            value={hashtagText(profile.hashtags) || none}
            size="document"
          />
          <ProfileRow
            label="프로필 링크"
            value={
              link ? (
                // 시안에서 값은 URL 이 아니라 `LinkedIn` 이라는 링크 글자다
                <a
                  href={link}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="underline-offset-2 hover:underline"
                >
                  LinkedIn
                </a>
              ) : (
                none
              )
            }
            size="document"
          />
        </dl>
      </div>

      <div className="bg-line h-px" />

      {/* 피그마 `비공개 정보` */}
      <div className="flex flex-col">
        {/*
         * 시안 제목이 폭마다 다르다 — 데스크톱 `비공개 정보` / 모바일
         * `개인정보`. 시안대로 갈아 끼운다. 하나로 맞출지는 디자이너 확인
         * 필요(선배 가이드 §7 #14)
         */}
        <h2 className="text-card-title text-ink min-h-11">
          <span className="hidden lg:inline">비공개 정보</span>
          <span className="lg:hidden">개인정보</span>
        </h2>
        {/* 시안이 두 폭 모두 이 자리에서 줄을 끊는다 */}
        <p className="text-body-sm text-ink-soft">
          사원증에는 표시되지 않아요. 연락처를 공유한
          <br />
          요청자에게만 이름과 이메일이 전달돼요.
        </p>
        <dl>
          <ProfileRow label="이름" value={me.name ?? none} size="document" />
          <ProfileRow label="부서" value={profile.department} size="document" />
        </dl>
      </div>
    </section>
  );
}

/**
 * 피그마 `My contact and notifications` — 데스크톱 좌우 2열(사이 24, 열 안 12),
 * 모바일은 한 줄로 쌓이고 **모든 줄 사이가 16**(구분선 위아래 포함)이다.
 */
function ContactCard({ profile }: { profile: Profile }) {
  const contact = profile.contact;
  const phone = contact?.kakao_enabled && contact.phone ? contact.phone : null;

  return (
    <section className="bg-surface border-line shadow-work flex flex-col gap-4 rounded-lg border p-6 lg:flex-row lg:gap-6 lg:p-8">
      {/* 피그마 `Shared contact summary` */}
      <div className="flex flex-1 flex-col gap-4 lg:gap-3">
        <h2 className="text-card-title text-ink">공유할 연락처</h2>
        <p className="text-body text-ink break-all">
          {contact?.email ?? "공유할 이메일을 등록하지 않았어요."}
        </p>
        <p className="text-body-sm text-ink-soft">
          공유를 선택한 학생에게만 전달돼요.
        </p>
      </div>

      <div className="bg-line h-px lg:hidden" />

      {/* 피그마 `Notification summary` */}
      <div className="flex flex-1 flex-col gap-4 lg:gap-3">
        <h2 className="text-card-title text-ink">신청 알림</h2>
        <p className="text-body-sm text-ink">
          {/*
           * 지금은 휴대폰이 필수라(이슈 #26 임시 결정) 비는 경우가 거의 없다.
           * 그 전에 가입한 계정이나 #26 의 답으로 선택 칸이 되면 이 줄이
           * 선다 — 시안에 빈 상태가 없다
           */}
          {phone
            ? `카카오 알림톡 · ${formatPhone(phone)}`
            : "알림 번호를 등록하지 않았어요."}
        </p>
        <p className="text-body-sm text-ink-soft">
          알림 번호는 학생에게 공유되지 않아요.
        </p>
        {/* 정보 수정 화면의 연락처 묶음으로 바로 간다 */}
        <Link
          to="/me/edit"
          hash="contact"
          className="text-label text-brand flex min-h-11 items-center self-start"
        >
          연락처·알림 번호 수정
        </Link>
      </div>
    </section>
  );
}
