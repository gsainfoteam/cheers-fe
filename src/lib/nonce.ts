/**
 * OAuth nonce.
 *
 * 원문과 SHA-256 해시를 한 쌍으로 만든다. 해시는 구글에, **원문은 우리
 * 백엔드에** 보낸다. 백엔드가 "원문을 해시한 값 == id_token 의 nonce 클레임"
 * 을 확인하므로, id_token 이 탈취돼도 원문을 모르면 다른 곳에서 재사용할 수
 * 없다.
 *
 * GIS 는 리다이렉트가 없어서 원문이 페이지 이동을 넘길 일이 없다. 명세서가
 * 말하는 sessionStorage 보관이 필요 없는 이유다 — 메모리에만 두고 콜백에서
 * 그대로 쓴다.
 */

export type Nonce = {
  /** 백엔드로 보낼 값 */
  raw: string;
  /** 구글로 보낼 값 (raw 의 SHA-256, 소문자 hex) */
  hashed: string;
};

export async function createNonce(): Promise<Nonce> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const raw = toHex(bytes);
  return { raw, hashed: await sha256Hex(raw) };
}

async function sha256Hex(value: string): Promise<string> {
  // crypto.subtle 은 보안 컨텍스트에서만 동작한다. localhost 는 포함되므로
  // 개발 중에도 문제없다
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );
  return toHex(new Uint8Array(digest));
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}
