import { useState } from "react";
import catCheers from "@/assets/brand/cat-cheers.svg";
import linkedinIcon from "@/assets/icons/linkedin.svg";
import { httpUrlOrNull } from "@/lib/profile-form";

/**
 * 선배 요약 카드. 피그마 `Selected alumni` — 커피챗 신청(1197:10107 /
 * 1248:17975, 동기화 가이드 04장 4.3.2)과 보낸 신청 내용(1251:15008 /
 * 1251:11105, 05장 5.5.3)이 같은 카드를 쓴다.
 *
 * 두 화면의 데이터가 다른 DTO(`CheersCardDto` / `RequestGraduatedDto`)라
 * props 는 DTO 와 떼어 두었다. 호출부가 골라 넣는다.
 *
 * - 로고가 없으면(또는 못 받으면) 같은 60×40 칸에 2D 고양이를 둔다(D4-1).
 *   칸이 늘 있으므로 글자 위치는 로고 유무와 상관없이 같다.
 * - 부서가 없으면 `{회사}` 만, 있으면 `{회사} · {부서}`.
 * - LinkedIn 은 다른 회원이 넣은 값이라 `http(s)` 만 링크로 그린다. 새 탭 —
 *   같은 탭으로 떠나면 대화상자가 닫힌다(신청 화면은 적던 질문도 사라진다).
 */
export function MentorSummaryCard({
  name,
  company,
  department,
  job,
  logoUrl,
  linkedinUrl,
}: {
  /** 굵은 첫 줄 전체(`{닉네임} 선배`, 수락 뒤 `{닉네임}({실명}) 선배`) */
  name: string;
  company: string;
  department?: string | null;
  job: string;
  logoUrl?: string | null;
  linkedinUrl?: string | null;
}) {
  const [logoFailed, setLogoFailed] = useState(false);
  const logo = !logoFailed ? logoUrl : null;
  const linkedin = httpUrlOrNull(linkedinUrl);

  return (
    <div className="bg-canvas border-line flex items-start gap-4 rounded-md border p-3">
      {/* 회사 이름이 바로 옆 글자라 로고는 꾸밈이다(사원증과 같다) */}
      <img
        src={logo ?? catCheers}
        alt=""
        onError={logo ? () => setLogoFailed(true) : undefined}
        className="h-10 w-15 shrink-0 object-contain"
      />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-label-lg text-ink break-words">{name}</p>
        <div className="text-body-sm text-ink-soft flex flex-col">
          <p>{department ? `${company} · ${department}` : company}</p>
          <p>{job}</p>
        </div>
        {linkedin ? (
          <a
            href={linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="text-body-sm text-brand flex items-center gap-1 self-start underline"
          >
            LinkedIn 프로필 보기
            <img src={linkedinIcon} alt="" className="size-4.5 shrink-0" />
            <span className="sr-only">(새 탭에서 열림)</span>
          </a>
        ) : null}
      </div>
    </div>
  );
}
