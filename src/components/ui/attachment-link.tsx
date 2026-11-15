import type { Attachment, StudentAttachment } from "@/api";
import { attachmentLabel } from "@/lib/attachments";
import { httpUrlOrNull } from "@/lib/profile-form";

type AnyAttachment = Attachment | StudentAttachment;

/**
 * 첨부(이력서 · 포트폴리오) 링크. 링크 첨부는 스킴 없이 도메인부터, 파일
 * 첨부는 파일 이름이 보인다. 받은 신청 상세와 커피챗 신청(동기화 가이드 04장
 * 4.3.5)이 같이 쓴다. 모양은 호출부가 `className` 으로 준다.
 *
 * **파일의 `url` 은 presigned URL 이라 만료된다.** 받아 둔 지 오래됐으면
 * 누르는 순간 `refresh` 로 첨부 목록을 다시 받아 새 URL 로 연다. 창은 클릭과
 * 같은 틱에 먼저 열어 둔다 — 응답을 기다린 뒤에 열면 팝업 차단에 걸린다.
 *
 * 링크 첨부는 다른 회원이 넣은 값이라 `http(s)` 가 아니면 링크로 그리지
 * 않는다(`javascript:` 같은 스킴을 막는다).
 */
export function AttachmentLink({
  attachment,
  refresh,
  className,
}: {
  attachment: AnyAttachment;
  /** 새 presigned URL 이 담긴 첨부 목록을 돌려준다. 보통 `fetchQuery` + `staleTime` */
  refresh: () => Promise<AnyAttachment[]>;
  className?: string;
}) {
  const label = attachmentLabel(attachment);
  const href = httpUrlOrNull(attachment.url);

  if (!href) {
    return (
      <span className={className}>
        <span className="min-w-0 truncate">{label}</span>
      </span>
    );
  }

  const openFresh = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (attachment.source !== "file") return;
    e.preventDefault();
    const tab = window.open("about:blank", "_blank");
    let url = href;
    try {
      const match = (await refresh()).find((a) => isSameAttachment(a, attachment));
      url = (match && httpUrlOrNull(match.url)) ?? href;
    } catch {
      // 다시 받지 못하면 들고 있던 URL 로라도 연다 — 아직 살아 있을 수 있다
    }
    if (tab) {
      tab.opener = null;
      tab.location.href = url;
    } else {
      window.location.href = url;
    }
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      onClick={openFresh}
      className={className}
    >
      <span className="min-w-0 truncate">{label}</span>
      <span className="sr-only">(새 탭에서 열림)</span>
    </a>
  );
}

/**
 * 다시 받은 목록에서 같은 첨부를 찾는다. 내 첨부(`StudentAttachmentDto`)는
 * `key` 가 있어 그것으로 — 같은 이름 파일이 둘이어도 맞는 것을 연다. 남의
 * 첨부(`AttachmentDto`)는 `key` 를 주지 않으므로 파일 이름으로 찾는다.
 */
function isSameAttachment(a: AnyAttachment, b: AnyAttachment): boolean {
  if (a.source !== b.source || a.kind !== b.kind) return false;
  const aKey = "key" in a ? a.key : null;
  const bKey = "key" in b ? b.key : null;
  if (aKey && bKey) return aKey === bKey;
  return a.file_name === b.file_name;
}
