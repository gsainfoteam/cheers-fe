import { useId } from "react";
import {
  Controller,
  useFieldArray,
  useFormContext,
  useWatch,
} from "react-hook-form";
import type { Department } from "@/api";
import { Choice } from "@/components/ui/choice";
import { Field, Select } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import type { StudentEditValues } from "./student-form";

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
  /** 가입 화면은 `가입 후 변경할 수 없어요.`, 정보 수정 시안은 도움말이 없다 */
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
            placeholder="실명을 입력해 주세요"
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
            value={field.value ?? ""}
            onBlur={field.onBlur}
            onChange={(e) =>
              field.onChange(e.target.value ? Number(e.target.value) : null)
            }
            className="lg:w-87"
          >
            <option value="" disabled>
              학과를 선택해 주세요
            </option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </Select>
        )}
      />
    </div>
  );
}

/* ───────────────── 관심 분야 ───────────────── */

/**
 * 피그마 `관심 분야`. 칩 폭(모바일 112.33 · 데스크톱 113.33)은 칸을 똑같이
 * 나눈 값이라 `flex-wrap` 이 아니라 3열/6열 격자다(설계 3-5a).
 *
 * `fieldset`/`legend` 가 아니라 `role="group"` 이다 — legend 는 flex 자식으로
 * 취급되지 않는 브라우저가 있어 `gap` 이 한 칸 어긋난다.
 */
export function StudentInterestsField({
  options,
  description,
  className,
}: {
  options: string[];
  /** 가입 화면은 `하나 이상 선택해 주세요.`, 정보 수정 시안은 설명이 없다 */
  description?: string;
  /** 묶음 안 간격. 기본 12, 정보 수정 시안은 28(`gap-7`) */
  className?: string;
}) {
  const { control } = useFormContext<Values>();
  const labelId = useId();

  return (
    <Controller
      control={control}
      name="interests"
      render={({ field }) => {
        const toggle = (interest: string) =>
          field.onChange(
            field.value.includes(interest)
              ? field.value.filter((v) => v !== interest)
              : [...field.value, interest]
          );

        return (
          <div
            role="group"
            aria-labelledby={labelId}
            className={cn("flex flex-col gap-3", className)}
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
                  selected={field.value.includes(interest)}
                  onClick={() => toggle(interest)}
                >
                  {interest}
                </Choice>
              ))}
            </div>
          </div>
        );
      }}
    />
  );
}

/* ───────────────── 참여 활동 · 링크 ───────────────── */

/**
 * 피그마 `참여 활동` + `+ 활동 추가`. 시안에는 칸이 하나뿐이지만 명세는
 * 20개까지 받는다. 줄 사이는 12 — 시안의 28 은 묶음과 묶음 사이 간격이고
 * 같은 칸이 반복되는 자리에 쓰면 한 덩어리로 안 읽힌다(설계 3-6c).
 */
export function StudentActivitiesField() {
  const { register, control, getFieldState, formState } = useFormContext<Values>();
  const { fields, append } = useFieldArray({ control, name: "activities" });

  return (
    <>
      <div className="flex flex-col gap-3">
        {fields.map((row, i) => {
          const state = getFieldState(`activities.${i}.value`, formState);
          return (
            <Field
              // 줄은 늘기만 하고 지우는 자리가 없다. useFieldArray 의 id 가 정체성이다
              key={row.id}
              label={i === 0 ? "참여 활동 (선택)" : `참여 활동 ${i + 1}`}
              labelHidden={i > 0}
              maxLength={50}
              placeholder="예) 학부 연구생"
              error={state.isTouched ? state.error?.message : undefined}
              {...register(`activities.${i}.value`)}
            />
          );
        })}
      </div>

      {/* 피그마 `+ 활동 추가` — 글자만 있는 자리지만 동작은 버튼이다 */}
      {fields.length < 20 ? (
        <button
          type="button"
          onClick={() => append({ value: "" }, { shouldFocus: true })}
          className="text-label text-brand self-start"
        >
          + 활동 추가
        </button>
      ) : null}
    </>
  );
}

