import { useEffect, useRef, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  isApiError,
  uploadFile,
  useVerifyBusinessCard,
  userInfoQuery,
} from "@/api";
import imagePlusIcon from "@/assets/icons/media-image-plus.svg";
import { PageContainer } from "@/components/layout/page-container";
import { SignupProgress } from "@/components/signup-progress";
import { action } from "@/components/ui/action";
import { cn } from "@/lib/utils";

/**
 * 명함 첨부. 피그마 `Cheers / 명함 첨부`(335:7315 / 335:7236), 완료
 * (336:6595 / 336:6515), 업로드 오류(336:6756 / 336:6675), 파일 드래그
 * (960:9646), 미리보기 비율 규칙(922:43811).
 *
 * **업로드는 파일을 고르는 순간, 인증은 `다음` 에서.** 시안이 업로드 오류를
 * `다음` 을 누르기 전에 상자 안에 그려 두었다. 그래서 고르자마자
 * `uploadFile` 로 key 를 받아 두고, `다음` 에서 그 key 로 인증한다. 인증까지
 * 가지 않은 파일은 하루 뒤 서버가 지운다(`api/file.ts`).
 *
 * 인증이 끝나면 `next_step` 이 바뀌므로 라우터를 다시 평가시키기만 하면
 * `/onboarding` 가드가 다음 화면(기본 정보)으로 보낸다.
 */
export const Route = createFileRoute("/onboarding/mentor/verify")({
  loader: ({ context }) => context.queryClient.ensureQueryData(userInfoQuery()),
  component: RouteComponent,
});

type Upload =
  | { status: "empty" }
  | { status: "uploading"; preview: string }
  | { status: "uploaded"; preview: string; key: string }
  | { status: "error" };

