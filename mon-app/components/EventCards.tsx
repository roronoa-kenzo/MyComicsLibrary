import Link from "next/link";
import type { Character } from "@/lib/library";

export default function EventCards({
  events,
  publisherId,
}: {
  events: Character[];
  publisherId: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      {events.map((event) => (
        <Link
          key={event.id}
          href={`/${publisherId}/${event.id}`}
          className="group relative block w-full h-44 sm:h-52 rounded-2xl overflow-hidden"
        >
          <img
            src={event.image}
            alt=""
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-zinc-950/20" />
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />

          <div className="relative z-10 flex h-full flex-col justify-end p-6 sm:p-8">
            {event.comics[0]?.year > 0 && (
              <span className="text-zinc-400 text-xs font-medium mb-1">
                {event.comics[0].year}
              </span>
            )}
            <h3 className="text-white text-2xl sm:text-3xl font-black tracking-tight leading-tight group-hover:underline decoration-2 underline-offset-4">
              {event.name}
            </h3>
          </div>
        </Link>
      ))}
    </div>
  );
}
