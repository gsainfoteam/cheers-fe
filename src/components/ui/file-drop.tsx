import { useState } from "react";
import { action } from "./action";
import { cn } from "@/lib/utils";

/**
 * 파일 끌어다 놓기. 선배 명함 첨부(`onboarding/mentor/verify.tsx`)와 학생
 * 이력서·포트폴리오 첨부(`StudentAttachmentsField`)가 같이 쓴다(동기화 가이드
 * 02장 2.6.2).
 *
 * 끌어다 놓기는 **폭과 무관하게** 받는다. 모바일 시안에 끌어다 놓기 문구가
 * 없는 건 손가락으로 끌 일이 없어서지 기능을 막으라는 뜻이 아니다(태블릿 +
 * 마우스).
 *
 * 돌려준 `dropProps` 를 받을 상자에 펼치고, `dragging` 으로 드래그 중 모양을
 * 낸다(두 화면 모두 `bg-subtle` + 실선 `focus`).
 */
export function useFileDrop(onFiles: (files: File[]) => void, disabled = false) {
  const [dragging, setDragging] = useState(false);

  const dropProps = {
    onDragEnter: (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setDragging(true);
    },
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = disabled ? "none" : "copy";
    },
    onDragLeave: (e: React.DragEvent) => {
      // 상자 안의 자식으로 옮겨 갈 때도 leave 가 온다. 상자 밖으로 나갈 때만 끈다
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
        setDragging(false);
      }
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (!disabled) onFiles(Array.from(e.dataTransfer.files));
    },
  };

  return { dragging, dropProps };
}

/**
 * 파일 고르기 버튼. 피그마 `Action / uploaded`(명함) · `Action / 파일 선택`
 * (학생 첨부). Secondary 와 같은 껍데기지만 글자가 Label/Medium(14)이 아니라
 * Web/Button(16)이고 아이콘(24)이 붙는다.
 */
export function FilePickButton({
  icon,
  className,
  children,
  ...button
}: { icon: string } & React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(action({ variant: "secondary" }), className)}
      {...button}
    >
      <img src={icon} alt="" width={24} height={24} />
      {children}
    </button>
  );
}
