import { useMutation } from "@tanstack/react-query";
import { api } from "./client";
import { UploadUrlSchema } from "./dto";
import { ApiError, unwrap } from "./errors";

export type UploadPurpose = "business_card" | "attachment";

export type UploadedFile = {
  /** 기능 API(명함 인증, 재학생 추가 정보)에 보낼 값 */
  key: string;
  /** 화면 표시용 원래 파일 이름 */
  fileName: string;
};

/**
 * 파일을 S3 에 직접 올리고 key 를 받는다.
 *
 * 1. 서버에서 presigned URL 과 key 를 발급받고
 * 2. 그 URL 로 파일을 PUT 하고 (multipart 아님, 파일 그대로)
 * 3. key 를 기능 API 에 보내면 서버가 확인 후 확정한다.
 *
 * 2번은 `api` 클라이언트를 쓰지 않는다. presigned URL 에는 서명에 포함되지 않은
 * 헤더가 붙으면 S3 가 403 으로 거절하기 때문에, Authorization 을 자동으로
 * 붙이는 클라이언트를 태우면 업로드가 통째로 실패한다.
 *
 * 3번까지 가지 않은 파일은 하루 뒤 자동 삭제되므로 따로 정리할 필요가 없다.
 */
export async function uploadFile(
  purpose: UploadPurpose,
  file: File,
  signal?: AbortSignal
): Promise<UploadedFile> {
  const issued = unwrap(
    await api.POST("/api/v1/file/upload-url", {
      body: {
        purpose,
        content_type: file.type,
        // 서명에 크기가 묶여 있다. 실제 파일과 다르면 S3 가 거절한다
        size: file.size,
      },
      signal,
    }),
    UploadUrlSchema
  );

  const uploaded = await fetch(issued.url, {
    method: issued.method,
    headers: issued.headers,
    body: file,
    signal,
  });

  if (!uploaded.ok) {
    throw new ApiError(
      uploaded.status,
      await uploaded.text().catch(() => undefined),
      "S3 업로드에 실패했습니다"
    );
  }

  return { key: issued.key, fileName: file.name };
}

export function useUploadFile(purpose: UploadPurpose) {
  return useMutation({
    mutationFn: (file: File) => uploadFile(purpose, file),
  });
}
