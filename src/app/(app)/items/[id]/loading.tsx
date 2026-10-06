// TODO(SOF-32): swap for Nurain's item-details skeleton once it lands.
export default function ItemLoading() {
  return (
    <main className="mx-auto w-full max-w-page flex-1 px-gutter pt-6 lg:px-gutter-lg" aria-busy="true" aria-label="Loading item">
      <div className="mb-4 h-5 w-32 animate-pulse rounded bg-muted" />
      <div className="grid gap-6 lg:grid-cols-[7fr_5fr] lg:gap-10">
        <div className="aspect-[4/3] animate-pulse rounded-xl bg-muted" />
        <div className="flex flex-col gap-4">
          <div className="h-6 w-32 animate-pulse rounded-full bg-muted" />
          <div className="h-10 w-4/5 animate-pulse rounded-md bg-muted" />
          <div className="h-40 animate-pulse rounded-xl bg-muted" />
          <div className="h-12 animate-pulse rounded-md bg-muted" />
        </div>
      </div>
    </main>
  );
}
