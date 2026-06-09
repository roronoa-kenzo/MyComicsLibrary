import type { Period } from "@/lib/library";

export default function PeriodBadge({ period }: { period: Period }) {
  return (
    <span
      className="inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
      style={{
        backgroundColor: `${period.color}22`,
        color: period.color,
      }}
    >
      {period.name}
    </span>
  );
}
