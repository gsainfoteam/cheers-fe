import { useEffect, useId, useRef, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { isApiError, uploadFile, type Department, type StudentAttachment } from "@/api";
import attachmentIcon from "@/assets/icons/attachment.svg";
import xmarkCircleIcon from "@/assets/icons/xmark-circle.svg";
import { action } from "@/components/ui/action";
import { AttachmentLink } from "@/components/ui/attachment-link";
import { Choice, ChoiceAdd } from "@/components/ui/choice";
import { CompactDialog } from "@/components/ui/compact-dialog";
import { Field, Select } from "@/components/ui/field";
import { FilePickButton, useFileDrop } from "@/components/ui/file-drop";
import { TagInput } from "@/components/ui/tag-input";
import { ContactChannelFields } from "@/features/profile/contact-channel-fields";
import {
  INTEREST_MAX,
  INTEREST_MAX_LENGTH,
  addCustomInterest,
  customInterestsOf,
  removeInterest,
  renameCustomInterest,
} from "@/features/profile/interests";
import { cn } from "@/lib/utils";
import {
  ATTACHMENT_MAX,
  type StudentAttachmentValue,
  type StudentEditValues,
} from "./student-form";

/**
 * 학생 프로필 칸 묶음 — 가입(기본 정보 · 추가 정보)과 정보 수정이 같은
 * 묶음을 import 한다(이슈 #10). 값과 규칙은 `useFormContext` 로 받는다 —
 * 쓰는 쪽은 `student-form.ts` 의 스키마로 `useForm` 을 세우고 `FormProvider`
 * 로 감싸기만 하면 된다.
 *
 * **오류는 칸을 한 번 떠난 뒤에만 보인다**(`isTouched`). 저장 버튼은
 * `formState.isValid` 로 처음부터 막는다 — 아직 아무것도 안 쳤는데 빨간
 * 칸이 서지 않게.
 */

type Values = StudentEditValues;

/* ───────────────── 이름 · 학과 ───────────────── */

/**
 * 피그마 `Identity fields` — 모바일은 세로, 데스크톱은 좌우 반반(348 + 24 + 348).
 *
 * 이름은 학생 가이드 §2.2 규칙대로 — 내 정보에 이름이 있으면 고칠 수 없는
 * 칸이고, 없을 때만 입력·필수다.
 */
export function StudentIdentityFields({
  nameLocked,
  nameHint,
  departments,
}: {
  nameLocked: boolean;
  /** 가입 화면은 `가입 후 변경할 수 없어요.`, 정보 수정은 `가입 후에는 변경할 수 없어요.`(각 시안) */
  nameHint?: string;
  departments: Department[];
}) {
  const { control } = useFormContext<Values>();

  return (
    <div className="flex flex-col gap-7 lg:flex-row lg:items-start lg:gap-6">
      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <Field
            {...field}
            label="이름"
            autoComplete="name"
            maxLength={64}
            placeholder="이름을 입력하세요"
            readOnly={nameLocked}
            hint={nameLocked ? nameHint : undefined}
            error={fieldState.isTouched ? fieldState.error?.message : undefined}
            className="lg:w-87"
          />
        )}
      />
      <Controller
        control={control}
        name="departmentId"
        render={({ field }) => (
          <Select
            label="학과"
            name={field.name}
            ref={field.ref}
            placeholder="학과 선택"
            options={departments.map((department) => ({
              value: String(department.id),
              label: department.name,
            }))}
            // 폼 값은 숫자 id, 칸의 값은 문자열이다. 경계에서 바꾼다
            value={field.value == null ? null : String(field.value)}
            onValueChange={(next) => field.onChange(next == null ? null : Number(next))}
            onBlur={field.onBlur}
            className="lg:w-87"
          />
        )}
      />
    </div>
  );
}

/* ───────────────── 관심 분야 ───────────────── */

type InterestDialogState = { mode: "add" } | { mode: "edit"; value: string } | null;

