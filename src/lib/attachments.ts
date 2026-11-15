/**
 * 학생 첨부(이력서 · 포트폴리오)의 표시 이름. 파일은 파일 이름, 링크는
 * 시안처럼 스킴 없이 도메인부터.
 *
 * 첨부가 **최대 3개**가 되면서(동기화 가이드 02장 2.6.2) 첫 번째만 그리던
 * 자리(마이페이지 · 전달 프로필 · 신청 화면 · 받은 신청 상세)가 모두 목록을
 * 그린다(2.6.4). 각 화면의 정확한 모양은 그 화면 섹션 장에서 시안과 맞춘다.
 */
export function attachmentLabel(attachment: {
  source: "link" | "file";
  url: string;
  file_name: string | null;
}): string {
  if (attachment.source === "file") return attachment.file_name ?? "첨부 파일";
  return attachment.url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

