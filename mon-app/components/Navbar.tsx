import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-zinc-950/80 backdrop-blur-md border-b border-white/5">
      <Link href="/" className="flex items-center gap-2 group">
        <div className="w-8 h-8 rounded bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
          <span className="text-black font-black text-xs">KL</span>
        </div>
        <span className="text-white font-bold tracking-wide text-sm group-hover:text-yellow-400 transition-colors">
          KenzoLibrary
        </span>
      </Link>

      <div className="flex items-center gap-6">
        <Link
          href="/dc"
          className="text-zinc-400 hover:text-blue-400 text-sm font-medium transition-colors"
        >
          DC
        </Link>
        <Link
          href="/marvel"
          className="text-zinc-400 hover:text-red-400 text-sm font-medium transition-colors"
        >
          Marvel
        </Link>
      </div>
    </nav>
  );
}
