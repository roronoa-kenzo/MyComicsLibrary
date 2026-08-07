import Image from "next/image";
import { isSupabaseCover } from "@/lib/cover-image";

interface Props {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
}

export default function ComicCover({
  src,
  alt,
  width,
  height,
  className,
  sizes,
  priority = false,
}: Props) {
  if (isSupabaseCover(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        sizes={sizes ?? `${width}px`}
        priority={priority}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- hotlinked covers (Pinterest, etc.)
    <img src={src} alt={alt} className={className} loading="lazy" />
  );
}
