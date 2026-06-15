import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center px-6 py-4 bg-zinc-950/80 backdrop-blur-md border-b border-white/5">
      <Link href="/" className="flex items-center gap-2.5 group" aria-label="The Comic Book Day">
        <img src="/icon.svg" alt="" className="h-8 w-auto invert" />
        <img src="/logo.svg" alt="The Comic Book Day" className="h-4 w-auto" />
        <span className="sr-only">The Comic Book Day</span>
      </Link>
    </nav>
  );
}