/**
 * 피그마 `관심 분야` + `기타 관심 분야`(가이드 02장 2.5.3).
 *
 * 칸 순서는 **고정 칩(서버 목록 순) → 학생이 넣은 칩(넣은 순) → `+ 기타`**.
 * 칩 폭(모바일 112.33 · 데스크톱 113.33)은 칸을 똑같이 나눈 값이라
 * `flex-wrap` 이 아니라 3열/6열 격자다(설계 3-5a).
 *
 * - 고정 칩: 누르면 선택이 토글된다. 연필은 붙지 않는다(정보 수정에서도 —
 *   동기화 가이드 05장 5.3.2, D5-7)
 * - 사용자 칩: 늘 선택 상태 + 연필. 누르면 수정 팝업(`변경` / `삭제`)이 열린다.
 *   눌러서 선택을 풀지 않는다 — 지우는 길은 `삭제` 하나다
 * - `+ 기타`: 추가 모달. 20개가 차면 끈다
 *
 * 값은 `string[]` 하나다. 목록에 없는 값이 사용자 칩이다(`interests.ts`).
 *
 * `fieldset`/`legend` 가 아니라 `role="group"` 이다 — legend 는 flex 자식으로
 * 취급되지 않는 브라우저가 있어 `gap` 이 한 칸 어긋난다.
 */
export function StudentInterestsField({
  options,
  description,
}: {
  options: string[];
  /** 가입 · 정보 수정 모두 `하나 이상 선택해 주세요.` */
  description?: string;
}) {
  const { control } = useFormContext<Values>();
  const labelId = useId();
  const [dialog, setDialog] = useState<InterestDialogState>(null);

  return (
    <Controller
      control={control}
      name="interests"
      render={({ field }) => {
        const values = field.value;
        const set = (next: string[]) => {
          field.onChange(next);
          field.onBlur();
        };
        const toggle = (interest: string) =>
          set(
            values.includes(interest)
              ? values.filter((v) => v !== interest)
              : [...values, interest]
          );
        const full = values.length >= INTEREST_MAX;

        return (
          <div
            role="group"
            aria-labelledby={labelId}
            className="flex flex-col gap-3"
          >
            <p id={labelId} className="text-label text-ink">
              관심 분야
            </p>
            {description ? (
              <p className="text-body-sm text-ink-soft">{description}</p>
            ) : null}
            <div className="grid grid-cols-3 gap-2 lg:grid-cols-6">
              {options.map((interest) => (
                <Choice
                  key={interest}
                  selected={values.includes(interest)}
                  // 20개가 찼으면 새로 켜지는 못하고 끄기만 된다
                  disabled={full && !values.includes(interest)}
                  onClick={() => toggle(interest)}
                >
                  {interest}
                </Choice>
              ))}
              {customInterestsOf(values, options).map((interest) => (
                <Choice
                  key={interest}
                  selected
                  edit
                  opensDialog
                  title={interest}
                  aria-label={`${interest} 수정`}
                  onClick={() => setDialog({ mode: "edit", value: interest })}
                >
                  {interest}
                </Choice>
              ))}
              <ChoiceAdd
                disabled={full}
                aria-label="기타 관심 분야 추가"
                onClick={() => setDialog({ mode: "add" })}
              >
                기타
              </ChoiceAdd>
            </div>

            <InterestDialog
              state={dialog}
              onClose={() => setDialog(null)}
              onAdd={(input) => addCustomInterest(values, input)}
              onRename={(from, input) => renameCustomInterest(values, options, from, input)}
              onRemove={(name) => removeInterest(values, name)}
              onApply={set}
            />
          </div>
        );
      }}
    />
  );
}

/**
 * 기타 관심 분야 추가 모달(920:40046 / 920:41367)과 수정 팝업(920:41288).
 * 같은 틀에 버튼만 다르다 — 추가는 `추가` 하나(오른쪽 120), 수정은
 * `삭제` / `변경` 반반.
 *
 * 시안에 오류 문구가 없어서 임시 문구를 칸 아래에 쓴다(가이드 D2-8).
 */
