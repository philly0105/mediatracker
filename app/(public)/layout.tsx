// No Supabase call and no sidebar: these routes have no session by definition.
// Keeping them out of the authenticated shell is what lets them render without
// a per-request auth round-trip.
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-10 min-h-screen flex flex-col">
      <main className="flex-1 w-full px-4 py-6 pb-8 md:px-8 md:py-8">
        <div className="mx-auto w-full max-w-[var(--content-max)]">
          {children}
        </div>
      </main>
    </div>
  )
}
