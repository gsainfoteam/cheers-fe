import { useId } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { CheckRow } from "@/components/ui/check-row";
import { Field } from "@/components/ui/field";
import type { ContactChannels } from "@/lib/profile-form";

/**
 * 연락 채널 묶음 — 체크박스(카카오 알림톡 · 이메일) + 켠 채널의 입력 칸.
 * 피그마 선배 `커피챗 참여 설정`(1159:10067 / 1159:10229, 동기화 가이드
 * 3.5.3). 학생 `알림 설정`(943:9742, 가이드 2.6.3)도 같은 모양이라 학생 화면을
 * 구현할 때 이 묶음에 `알림 받지 않기` 선택지만 더해 쓴다.
 *
 * | | 데스크톱 | 모바일 |
 * |---|---|---|
 * | 한 채널 | 체크박스 140 + 칸 `flex-1` 한 줄 | 체크박스 줄 아래 칸(간격 8) |
 *
 * **체크를 해제하면 칸을 감춘다**(시안에 해제 상태가 없다 — 가이드 D3-5).
 * 값은 폼에 남아 다시 체크하면 되살아난다. 저장할 때 끈 채널의 값은
 * 보내지 않는다(`contactRequestFrom`).
 *
 * 값은 `useFormContext` 로 받는다. 폼의 `contact` 자리에
 * `contactChannelsSchema`(`contact-channel-form.ts`)를 두면 된다.
 */

type Values = { contact: ContactChannels };

export function ContactChannelFields({
  id,
  title,
  description,
  notice,
}: {
  /** 바깥 닻. 마이페이지의 `연락처·알림 번호 수정` 이 이 자리로 바로 온다 */
  id?: string;
  title: string;
  description: React.ReactNode;
  /** 설명 아래 한 줄 더. 시안에 없는 임시 안내를 둘 때 쓴다 */
  notice?: string;
}) {
  const titleId = useId();
  const { control } = useFormContext<Values>();
  const [kakao, email] = useWatch({
    control,
    name: ["contact.kakao", "contact.email"],
  });

  return (
    <fieldset
      id={id}
      aria-labelledby={titleId}
      className="flex min-w-0 scroll-mt-24 flex-col gap-2"
    >
      {/* `legend` 는 flex 배치를 따르지 않아 `p` + aria 로 묶는다 */}
      <p id={titleId} className="text-label text-ink">
        {title}
      </p>
      <p className="text-body-sm text-ink-soft">{description}</p>
      {notice ? <p className="text-body-sm text-ink-soft">{notice}</p> : null}

      <div className="flex flex-col gap-2">
        <ChannelRow
          label="카카오 알림톡"
          checkName="contact.kakao"
          checked={kakao}
          input={
            <Controller
              control={control}
              name="contact.phone"
              render={({ field, fieldState }) => (
                <Field
                  {...field}
                  label="카카오 알림톡 받을 전화번호"
                  labelHidden
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={13}
                  placeholder="전화번호를 입력해주세요."
                  error={visibleError(fieldState, field.value)}
                  className="lg:flex-1"
                />
              )}
            />
          }
        />
        <ChannelRow
          label="이메일"
          checkName="contact.email"
          checked={email}
          input={
            <Controller
              control={control}
              name="contact.emailAddress"
              render={({ field, fieldState }) => (
                <Field
                  {...field}
                  label="알림 받을 이메일"
                  labelHidden
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  maxLength={255}
                  placeholder="이메일을 입력해주세요."
                  error={visibleError(fieldState, field.value)}
                  className="lg:flex-1"
                />
              )}
            />
          }
        />
      </div>
    </fieldset>
  );
}

/** 피그마 `Option / 카카오 알림톡` · `Option / 이메일` */
function ChannelRow({
  label,
  checkName,
  checked,
  input,
}: {
  label: string;
  checkName: "contact.kakao" | "contact.email";
  checked: boolean;
  input: React.ReactNode;
}) {
  const { control } = useFormContext<Values>();

  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:gap-0">
      <Controller
        control={control}
        name={checkName}
        render={({ field }) => (
          <CheckRow
            compact
            label={label}
            checked={field.value}
            onChange={() => field.onChange(!field.value)}
            className="lg:w-35 lg:shrink-0"
          />
        )}
      />
      {checked ? input : null}
    </div>
  );
}

/**
 * 형식 오류는 한 번 쳐 보고 칸을 떠난 뒤에만 띄운다. 빈 칸은 문구 없이
 * 버튼만 막는다 — 아직 아무것도 안 쳤는데 빨간 칸이 서지 않게.
 */
function visibleError(
  fieldState: { isTouched: boolean; error?: { message?: string } },
  value: string
): string | undefined {
  return fieldState.isTouched && value.trim() ? fieldState.error?.message : undefined;
}