function RouteComponent() {
  const router = useRouter();
  const { data: me } = useSuspenseQuery(userInfoQuery());
  const verify = useVerifyBusinessCard();

  const [upload, setUpload] = useState<Upload>({ status: "empty" });
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  /** 진행 중인 업로드. 파일을 바꾸면 끊는다 */
  const inFlight = useRef<AbortController | null>(null);
  /** 지금 화면에 걸린 미리보기 URL. 바꾸거나 떠날 때 놓아준다 */
  const previewRef = useRef<string | null>(null);

  const setPreview = (url: string | null) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = url;
  };

  // 화면을 떠날 때 업로드를 끊고 미리보기를 놓아준다
  useEffect(
    () => () => {
      inFlight.current?.abort();
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    []
  );

  const choose = (file: File | undefined) => {
    if (!file) return;
    verify.reset();

    // 끌어다 놓기는 `accept` 를 거치지 않는다. 이미지가 아니면 서버에 묻기
    // 전에 같은 오류 상태로 보낸다 — 어차피 발급 단계에서 400 이다
    if (!file.type.startsWith("image/")) {
      inFlight.current?.abort();
      setPreview(null);
      setUpload({ status: "error" });
      return;
    }

    // 늦게 끝난 이전 업로드가 새 key 를 덮으면 엉뚱한 명함이 인증된다
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;

    // 미리보기는 서버 URL 이 아니라 로컬 파일이다 — 본인 명함을 다시 받는
    // API 가 없다
    const preview = URL.createObjectURL(file);
    setPreview(preview);
    setUpload({ status: "uploading", preview });

    uploadFile("business_card", file, controller.signal).then(
      ({ key }) => {
        if (controller.signal.aborted) return;
        setUpload({ status: "uploaded", preview, key });
      },
      () => {
        if (controller.signal.aborted) return;
        setPreview(null);
        setUpload({ status: "error" });
      }
    );
  };

  const openPicker = () => inputRef.current?.click();

  const submit = () => {
    if (upload.status !== "uploaded") return;
    verify.mutate(
      { key: upload.key },
      {
        onSuccess: () => void router.invalidate(),
        onError: (error) => {
          // key 가 틀렸거나 올라가지 않은 경우 — 사용자가 할 수 있는 일은
          // 다시 첨부하는 것뿐이라 상자의 오류 상태로 돌린다
          if (isApiError(error) && error.status === 400) {
            setPreview(null);
            setUpload({ status: "error" });
          }
        },
      }
    );
  };

  /**
   * 어드민이 명함 인증을 취소한 선배(명세 `next_step = verify`)는 이미 가입을
   * 마친 사람이다. 진행 단계만 보여주면 처음부터 다시 가입하는 것처럼 읽혀서
   * 이유를 한 줄 더한다. 시안에 없는 문구다 — 디자이너 확인 필요.
   */
  const reverify = me.status === "active";
  const verifyError = describeVerifyError(verify.error);

  return (
    <PageContainer className="flex flex-col items-center pt-8 pb-12 lg:pt-16 lg:pb-18">
      {/* 피그마 `Task workspace` — 976 = 352 + 64 + 560 */}
      <div className="flex w-full flex-col gap-7 lg:w-244 lg:flex-row lg:items-start lg:gap-16">
        {/* 피그마 `Task introduction` */}
        <div className="flex flex-col gap-7 lg:w-88 lg:shrink-0 lg:gap-10 lg:pt-4">
          {/* 모바일은 제목 위, 데스크톱은 제목 아래 */}
          <div className="order-first lg:order-last">
            <SignupProgress current={1} />
          </div>
          <div className="flex flex-col gap-3 lg:gap-5">
            <h1 className="text-task-title text-ink">명함 첨부</h1>
            <p className="text-body text-ink-soft">
              회사와 이름을 확인할 수 있는
              <br />
              명함 이미지 1장을 첨부해 주세요.
            </p>
            {reverify ? (
              <p className="text-body-sm text-brand">
                명함 인증이 취소되어 다시 확인이 필요해요.
              </p>
            ) : null}
          </div>
        </div>

        {/* 피그마 `Content` — 카드 껍데기는 데스크톱에만 있다 */}
        <form
          className="lg:border-line lg:bg-surface lg:shadow-work flex flex-col gap-7 lg:w-140 lg:shrink-0 lg:rounded-lg lg:border lg:p-10"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          {/* 고르는 건 아래 버튼이 대신한다. 이 입력은 눈에 보이지 않는다 */}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              choose(e.target.files?.[0]);
              // 같은 파일을 다시 골라도 change 가 오게 비운다
              e.target.value = "";
            }}
          />

          {/*
           * 피그마 `Business card upload`.
           *
           * 끌어다 놓기는 **폭과 무관하게** 받는다. 모바일 시안에 끌어다 놓기
           * 문구가 없는 건 손가락으로 끌 일이 없어서지 기능을 막으라는 뜻이
           * 아니다(태블릿 + 마우스).
           */}
          <div
            onDragEnter={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
            }}
            onDragLeave={(e) => {
              // 상자 안의 자식으로 옮겨 갈 때도 leave 가 온다. 상자 밖으로
              // 나갈 때만 끈다
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                setDragging(false);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              choose(e.dataTransfer.files[0]);
            }}
          >
            {upload.status === "uploading" || upload.status === "uploaded" ? (
              <Preview
                src={upload.preview}
                busy={upload.status === "uploading"}
                dragging={dragging}
                onReplace={openPicker}
              />
            ) : (
              <Dropzone
                error={upload.status === "error"}
                dragging={dragging}
                onPick={openPicker}
              />
            )}
          </div>

          {verifyError ? (
            <p role="alert" className="text-body-sm text-danger">
              {verifyError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={upload.status !== "uploaded" || verify.isPending}
            className={cn(action(), "w-full")}
          >
            {verify.isPending ? "확인 중…" : "다음"}
          </button>
        </form>
      </div>
    </PageContainer>
  );
}

/**
 * 비어 있음 · 드래그 중 · 오류. 셋 다 같은 상자에 테두리와 문구만 바뀐다.
 *
 * | 상태 | 테두리 | 바탕 | 문구 |
 * |---|---|---|---|
 * | 비어 있음 | 점선 `control` | `surface` | 안내 |
 * | 드래그 중 | **실선** `focus` | `subtle` | 안내 |
 * | 오류 | 점선 `focus` | `surface` | `text-danger` 두 줄 |
 *
 * 모바일은 상자가 미리보기와 같은 4:3(353×265)이고 가운데 정렬이다.
 * 데스크톱은 내용 높이(194)대로 선다.
 */
function Dropzone({
  error,
  dragging,
  onPick,
}: {
  error: boolean;
  dragging: boolean;
  onPick: () => void;
}) {
  return (
    <div
      className={cn(
        "flex aspect-[4/3] flex-col items-center justify-center gap-5 rounded-md border p-6 lg:aspect-auto",
        dragging
          ? "border-focus bg-subtle border-solid"
          : error
            ? "border-focus bg-surface border-dashed"
            : "border-control bg-surface border-dashed"
      )}
    >
      <div className="py-4 text-center">
        {error ? (
          <p role="alert" className="text-label text-danger">
            이미지를 올리지 못했어요.
            <br />
            다시 첨부해 주세요.
          </p>
        ) : (
          <p className="text-label text-ink">
            {/* 문구가 폭마다 다르다 — 모바일에는 끌어다 놓을 손이 없다 */}
            <span className="hidden lg:inline">
              명함 이미지를 여기에 끌어다 놓거나,
              <br />
              파일 선택 버튼을 직접 선택해주세요.
            </span>
            <span className="lg:hidden">명함 이미지를 선택해주세요.</span>
          </p>
        )}
      </div>
      <PickButton onClick={onPick}>파일 선택</PickButton>
    </div>
  );
}

/**
 * 완료(+ 올리는 중). 피그마 `922:43231`, 비율 규칙 `922:43811`.
 *
 * **상자 비율은 폭마다 다르고, 그 안에서는 `object-contain` 이다.** 시안이
 * 예시 여섯 장으로 그린 규칙 — 상자보다 세로로 길면 높이에, 가로로 길면
 * 폭에 맞춘다 — 이 곧 contain 이라 이미지 비율을 JS 로 재지 않는다.
 * 데스크톱 480×292(1:1.64), 모바일 353×265(4:3).
 *
 * 테두리는 상자가 아니라 **이미지에** 붙는다(시안에서 389×292 사진에만
 * 테두리가 있다). 그래서 `max-h/max-w` 로 상자 안에 가두고 가운데 둔다.
 * 시안의 체크무늬는 투명을 표현한 것이라 남는 자리는 비워 둔다.
 */
function Preview({
  src,
  busy,
  dragging,
  onReplace,
}: {
  src: string;
  busy: boolean;
  dragging: boolean;
  onReplace: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className={cn(
          // `min-h-0` 이 없으면 비율 상자가 세로로 긴 사진에 맞춰 늘어난다
          // (aspect-ratio 상자의 min-height:auto 는 내용 높이다)
          "flex aspect-[4/3] min-h-0 w-full items-center justify-center overflow-hidden rounded-md lg:aspect-[480/292]",
          // 미리보기 위로 다른 파일을 끌어 올 때도 받는다는 걸 보여준다
          dragging && "ring-focus bg-subtle ring-1"
        )}
      >
        <img
          src={src}
          alt="첨부한 명함"
          className={cn(
            "border-line max-h-full max-w-full rounded-md border object-contain",
            busy && "opacity-60"
          )}
        />
      </div>
      {/* 시안에 올리는 중 상태가 없다. 문구 한 줄로 알린다 */}
      {busy ? (
        <p role="status" className="text-body-sm text-ink-soft">
          명함을 올리는 중이에요…
        </p>
      ) : null}
      <PickButton onClick={onReplace}>다른 이미지 선택</PickButton>
    </div>
  );
}

/**
 * 피그마 `Action / uploaded`. Secondary 와 같은 껍데기지만 글자가
 * Label/Medium(14)이 아니라 Web/Button(16)이고 아이콘이 붙는다.
 */
function PickButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(action({ variant: "secondary" }), "text-button")}
    >
      <img src={imagePlusIcon} alt="" />
      {children}
    </button>
  );
}

/**
 * 인증 단계의 오류. 400(key 불일치·업로드 안 됨)은 상자의 오류 상태로 따로
 * 보여주므로 여기서는 뺀다.
 */
function describeVerifyError(error: unknown): string | undefined {
  if (!error) return undefined;
  if (!isApiError(error)) return "인증하지 못했습니다. 다시 시도해 주세요.";

  if (error.status === 400) return undefined;
  if (error.status === 403) return "지금은 명함을 제출할 수 없어요.";
  return "인증하지 못했습니다. 다시 시도해 주세요.";
}
