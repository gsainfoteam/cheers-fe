import catSrc from "@/assets/brand/cat-cheers-3d.png?w=128&format=webp";
import catSrcset from "@/assets/brand/cat-cheers-3d.png?w=64;128&format=webp&as=srcset";
import catShadow from "@/assets/brand/cat-cheers-shadow.svg";
import { cn } from "@/lib/utils";

/**
 * 건배하는 고양이. 피그마 `Cheers / Brand / Cat cheers`(253:464).
 *
 * 3D 렌더 PNG(`popo-cheers-front-2048`) 뒤에 벡터 그림자(`bgShadow`)를 깐
 * 두 겹이다. 흰 고양이가 흰 바탕 위에서도 윤곽이 보이는 건 그림자 덕이다.
 * 컴포넌트 설명에 "임시 브랜드 자산" 이라고 적혀 있지만 이 자산으로 진행하기로
 * 했다(동기화 가이드 D0-4). 자산이 또 바뀌면 이 파일만 고친다.
 *
 * 쓰는 곳: 헤더 로고 마크(32 / 40), 사원증 띠의 인장(카드 폭에 비례), 보낸
 * 신청 내용의 탈퇴한 선배 안내(60). 마이페이지 도장은 05 · 06장 시안에서
 * 없어져 지웠다.
 *
 * ## 비율
 *
 * 프레임이 340×290 이고 PNG(1024×1024 정사각)를 **그 틀에 늘려 채운다**
 * (`object-fit` 없음). 시안이 그렇게 그려서 고양이가 가로로 조금 넓다.
 * 바깥 상자는 `aspect-[340/290]` 이라 호출부는 폭만 정하면 된다.
 *
 * ## 이미지 크기
 *
 * 원본 1024px PNG(320KB)를 그대로 내보내지 않는다. 가장 크게 쓰이는 자리가
 * 데스크톱 사원증 인장(약 54px)이라 64w / 128w WebP 두 장이면 2배 화면까지
 * 덮는다(렌더링 성능 가이드 §3.1). 호출부가 `sizes` 로 표시 폭을 알려 준다.
 *
 * 꾸밈 그림이라 보조기술에서 숨긴다. 이름이 필요한 자리(로고 링크)는
 * 옆의 `취얼스` 글자가 이름이 된다.
 */
export function BrandCat({
  sizes,
  className,
  style,
}: {
  /** `<img sizes>`. 예: `"(min-width: 1024px) 40px, 32px"` */
  sizes: string;
  /** 폭과 위치. 높이는 비율로 따라온다 */
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      aria-hidden
      className={cn("pointer-events-none relative block aspect-[340/290]", className)}
      style={style}
    >
      {/* 피그마 `Vector 2`(911:33772) — 334.5×255.2, 가운데. 필터 여백만큼 바깥으로 나간다 */}
      <span className="absolute top-1/2 left-1/2 h-[87.99%] w-[98.38%] -translate-x-1/2 -translate-y-1/2">
        <span className="absolute" style={{ inset: "-6.66% -6.88% -9.01% -5.08%" }}>
          <img src={catShadow} alt="" className="block size-full max-w-none" />
        </span>
      </span>
      {/* 피그마 `popo-cheers-front-2048 1`(911:33601) — 339.4×290, 가운데 */}
      <img
        src={catSrc}
        srcSet={catSrcset}
        sizes={sizes}
        alt=""
        decoding="async"
        className="absolute top-1/2 left-1/2 h-full w-[99.83%] max-w-none -translate-x-1/2 -translate-y-1/2"
      />
    </span>
  );
}
