import { useState } from "react";
import { Field } from "@/components/ui/field";
import { EMAIL, PHONE, digitsOf } from "@/lib/mentor-profile-form";

/**
 * 선배 연락처 묶음 — `공유할 연락처` + 구분선 + `신청 알림`. 피그마
 * `Contact and notification settings`(선배 추가 정보 342:9076, 정보 수정 338:8984).
 *
 * 가입 추가 정보와 정보 수정이 **글자 하나 다르지 않은** 묶음이라 두 화면이
 * 이것을 import 한다(선배 가이드 §5.6). 바깥 `id` 는 마이페이지의
 * `연락처·알림 번호 수정` 이 이 자리로 바로 오게 하는 닻이다(`#contact`).
 *
 * 값은 쓰는 쪽이 들고, 이 묶음은 **언제 오류를 보일지**만 안다. 형식 오류는
 * 한 번 쳐 보고 칸을 떠난 뒤에만 띄운다 — 빈 칸은 문구 없이 버튼만 막는다
 * (아직 아무것도 안 쳤는데 빨간 칸이 서지 않게).
 */
export function MentorContactFields({
  id,
  email,
  phone,
  onEmailChange,
  onPhoneChange,
}: {
  id?: string;
  email: string;
  phone: string;
  onEmailChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
}) {
  const [touched, setTouched] = useState({ email: false, phone: false });

  const emailError =
    touched.email && email.trim() && !EMAIL.test(email.trim())
      ? "이메일 형식을 확인해 주세요."
      : undefined;
  const phoneError =
    touched.phone && phone.trim() && !PHONE.test(digitsOf(phone))
      ? "휴대전화번호 형식을 확인해 주세요."
      : undefined;

  return (
    <div id={id} className="flex scroll-mt-24 flex-col gap-6">
      {/* 피그마 `Shared contact` */}
      <div className="flex flex-col gap-3">
        <h2 className="text-card-title text-ink">공유할 연락처</h2>
        <Field
          label="이메일"
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={255}
          placeholder="alumni@example.com"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          hint="연락처 공유를 선택한 학생에게만 이름과 함께 전달돼요."
          error={emailError}
        />
      </div>

      <div className="bg-line h-px" />

      {/* 피그마 `Private Alimtalk recipient` */}
      <div className="flex flex-col gap-3">
        <h2 className="text-card-title text-ink">신청 알림</h2>
        <p className="text-body-sm text-ink-soft">
          새 커피챗 신청을 카카오 알림톡으로 알려드려요.
        </p>
        <Field
          // 임시: 이슈 #26 — 둘 다 필수. 시안 라벨의 `(선택)` 을 뗐다
          label="알림 받을 휴대전화번호"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          maxLength={13}
          placeholder="010-0000-0000"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
          hint="등록한 번호로 신청 알림을 보내요. 학생에게 공유되지 않아요."
          error={phoneError}
        />
      </div>
    </div>
  );
}
