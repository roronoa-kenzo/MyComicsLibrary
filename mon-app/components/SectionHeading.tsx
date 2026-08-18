interface Props {
  eyebrow: string;
  title: string;
  meta?: string;
  accentColor: string;
}

export default function SectionHeading({ eyebrow, title, meta, accentColor }: Props) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-white/10 pb-5 lg:mb-12">
      <div>
        <span
          className="mb-3 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em]"
          style={{ color: accentColor }}
        >
          <span className="h-px w-8" style={{ backgroundColor: accentColor }} />
          {eyebrow}
        </span>
        <h2 className="text-4xl font-black uppercase leading-[0.85] tracking-tighter text-white sm:text-5xl lg:text-7xl">
          {title}
        </h2>
      </div>

      {meta && (
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
          {meta}
        </p>
      )}
    </div>
  );
}
