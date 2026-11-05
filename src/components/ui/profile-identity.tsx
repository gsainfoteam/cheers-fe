/**
 * 프로필 머리. 피그마 `Cheers / Profile identity`(410:5945).
 *
 * 시안 설명: *"Prominent existing name or nickname at the top of a profile
 * document. Uses the same Label and Value text properties as Profile row."* —
 * `ProfileRow` 와 같은 축에서 이름만 크게 세운다. 작은 라벨(Label/Small) +
 * 큰 값(Task/Person 28/40), 아래 구분선.
 *
 * 마이페이지 · 선배가 첫 사용처, 마이페이지 · 학생이 두 번째가 될 것이다.
 * `<dl>` 안에서 쓴다.
 */
export function ProfileIdentity({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border-line flex flex-col gap-1 border-b pt-3 pb-6">
      <dt className="text-label-sm text-ink-soft">{label}</dt>
      <dd className="text-task-person text-ink break-words">{value}</dd>
    </div>
  );
}