function InterestDialog({
  state,
  onClose,
  onAdd,
  onRename,
  onRemove,
  onApply,
}: {
  state: InterestDialogState;
  onClose: () => void;
  onAdd: (input: string) => ReturnType<typeof addCustomInterest>;
  onRename: (from: string, input: string) => ReturnType<typeof renameCustomInterest>;
  onRemove: (name: string) => string[];
  onApply: (values: string[]) => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string>();
  const editing = state?.mode === "edit";

  // 열릴 때마다 칸을 새로 채운다 — 추가는 빈 칸, 수정은 지금 이름
  const [openedFor, setOpenedFor] = useState<InterestDialogState>(null);
  if (state !== openedFor) {
    setOpenedFor(state);
    setText(state?.mode === "edit" ? state.value : "");
    setError(undefined);
  }

  const submit = () => {
    if (!state) return;
    const result = state.mode === "edit" ? onRename(state.value, text) : onAdd(text);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onApply(result.values);
    onClose();
  };

  const remove = () => {
    if (state?.mode !== "edit") return;
    onApply(onRemove(state.value));
    onClose();
  };

  const empty = !text.trim();
  const buttonSize = "h-11 lg:h-13";

  return (
    <CompactDialog
      open={state !== null}
      onOpenChange={(open) => (open ? undefined : onClose())}
      label={editing ? "기타 관심 분야 수정" : "기타 관심 분야 추가"}
    >
      <form
        noValidate
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          // 대화상자는 포털로 body 에 그려지지만 React 이벤트는 컴포넌트 트리를
          // 따라 올라간다 — 막지 않으면 바깥 페이지 폼(기본 정보 `다음`,
          // 정보 수정 `저장`)까지 제출된다
          e.stopPropagation();
          if (!empty) submit();
        }}
      >
        {/* 제목 줄이 없다 — 칸 라벨이 제목 역할. ✕ 자리(32)만큼 오른쪽을 비운다 */}
        <Field
          label="기타 관심 분야"
          className="[&>label]:pr-10"
          placeholder="분야를 입력하세요"
          maxLength={INTEREST_MAX_LENGTH}
          autoFocus
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError(undefined);
          }}
          onKeyDown={(e) => {
            // 한글 조합을 끝내는 Enter 로 제출하면 마지막 글자가 빠진 값이 들어간다
            if (e.key === "Enter" && e.nativeEvent.isComposing) e.preventDefault();
          }}
          error={error}
        />

        {editing ? (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={remove}
              className={cn(action({ variant: "secondary" }), buttonSize, "flex-1")}
            >
              삭제
            </button>
            <button
              type="submit"
              disabled={empty}
              className={cn(action(), buttonSize, "flex-1")}
            >
              변경
            </button>
          </div>
        ) : (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={empty}
              className={cn(action(), buttonSize, "w-30")}
            >
              추가
            </button>
          </div>
        )}
      </form>
    </CompactDialog>
  );
}

/* ───────────────── 참여 활동 ───────────────── */

/**
 * 피그마 `참여 활동 입력`(875:30619 / 875:30665) — 태그 입력 칸 하나(가이드
 * 2.6.1). Enter · 쉼표로 확정, 명세 한도 20개 · 각 50자.
 *
 * ✕ 는 두 폭 모두 둔다(가이드 D2-12, `Hashtag` 주석). 시안은 모바일에만 그렸다.
 */
export function StudentActivitiesField() {
  const { control } = useFormContext<Values>();

  return (
    <Controller
      control={control}
      name="activities"
      render={({ field }) => (
        <TagInput
          label="참여 활동 (선택)"
          placeholder="#참여 활동 입력"
          value={field.value}
          onChange={(next) => {
            field.onChange(next);
            field.onBlur();
          }}
          max={20}
          maxLength={50}
        />
      )}
    />
  );
}

/* ───────────────── 이력서 · 포트폴리오 ───────────────── */

/** 올리는 중이거나 실패한 파일. 다 올라간 파일만 폼 값으로 간다 */
type PendingFile = {
  id: number;
  fileName: string;
  status: "uploading" | "error";
  error?: string;
  controller?: AbortController;
};

const PDF_ONLY = "pdf 파일만 올릴 수 있어요.";
const OVER_LIMIT = `pdf 파일은 최대 ${ATTACHMENT_MAX}개까지 첨부할 수 있어요.`;

