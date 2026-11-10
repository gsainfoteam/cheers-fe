import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Controller, useFormContext } from "react-hook-form";
import { companySearchQuery } from "@/api";
import { Field } from "@/components/ui/field";
import { SearchSelect } from "@/components/ui/search-select";
import { TagInput } from "@/components/ui/tag-input";
import { nicknameProblem } from "@/lib/nickname";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import type { MentorFormValues } from "./mentor-form";

/**
 * 선배 프로필 칸 묶음 — 가입(기본 정보 · 추가 정보)과 정보 수정이 같은
 * 묶음을 import 한다(이슈 #10, 선배 가이드 §5.6). 값과 규칙은
 * `useFormContext` 로 받는다 — 쓰는 쪽은 `mentor-form.ts` 의 스키마로
 * `useForm` 을 세우고 `FormProvider` 로 감싸기만 한다.
 *
 * **오류는 칸을 한 번 떠난 뒤에만 보인다**(`isTouched`). 빈 칸은 문구 없이
 * 저장 버튼만 막는다 — 아직 아무것도 안 쳤는데 빨간 칸이 서지 않게.
 */

type Values = MentorFormValues;

/* ───────────────── 이름 · 닉네임 (가입) ───────────────── */

/**
 * 피그마 `Identity fields`. 정보 수정에서는 둘 다 고칠 수 없어 폼 밖의 읽기
 * 전용 칸으로 서므로 이 묶음은 가입 기본 정보만 쓴다.
 */
export function MentorIdentityFields({
  nameLocked,
  nicknameLocked,
}: {
  nameLocked: boolean;
  nicknameLocked: boolean;
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
            label="이름 (비공개)"
            autoComplete="name"
            maxLength={64}
            placeholder="이름을 입력하세요"
            readOnly={nameLocked}
            hint="가입 후 변경할 수 없어요."
            error={fieldState.isTouched ? fieldState.error?.message : undefined}
            className="lg:w-87"
          />
        )}
      />
      <Controller
        control={control}
        name="nickname"
        render={({ field, fieldState }) => {
          /**
           * 공백·특수문자는 치는 즉시 알린다. 길이와 조합 중인 자모는 칸을
           * 떠난 뒤에만 — 한 글자 쳤을 뿐인데 "2~10자" 가 뜨거나, `반ㄷ` 처럼
           * 조합하는 도중에 빨간 칸이 깜빡이면 안 된다. 중복(저장 응답)은 바로.
           */
          const problem = nicknameProblem(field.value);
          const immediate = problem === "space" || problem === "symbol" || !problem;
          return (
            <Field
              {...field}
              label="닉네임"
              autoComplete="nickname"
              maxLength={10}
              placeholder="사원증에 표시될 닉네임을 입력하세요"
              readOnly={nicknameLocked}
              hint="사원증에 표시돼요. 가입 후 변경할 수 없어요."
              error={
                fieldState.error && (immediate || fieldState.isTouched)
                  ? fieldState.error.message
                  : undefined
              }
              className="lg:w-87"
            />
          );
        }}
      />
    </div>
  );
}

/* ───────────────── 회사 · 부서 · 직무 (가입 · 수정) ───────────────── */

/**
 * 피그마 `회사명 검색 및 선택`(971:10278 / 971:12664) + `Work fields`.
 *
 * 정보 수정 시안은 회사명이 그냥 입력 칸이지만 **같은 검색 칸**을 쓴다 —
 * 수정만 자유 입력으로 두면 가입 때 막은 표기 흔들림(삼성전자 / 삼성 전자)이
 * 다시 생긴다(피그마 TODO `889:31017`). 검색어 · 열림은 이 묶음이 들고 있어
 * 열린 채로 1024px 경계를 넘어도 살아남는다.
 *
 * 검색은 서버(`GET /api/v1/company`)가 한다 — 별칭(`마소` → Microsoft) ·
 * 표기 흔들림을 클라이언트가 흉내 낼 수 없다(선배 가이드 §2.4a). 결과 칩을
 * 고르면 `company_id` 가 선다. 결과가 없어 검색어 그대로 확정되면(닫을 때 —
 * `SearchSelect` 머리말) null 이고, 그 이름으로만 가입된다. 검색이 실패해도
 * 결과가 빈 것과 같다 — 이름으로 저장해도 서버가 같은 표기의 회사로 맞춰
 * 주므로 막지 않는다.
 */
