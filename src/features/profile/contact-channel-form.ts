import { z } from "zod";
import { EMAIL, PHONE, digitsOf } from "@/lib/profile-form";

/**
 * 연락 채널 묶음(`ContactChannelFields`)의 검사 규칙. 동기화 가이드 3.5.3.
 */

/**
 * 켠 채널만 검사한다. 끈 채널은 비어 있어도, 형식이 틀려도 된다 —
 * 보내지 않는 값이다. 둘 다 끄는 것도 허용한다(선배: 커피챗 미참여).
 */
export const contactChannelsSchema = z
  .object({
    kakao: z.boolean(),
    email: z.boolean(),
    phone: z.string(),
    emailAddress: z.string().max(255),
  })
  .superRefine((value, ctx) => {
    if (value.kakao && !PHONE.test(digitsOf(value.phone))) {
      ctx.addIssue({
        code: "custom",
        path: ["phone"],
        message: "휴대전화번호 형식을 확인해 주세요.",
      });
    }
    if (value.email && !EMAIL.test(value.emailAddress.trim())) {
      ctx.addIssue({
        code: "custom",
        path: ["emailAddress"],
        message: "이메일 형식을 확인해 주세요.",
      });
    }
  });