function isPdf(file: File): boolean {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

function describeUploadError(error: unknown): string {
  if (isApiError(error)) {
    if (error.status === 413) return "파일이 너무 커요.";
    if (error.status === 400) return PDF_ONLY;
  }
  return "올리지 못했어요. 다시 시도해 주세요.";
}

/**
 * 피그마 `이력서 / 포트폴리오`(923:44145 / 923:44552, 빈 상태 335:7095 /
 * 335:6954, 드래그 927:9551). 가이드 2.6.2.
 *
 * PDF 를 최대 3개, **고르는 순간 올린다**(선배 명함과 같은 흐름). 서버가
 * 가입 중 업로드를 허용한다(가이드 D2-1). 확정(`student/info` 저장)까지 가지
 * 않은 파일은 하루 뒤 서버가 지운다(`api/file.ts`).
 *
 * | | 데스크톱 | 모바일 |
 * |---|---|---|
 * | 안내 + `파일 선택` | 맨 위 한 줄(왼쪽 안내 두 줄, 오른쪽 버튼) | 맨 아래 가운데 버튼 |
 * | 개수 `n/3` | 목록 아래 오른쪽 | 목록 아래 줄(왼쪽 안내, 오른쪽 개수) |
 *
 * 올리는 중 · 실패 · 3개 참 상태는 시안에 없다(가이드 D2-8 임시안). 올리는
 * 동안에는 `onBusyChange(true)` 로 알려 저장 버튼을 막게 한다.
 *
 * 정보 수정은 **이미 저장된 파일**도 보인다. 그 링크는 presigned URL 이라
 * 만료되므로 `refresh` 를 주면 누를 때 새 URL 로 연다(05장 5.3.3). 가입
 * 화면은 방금 올린 파일(blob URL)뿐이라 주지 않는다.
 */
export function StudentAttachmentsField({
  onBusyChange,
  refresh,
}: {
  onBusyChange?: (busy: boolean) => void;
  refresh?: () => Promise<StudentAttachment[]>;
}) {
  const { control } = useFormContext<Values>();

  return (
    <Controller
      control={control}
      name="attachments"
      render={({ field }) => (
        <AttachmentsBox
          value={field.value}
          onChange={(next) => {
            field.onChange(next);
            field.onBlur();
          }}
          onBusyChange={onBusyChange}
          refresh={refresh}
        />
      )}
    />
  );
}

function AttachmentsBox({
  value,
  onChange,
  onBusyChange,
  refresh,
}: {
  value: StudentAttachmentValue[];
  onChange: (next: StudentAttachmentValue[]) => void;
  onBusyChange?: (busy: boolean) => void;
  refresh?: () => Promise<StudentAttachment[]>;
}) {
  const labelId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [notice, setNotice] = useState<string>();
  const nextId = useRef(0);
  /** 업로드가 끝나는 시점의 최신 목록. 여러 개를 동시에 올리면 서로 덮지 않게 */
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  }, [value]);
  /** 이 화면에서 만든 blob URL. 지우거나 떠날 때 놓아준다 */
  const blobs = useRef(new Set<string>());

  const uploading = pending.some((p) => p.status === "uploading");
  useEffect(() => onBusyChange?.(uploading), [uploading, onBusyChange]);

  // 화면을 떠날 때 업로드를 끊는다. blob URL 은 보관함(가입 초안)이 들고 있을
  // 수 있어 놓지 않는다 — 탭을 닫으면 브라우저가 거둔다
  const pendingRef = useRef(pending);
  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);
  useEffect(
    () => () => {
      for (const p of pendingRef.current) p.controller?.abort();
    },
    []
  );

  const used = value.length + pending.filter((p) => p.status === "uploading").length;
  /**
   * 예전 첨부가 3개를 넘는 학생(서버 상한은 10). 스키마가 막아 저장이 꺼지므로
   * 이유를 알려 준다 — 지워서 3개 이하로 맞추면 사라진다(05장 5.3.4)
   */
  const over = value.length > ATTACHMENT_MAX;
  const full = used >= ATTACHMENT_MAX;

  const choose = (files: File[]) => {
    setNotice(undefined);
    const room = ATTACHMENT_MAX - used;
    if (files.length > room) {
      setNotice(OVER_LIMIT);
    }

    for (const file of files.slice(0, Math.max(0, room))) {
      const id = nextId.current++;
      // 끌어다 놓기는 `accept` 를 거치지 않는다. 서버에 묻기 전에 거른다
      if (!isPdf(file)) {
        setPending((list) => [
          ...list,
          { id, fileName: file.name, status: "error", error: PDF_ONLY },
        ]);
        continue;
      }

      const controller = new AbortController();
      setPending((list) => [
        ...list,
        { id, fileName: file.name, status: "uploading", controller },
      ]);

      uploadFile("attachment", file, controller.signal).then(
        ({ key, fileName }) => {
          if (controller.signal.aborted) return;
          const href = URL.createObjectURL(file);
          blobs.current.add(href);
          setPending((list) => list.filter((p) => p.id !== id));
          // 다음 렌더를 기다리지 않고 바로 고쳐 둔다 — 여러 개가 같은 순간에
          // 끝나면 effect 가 돌기 전에 다음 업로드가 옛 목록을 읽어 앞의 파일을 덮는다
          const next: StudentAttachmentValue[] = [
            ...latest.current,
            { kind: "portfolio", source: "file", key, fileName, href },
          ];
          latest.current = next;
          onChange(next);
        },
        (error) => {
          if (controller.signal.aborted) return;
          setPending((list) =>
            list.map((p) =>
              p.id === id
                ? { ...p, status: "error", error: describeUploadError(error), controller: undefined }
                : p
            )
          );
        }
      );
    }
  };

  const removeDone = (index: number) => {
    const target = value[index];
    if (target?.source === "file" && target.href && blobs.current.has(target.href)) {
      URL.revokeObjectURL(target.href);
      blobs.current.delete(target.href);
    }
    setNotice(undefined);
    onChange(value.filter((_, i) => i !== index));
  };

  const removePending = (id: number) => {
    setNotice(undefined);
    setPending((list) => {
      list.find((p) => p.id === id)?.controller?.abort();
      return list.filter((p) => p.id !== id);
    });
  };

  const openPicker = () => inputRef.current?.click();
  const { dragging, dropProps } = useFileDrop(choose, full);
  const hasRows = value.length > 0 || pending.length > 0;
  const count = `${value.length}/${ATTACHMENT_MAX}`;

  const pick = (
    <FilePickButton
      icon={attachmentIcon}
      onClick={openPicker}
      disabled={full}
      aria-describedby={`${labelId}-rule`}
      className="shrink-0"
    >
      파일 선택
    </FilePickButton>
  );

  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-col gap-2">
      <p id={labelId} className="text-label text-ink">
        이력서 / 포트폴리오 (선택)
      </p>

      {/* 고르는 건 `파일 선택` 버튼이 대신한다. 이 입력은 눈에 보이지 않는다 */}
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className="hidden"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          choose(Array.from(e.target.files ?? []));
          // 같은 파일을 다시 골라도 change 가 오게 비운다
          e.target.value = "";
        }}
      />

      {/*
       * 피그마 `Upload / 이력서·포트폴리오` — 테두리 없는 muted 상자. 드래그
       * 중에만 subtle 바탕 + 실선 focus(927:9551). 자리가 밀리지 않게 평소에도
       * 투명한 1px 테두리를 둔다.
       */}
      <div
        {...dropProps}
        className={cn(
          "flex flex-col gap-3 rounded-md border px-4 py-3 max-lg:gap-2",
          dragging ? "bg-subtle border-focus" : "bg-muted border-transparent"
        )}
      >
        {/* 데스크톱 맨 위 줄: 안내 + 버튼 */}
        <div className="hidden items-center justify-between gap-4 lg:flex">
          <div className="text-ink min-w-0">
            <p className="text-label">
              첨부할 파일을 여기에 끌어다 놓거나, 파일 선택 버튼을 직접 선택해주세요.
            </p>
            <p id={`${labelId}-rule`} className="text-body-sm">
              pdf 파일을 최대 {ATTACHMENT_MAX}개 첨부할 수 있어요.
            </p>
          </div>
          {pick}
        </div>

        {/* 모바일 빈 상태: 가운데 안내 두 줄 */}
        {!hasRows ? (
          <div className="text-ink py-2 text-center lg:hidden">
            <p className="text-label">파일을 선택해주세요.</p>
            <p className="text-body-sm">pdf 파일을 최대 {ATTACHMENT_MAX}개 첨부할 수 있어요.</p>
          </div>
        ) : null}

        {hasRows ? (
          // 목록 → 개수 줄: 데스크톱 0, 모바일 4(05장 5.3.4)
          <div className="flex flex-col gap-1 lg:gap-0">
            <ul className="flex flex-col gap-1">
              {value.map((attachment, index) => (
                <AttachmentRow
                  key={attachment.source === "file" ? attachment.key : attachment.url}
                  name={
                    attachment.source === "file"
                      ? attachment.fileName
                      : attachment.url.replace(/^https?:\/\//i, "").replace(/\/$/, "")
                  }
                  href={attachment.source === "file" ? attachment.href : attachment.url}
                  // 저장돼 있던 파일(blob 이 아닌 presigned URL)은 누를 때 새 URL 로
                  stored={
                    refresh &&
                    attachment.source === "file" &&
                    attachment.href &&
                    !attachment.href.startsWith("blob:")
                      ? {
                          attachment: {
                            kind: attachment.kind,
                            source: "file",
                            key: attachment.key,
                            url: attachment.href,
                            file_name: attachment.fileName,
                          },
                          refresh,
                        }
                      : undefined
                  }
                  onRemove={() => removeDone(index)}
                />
              ))}
              {pending.map((file) => (
                <AttachmentRow
                  key={`pending-${file.id}`}
                  name={file.fileName}
                  status={file.status === "uploading" ? "올리는 중…" : undefined}
                  error={file.error}
                  onRemove={() => removePending(file.id)}
                  removeLabel={file.status === "uploading" ? "취소" : "삭제"}
                />
              ))}
            </ul>

            {/* 피그마 `Attachment status` — Label/Micro 11 흐린 글자 */}
            <div className="text-label-xs text-ink-faint flex items-center justify-between gap-2">
              <span className="lg:hidden">pdf 파일을 최대 {ATTACHMENT_MAX}개 첨부할 수 있어요.</span>
              <span aria-label={`${ATTACHMENT_MAX}개 중 ${value.length}개 첨부`} className="ml-auto">
                {count}
              </span>
            </div>
          </div>
        ) : null}

        {/* 모바일 버튼: 맨 아래 가운데 */}
        <div className="flex justify-center lg:hidden">{pick}</div>
      </div>

      {notice || over ? (
        <p role="alert" className="text-body-sm text-danger">
          {notice ?? OVER_LIMIT}
        </p>
      ) : null}
    </div>
  );
}

