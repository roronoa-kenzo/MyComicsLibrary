export default function MaintenanceScreen() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-zinc-950 px-6 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle at 30% 20%, #0476D0 0%, transparent 50%), radial-gradient(circle at 70% 80%, #E23636 0%, transparent 45%)",
        }}
      />

      <div className="relative z-10 flex max-w-lg flex-col items-center gap-8">
        <div className="flex items-center gap-2.5">
          <img src="/icon.svg" alt="" className="h-10 w-auto invert sm:h-12" />
          <img
            src="/logo.svg"
            alt="The Comic Book Day"
            className="h-5 w-auto sm:h-6"
          />
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            Site en maintenance
          </h1>
          <p className="text-base leading-relaxed text-zinc-400">
            Suite à des incidents sur le site, nous effectuons des corrections.
            The Comic Book Day reviendra très bientôt — merci de votre patience.
          </p>
        </div>

        <div className="h-1 w-24 overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-yellow-400" />
        </div>
      </div>
    </main>
  );
}
