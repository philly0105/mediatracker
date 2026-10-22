// No Supabase call and no sidebar: these routes have no session by definition.
// Keeping them out of the authenticated shell is what lets them render without
// a per-request auth round-trip.
//
// The frame is the signed-in shell's: --shell-pad all round from md, so a
// share page's grid lines up with the library's, and 16/24 on phones.
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-10 flex min-h-screen flex-col">
      <main className="w-full flex-1 px-4 py-6 md:p-[var(--shell-pad)]">
        <div className="mx-auto w-full max-w-[var(--content-max)]">
          {children}
        </div>
      </main>
    </div>
  )
}