/**
 * 피그마 `Attachment / 포트폴리오.pdf` — 흰 줄, 왼쪽 파일 이름(브랜드색 밑줄
 * 링크), 오른쪽 `삭제` + ✕ 원. 파일 크기 · 교체 버튼은 시안에 없다.
 */
function AttachmentRow({
  name,
  href,
  stored,
  status,
  error,
  onRemove,
  removeLabel = "삭제",
}: {
  name: string;
  href?: string;
  /** 저장된 파일. 주면 누를 때 presigned URL 을 다시 받아 연다(`AttachmentLink`) */
  stored?: {
    attachment: StudentAttachment;
    refresh: () => Promise<StudentAttachment[]>;
  };
  status?: string;
  error?: string;
  onRemove: () => void;
  removeLabel?: string;
}) {
  return (
    <li className="bg-surface border-line flex flex-col gap-1 rounded-md border px-3 py-2">
      <div className="flex min-h-5 items-center justify-between gap-3">
        {stored ? (
          <AttachmentLink
            attachment={stored.attachment}
            refresh={stored.refresh}
            className="text-label-sm text-brand flex min-w-0 underline"
          />
        ) : href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            className="text-label-sm text-brand min-w-0 truncate underline"
          >
            {name}
          </a>
        ) : (
          <span className="text-label-sm text-ink min-w-0 truncate">{name}</span>
        )}
        <div className="flex shrink-0 items-center gap-3">
          {status ? (
            <span role="status" className="text-label-sm text-ink-soft">
              {status}
            </span>
          ) : null}
          <button
            type="button"
            onClick={onRemove}
            aria-label={`${name} ${removeLabel}`}
            className="text-label-sm text-ink-soft focus-visible:ring-focus flex items-center gap-1 rounded-sm focus-visible:ring-2 focus-visible:outline-none"
          >
            {removeLabel}
            <img src={xmarkCircleIcon} alt="" width={20} height={20} />
          </button>
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-label-sm text-danger">
          {error}
        </p>
      ) : null}
    </li>
  );
}

/* ───────────────── 알림 설정 ───────────────── */

/**
 * 피그마 `알림 설정`(943:9742 / 943:9806) — 선배와 같은 채널 묶음
 * (`ContactChannelFields`)을 쓴다. 가이드 2.6.3.
 *
 * - 시안의 `알림 받지 않기` 는 **만들지 않는다**(D2-2, #44). 연락 수단은 하나
 *   이상 필수다
 * - 제목의 `(선택)` 과 설명의 둘째 문장(알림 받지 않기 안내)은 그래서 뺐다
 * - 처음 값은 이메일 체크 + 인증한 메일(`studentContactDefaults`)
 */
export function StudentContactFields() {
  return (
    <ContactChannelFields
      title="알림 설정"
      description="커피챗 성사 시 연락 받을 수단을 선택해주세요."
      requireOne="연락 방법을 하나 이상 선택해 주세요."
    />
  );
}
