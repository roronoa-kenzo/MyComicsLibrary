import Link from "next/link";
import { getAllPublishers } from "@/lib/library";

export default function Navbar() {
  const publishers = getAllPublishers();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-zinc-950/80 backdrop-blur-md border-b border-white/5">
      <Link href="/" className="flex items-center gap-2.5 group" aria-label="The Comic Book Day">
        <img src="/icon.svg" alt="" className="h-8 w-auto invert" />
        <img src="/logo.svg" alt="The Comic Book Day" className="h-4 w-auto" />
        <span className="sr-only">The Comic Book Day</span>
      </Link>

      <div className="flex items-center gap-6">
        {publishers.map((publisher) => (
          <Link
            key={publisher.id}
            href={`/${publisher.id}`}
            className="text-zinc-400 hover:text-white text-sm font-medium transition-colors"
          >
            {publisher.id === "dc" ? "DC" : publisher.name}
          </Link>
        ))}
      </div>
    </nav>
  );
}