export function MentorWorkFields() {
  const { control, register, getFieldState, formState, getValues, setValue } =
    useFormContext<Values>();
  const [query, setQuery] = useState(() => getValues("company"));
  const [open, setOpen] = useState(false);

  const debounced = useDebouncedValue(query.trim());
  const search = useQuery({
    ...companySearchQuery(debounced),
    // 닫힌 칸에는 결과가 필요 없다. 처음 값(정보 수정)으로 요청이 나가지 않게
    enabled: open && debounced.length > 0,
  });
  const companies = query.trim() ? (search.data ?? []) : [];
  // 같은 이름이 둘 오면 칩 key 가 겹친다. 먼저 온 쪽을 쓴다
  const results = [...new Set(companies.map((company) => company.name))];
  const error = (name: "department" | "job") => {
    const state = getFieldState(name, formState);
    return state.isTouched ? state.error?.message : undefined;
  };

  return (
    <>
      <Controller
        control={control}
        name="company"
        render={({ field }) => (
          <SearchSelect
            label="회사명"
            placeholder="회사명을 검색하여 선택하세요"
            searchTitle="회사명 검색"
            maxLength={128}
            value={field.value}
            onSelect={(value) => {
              // 결과 칩이면 그 회사의 id, 직접 친 이름이면 목록에 없으니 null
              const picked = companies.find((company) => company.name === value);
              setValue("company_id", picked?.company_id ?? null);
              field.onChange(value);
              field.onBlur();
              setQuery(value);
            }}
            query={query}
            onQueryChange={setQuery}
            results={results}
            open={open}
            onOpenChange={setOpen}
          />
        )}
      />

      {/* 피그마 `Work fields` — 모바일은 세로, 데스크톱은 좌우 반반 */}
      <div className="flex flex-col gap-7 lg:flex-row lg:gap-6">
        <Field
          label="부서 (비공개)"
          autoComplete="organization-title"
          maxLength={128}
          placeholder="부서를 입력하세요"
          error={error("department")}
          className="lg:w-87"
          {...register("department")}
        />
        <Field
          label="직무"
          maxLength={128}
          placeholder="직무를 입력하세요"
          error={error("job")}
          className="lg:w-87"
          {...register("job")}
        />
      </div>
    </>
  );
}

/* ───────────────── 해시태그 · LinkedIn (가입 · 수정) ───────────────── */

/**
 * 피그마 `해시태그 (선택)` + `LinkedIn 프로필 링크 (선택)`.
 *
 * 정보 수정 시안은 해시태그가 글자 한 줄이지만 가입과 같은 칩 입력을 쓴다.
 * 문구만 화면마다 다르다(가입 모바일 placeholder 는 스킴이 없고, 수정은 있다).
 */
export function MentorExtraFields({
  hashtagHint,
  linkedinPlaceholder,
}: {
  hashtagHint?: string;
  linkedinPlaceholder: string;
}) {
  const { control } = useFormContext<Values>();

  return (
    <>
      <Controller
        control={control}
        name="hashtags"
        render={({ field }) => (
          <TagInput
            label="해시태그 (선택)"
            placeholder="예) 전기전자"
            hint={hashtagHint}
            value={field.value}
            onChange={field.onChange}
            max={5}
            maxLength={20}
          />
        )}
      />

      <Controller
        control={control}
        name="linkedin"
        render={({ field, fieldState }) => (
          <Field
            {...field}
            label="LinkedIn 프로필 링크 (선택)"
            // `type="url"` 을 쓰지 않는다 — 스킴 없는 주소를 브라우저가 틀렸다고 본다
            inputMode="url"
            autoComplete="url"
            maxLength={2048}
            placeholder={linkedinPlaceholder}
            error={fieldState.isTouched ? fieldState.error?.message : undefined}
          />
        )}
      />
    </>
  );
}

/* ───────────────── 연락처 묶음 (가입 · 수정) ───────────────── */

/**
 * 선배 연락처 묶음 — `공유할 연락처` + 구분선 + `신청 알림`. 피그마
 * `Contact and notification settings`(선배 추가 정보 342:9076, 정보 수정 338:8984).
 *
 * 가입 추가 정보와 정보 수정이 **글자 하나 다르지 않은** 묶음이다. 바깥 `id`
 * 는 마이페이지의 `연락처·알림 번호 수정` 이 이 자리로 바로 오게 하는 닻이다
 * (`#contact`).
 *
 * 형식 오류는 한 번 쳐 보고 칸을 떠난 뒤에만 띄운다. 빈 칸은 문구 없이 버튼만
 * 막는다.
 */
export function MentorContactFields({ id }: { id?: string }) {
  const { control } = useFormContext<Values>();

  return (
    <div id={id} className="flex scroll-mt-24 flex-col gap-6">
      {/* 피그마 `Shared contact` */}
      <div className="flex flex-col gap-3">
        <h2 className="text-card-title text-ink">공유할 연락처</h2>
        <Controller
          control={control}
          name="email"
          render={({ field, fieldState }) => (
            <Field
              {...field}
              label="이메일"
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={255}
              placeholder="alumni@example.com"
              hint="연락처 공유를 선택한 학생에게만 이름과 함께 전달돼요."
              error={
                fieldState.isTouched && field.value.trim()
                  ? fieldState.error?.message
                  : undefined
              }
            />
          )}
        />
      </div>

      <div className="bg-line h-px" />

      {/* 피그마 `Private Alimtalk recipient` */}
      <div className="flex flex-col gap-3">
        <h2 className="text-card-title text-ink">신청 알림</h2>
        <p className="text-body-sm text-ink-soft">
          새 커피챗 신청을 카카오 알림톡으로 알려드려요.
        </p>
        <Controller
          control={control}
          name="phone"
          render={({ field, fieldState }) => (
            <Field
              {...field}
              // 임시: 이슈 #26 — 둘 다 필수. 시안 라벨의 `(선택)` 을 뗐다
              label="알림 받을 휴대전화번호"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={13}
              placeholder="010-0000-0000"
              hint="등록한 번호로 신청 알림을 보내요. 학생에게 공유되지 않아요."
              error={
                fieldState.isTouched && field.value.trim()
                  ? fieldState.error?.message
                  : undefined
              }
            />
          )}
        />
      </div>
    </div>
  );
}