export function StudentPortfolioField({ hint }: { hint?: string }) {
  const { control } = useFormContext<Values>();

  return (
    <Controller
      control={control}
      name="portfolioUrl"
      render={({ field, fieldState }) => (
        <Field
          {...field}
          label="이력서 / 포트폴리오 링크 (선택)"
          type="url"
          inputMode="url"
          maxLength={2048}
          placeholder="입력해 주세요"
          hint={hint}
          error={fieldState.isTouched ? fieldState.error?.message : undefined}
        />
      )}
    />
  );
}

/* ───────────────── 연락 설정 ───────────────── */

/**
 * 피그마 `연락 설정` — `이메일` · `카카오 알림톡` 칩 + 읽기 전용 학교 이메일
 * + (알림톡을 켜면) 휴대폰 칸.
 *
 * 시안의 세 번째 칩 `희망하지 않음` 은 **두지 않는다** — 명세가 재학생의
 * "둘 다 끔" 을 400 으로 막는다(설계 3-6b). 휴대폰 칸은 시안에 없지만 알림톡을
 * 켜면 명세가 번호를 요구해서 만들었다.
 */
export function StudentContactFields({ contactEmail }: { contactEmail: string }) {
  const { control, setValue, trigger, getFieldState, formState } =
    useFormContext<Values>();
  const labelId = useId();
  const emailEnabled = useWatch({ control, name: "emailEnabled" });
  const kakaoEnabled = useWatch({ control, name: "kakaoEnabled" });
  // 칩을 한 번이라도 누른 뒤에만 "하나 이상" 문구를 띄운다
  const channel = getFieldState("emailEnabled", formState);

  const toggle = (name: "emailEnabled" | "kakaoEnabled", on: boolean) => {
    setValue(name, !on, { shouldDirty: true, shouldTouch: true });
    // 연락 설정 규칙은 세 칸에 걸쳐 있다(`contactRules`). 누른 칸만 다시
    // 검사하면 다른 칸 자리에 걸린 오류("하나 이상")가 남는다 — 셋을 같이 본다.
    // `emailEnabled` 는 오류가 걸리는 자리라 알림톡을 눌러도 touched 로 둔다
    setValue("emailEnabled", name === "emailEnabled" ? !on : emailEnabled, {
      shouldTouch: true,
    });
    void trigger(["emailEnabled", "kakaoEnabled", "phone"]);
  };

  return (
    <div className="flex flex-col gap-3">
      <h2 id={labelId} className="text-card-title text-ink">
        연락 설정
      </h2>
      <p className="text-body-sm text-ink-soft">
        커피챗 소식을 받을 방법을 선택해 주세요.
      </p>
      <div role="group" aria-labelledby={labelId} className="flex flex-wrap gap-2">
        <Choice
          selected={emailEnabled}
          onClick={() => toggle("emailEnabled", emailEnabled)}
        >
          이메일
        </Choice>
        <Choice
          selected={kakaoEnabled}
          onClick={() => toggle("kakaoEnabled", kakaoEnabled)}
        >
          카카오 알림톡
        </Choice>
      </div>

      {channel.isTouched && channel.error ? (
        <p role="alert" className="text-body-sm text-danger">
          {channel.error.message}
        </p>
      ) : null}

      {emailEnabled ? <Field label="이메일" value={contactEmail} readOnly /> : null}

      {kakaoEnabled ? (
        <Controller
          control={control}
          name="phone"
          render={({ field, fieldState }) => (
            <Field
              {...field}
              label="휴대폰 번호"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={13}
              placeholder="01012345678"
              hint="알림톡을 받을 번호예요."
              error={
                fieldState.isTouched && field.value
                  ? fieldState.error?.message
                  : undefined
              }
            />
          )}
        />
      ) : null}
    </div>
  );
}
