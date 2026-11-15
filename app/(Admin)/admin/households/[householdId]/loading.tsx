export default function HouseholdDetailsLoading() {
  return <main aria-label="Loading household details" className="mx-auto max-w-6xl animate-pulse space-y-6 p-6">
    <div className="h-4 w-64 rounded bg-surface-muted" />
    <div className="h-8 w-72 rounded bg-surface-muted" />
    <section className="space-y-3 rounded-lg border border-outline p-6"><div className="h-5 w-52 rounded bg-surface-muted"/><div className="h-4 w-full max-w-xl rounded bg-surface-muted"/><div className="h-4 w-40 rounded bg-surface-muted"/></section>
    <section className="space-y-3 rounded-lg border border-outline p-6"><div className="h-5 w-48 rounded bg-surface-muted"/>{[1,2,3].map(row=><div key={row} className="h-12 rounded bg-surface-muted"/>)}</section>
  </main>;
}
