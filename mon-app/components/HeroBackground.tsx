import Image from "next/image";
import { isSupabaseCover } from "@/lib/cover-image";

interface Props {
  src: string;
  alt: string;
}

export default function HeroBackground({ src, alt }: Props) {
  if (!isSupabaseCover(src)) {
    return (
      <div
        className="absolute inset-0 bg-cover bg-center scale-110"
        style={{ backgroundImage: `url(${src})` }}
        aria-hidden
      />
    );
  }

  return (
    <div className="relative h-full w-full">
      <Image
        src={src}
        alt={alt}
        fill
        priority
        sizes="100vw"
        className="object-cover scale-110 blur-sm"
        aria-hidden
      />
    </div>
  );
}
