"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";

type Props = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
};

export default function ComicLink({ href, ...props }: Props) {
  const pathname = usePathname();
  const separator = href.includes("?") ? "&" : "?";
  const url = `${href}${separator}from=${encodeURIComponent(pathname)}`;

  return <Link href={url} {...props} />;
}
