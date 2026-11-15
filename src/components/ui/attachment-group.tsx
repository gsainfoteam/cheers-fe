import type { Attachment, StudentAttachment } from "@/api";
import { cn } from "@/lib/utils";
import { AttachmentLink } from "./attachment-link";

type AnyAttachment = Attachment | StudentAttachment;

/**
 * 이력서 · 포트폴리오 묶음. 이름표 한 줄 아래에 파일마다 누를 수 있는 상자.
 * 피그마 `Attachments` — 커피챗 신청(1119:10695, 04장 4.3.5), 보낸 신청 내용
 * (1251:15037, 05장 5.5.3), 마이페이지(1251:9255, 05장 5.2.4).
 *
 * **상자 높이와 간격이 화면마다 다르다**(05장 D5-4, 디자이너 확인 중):
 *
 * | `density` | 쓰는 곳 | 상자 높이 | 이름표 → 상자 · 상자 사이 |
 * |---|---|---|---|
 * | `compact` | 커피챗 신청 · 보낸 신청 내용 | 38 | 4 |
 * | `comfortable` | 마이페이지 | 44 | 8 |
 *
 * 열 때는 `AttachmentLink` 가 presigned URL 을 다시 받는다(`refresh`).
 */
export function AttachmentGroup({
  attachments,
  refresh,
  density = "compact",
}: {
  attachments: AnyAttachment[];
  /** 새 presigned URL 이 담긴 첨부 목록. 보통 `fetchQuery` + `staleTime: 60_000` */
  refresh: () => Promise<AnyAttachment[]>;
  density?: "compact" | "comfortable";
}) {
  const gap = density === "comfortable" ? "gap-2" : "gap-1";

  return (
    <div className={cn("flex flex-col", gap)}>
      <p className="text-label-sm text-ink-soft">이력서 / 포트폴리오</p>
      {attachments.length ? (
        <ul className={cn("flex flex-col", gap)}>
          {attachments.map((attachment) => (
            <li key={`${attachment.source}:${keyOf(attachment)}`}>
              <AttachmentLink
                attachment={attachment}
                refresh={refresh}
                className={cn(
                  "bg-surface border-line text-label-sm text-brand flex items-center rounded-md border px-3 py-2 underline underline-offset-2",
                  density === "comfortable" ? "h-11" : "h-9.5"
                )}
              />
            </li>
          ))}
        </ul>
      ) : (
        // 시안에 없는 상태라 문구를 정했다(D4-4)
        <p className="text-body-sm text-ink-faint">등록된 이력서, 포트폴리오가 없습니다</p>
      )}
    </div>
  );
}

/** 내 첨부는 `key` 가 있고, 남의 첨부(`AttachmentDto`)는 없다 */
function keyOf(attachment: AnyAttachment): string {
  return ("key" in attachment && attachment.key) || attachment.file_name || attachment.url;
}
