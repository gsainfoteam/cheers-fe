import type * as dto from "./dto";

/**
 * 백엔드 API 계약.
 *
 * 백엔드가 Swagger(OpenAPI) JSON 을 내보내지 않으므로, 이 파일과 `dto.ts` 가
 * 프론트가 가진 유일한 계약서다. API 명세서를 손으로 옮긴 것이고, 손으로
 * 유지한다. **명세서가 바뀌면 같은 PR 에서 여기도 고친다.**
 *
 * 역할 나누기
 *  - `dto.ts`  응답 모양. zod 스키마라서 런타임에도 검사된다
 *  - 이 파일   경로 · 쿼리 · 요청 본문. 전부 컴파일 시점에 잡히므로 타입만 있으면 된다
 */

type Json<T> = { content: { "application/json": T } };

/** 연락 설정 (요청). 응답의 Contact 와 달리 비워서 보낼 수 있다 */
type ContactRequest = {
  email_enabled: boolean;
  kakao_enabled: boolean;
  /** `email_enabled` 가 true 면 필수 */
  email?: string | null;
  /** `kakao_enabled` 가 true 면 필수 */
  phone?: string | null;
};

/** 이력서 / 포트폴리오 (요청) */
type AttachmentRequest = {
  kind: "cv" | "portfolio";
  source: "link" | "file";
  /** `source = link` 일 때 필수 */
  url?: string;
  /** `source = file` 일 때 필수. upload-url 에서 받은 key */
  key?: string;
  /** `source = file` 일 때 필수 */
  file_name?: string;
};

export interface paths {
  "/api/v1/user/oauth/login": {
    /** OAuth 로그인. Authorization 불필요 */
    post: {
      requestBody: Json<{
        provider: "google" | "apple" | "naver";
        type: "student" | "graduated";
        /** google / apple: id token, naver: access token */
        token: string;
        /** google / apple 필수 (최대 256자). 로그인 시작 때 만든 nonce 원문 */
        nonce?: string;
      }>;
      responses: {
        200: Json<dto.TokenPair>;
      };
    };
  };

  "/api/v1/user/refresh": {
    /** Access token 갱신. Authorization 불필요. refresh token 도 함께 교체된다 */
    post: {
      requestBody: Json<{ refresh_token: string }>;
      responses: {
        200: Json<dto.TokenPair>;
      };
    };
  };

  "/api/v1/user/info": {
    get: {
      requestBody?: never;
      responses: {
        200: Json<dto.UserInfo>;
      };
    };
  };

  "/api/v1/user/logout": {
    post: {
      requestBody: Json<{ refresh_token: string }>;
      responses: {
        200: Json<dto.OkResult>;
      };
    };
  };

  "/api/v1/user/withdraw": {
    post: {
      requestBody?: never;
      responses: {
        200: Json<dto.OkResult>;
      };
    };
  };

  "/api/v1/user/consent/list": {
    get: {
      requestBody?: never;
      responses: {
        200: Json<dto.ConsentList>;
      };
    };
  };

  "/api/v1/user/consent": {
    post: {
      requestBody: Json<{
        consents: { type: string; version: string; agreed: boolean }[];
      }>;
      responses: {
        200: Json<dto.OkResult>;
      };
    };
  };

  "/api/v1/user/student/verify/send-code": {
    post: {
      requestBody: Json<{ email: string }>;
      responses: {
        200: Json<dto.SendCodeResult>;
      };
    };
  };

  "/api/v1/user/student/verify/code": {
    post: {
      requestBody: Json<{ code: string }>;
      responses: {
        200: Json<dto.OkResult>;
        /** 코드가 틀림. 남은 시도 횟수를 함께 준다 */
        400: Json<{ remaining_attempts: number }>;
      };
    };
  };

  "/api/v1/user/student/departments": {
    get: {
      requestBody?: never;
      responses: {
        200: Json<dto.DepartmentList>;
      };
    };
  };

  "/api/v1/user/student/info": {
    /** 보낸 값으로 정보 전체를 교체한다. 바꾸지 않은 항목도 모두 보낼 것 */
    post: {
      requestBody: Json<{
        /** 내 정보의 name 이 null 일 때만 필수. 한 번 저장하면 수정 불가 */
        name?: string;
        department_id: number;
        /** 1개 이상 */
        interests: string[];
        activities?: string[];
        attachments?: AttachmentRequest[];
        contact: ContactRequest;
      }>;
      responses: {
        /** 이번 호출로 가입이 완료됐을 때만 토큰이 함께 온다 */
        200: Json<dto.SignupResult>;
      };
    };
  };

  "/api/v1/file/upload-url": {
    post: {
      requestBody: Json<{
        purpose: "business_card" | "attachment";
        content_type: string;
        /** byte. 실제로 올릴 파일 크기와 같아야 한다 */
        size: number;
      }>;
      responses: {
        200: Json<dto.UploadUrl>;
      };
    };
  };

  "/api/v1/user/graduated/verify/business-card": {
    post: {
      requestBody: Json<{ key: string }>;
      responses: {
        200: Json<dto.OkResult>;
      };
    };
  };

  "/api/v1/user/graduated/info": {
    post: {
      requestBody: Json<{
        /** 내 정보의 name 이 null 일 때만 필수. 이후 수정 불가 */
        name?: string;
        /** 가입 시 필수, 이후 변경 불가 (최대 32자) */
        nickname?: string;
        company: string;
        /** 비공개 */
        department: string;
        job: string;
        hashtags?: string[];
        links?: string[];
        contact: ContactRequest;
      }>;
      responses: {
        200: Json<dto.SignupResult>;
      };
    };
  };

  "/api/v1/cheers": {
    get: {
      parameters: {
        query?: {
          /** 기본값 "recent_joined" */
          sort?: "recent_joined" | "recent_active" | "random";
          /** 1부터 시작, 기본값 1 */
          page?: number;
          /** 기본값 20, 최대 50 */
          size?: number;
        };
      };
      requestBody?: never;
      responses: {
        200: Json<dto.CheersList>;
      };
    };
  };

  "/api/v1/cheers/request": {
    post: {
      requestBody: Json<{ graduated_id: string; message: string }>;
      responses: {
        200: Json<dto.CheersRequestResult>;
      };
    };
  };

  "/api/v1/cheers/sent": {
    get: {
      parameters: {
        query?: { page?: number; size?: number };
      };
      requestBody?: never;
      responses: {
        200: Json<dto.SentList>;
      };
    };
  };

  "/api/v1/cheers/sent/{id}": {
    /** 연락처 공유 후 처음 호출하면 "확인함" 으로 기록된다 */
    get: {
      parameters: {
        path: { id: string };
      };
      requestBody?: never;
      responses: {
        200: Json<dto.SentRequestDetail>;
      };
    };
  };

  "/api/v1/cheers/received": {
    get: {
      parameters: {
        query?: { page?: number; size?: number };
      };
      requestBody?: never;
      responses: {
        200: Json<dto.ReceivedList>;
      };
    };
  };

  "/api/v1/cheers/received/{id}": {
    /** 처음 호출하면 status 가 requested → viewed 로 바뀐다 (부수효과 있는 GET) */
    get: {
      parameters: {
        path: { id: string };
      };
      requestBody?: never;
      responses: {
        200: Json<dto.ReceivedRequestDetail>;
      };
    };
  };

  "/api/v1/cheers/received/{id}/share-contact": {
    post: {
      parameters: {
        path: { id: string };
      };
      requestBody?: never;
      responses: {
        200: Json<dto.ShareContactResult>;
      };
    };
  };
}
