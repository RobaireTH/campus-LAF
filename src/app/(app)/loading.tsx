// TODO(SOF-32): swap for Nurain's shared skeletons once they land.
export default function BrowseLoading() {
  return (
    <main className="mx-auto w-full max-w-page flex-1 px-gutter pt-6 lg:px-gutter-lg lg:pt-10" aria-busy="true" aria-label="Loading items">
      <div className="mb-6 h-9 w-2/3 max-w-md animate-pulse rounded-md bg-muted" />
      <div className="h-12 w-full animate-pulse rounded-lg bg-muted" />
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-xl border bg-card">
            <div className="aspect-[4/3] animate-pulse bg-muted" />
            <div className="flex flex-col gap-2 p-3.5">
              <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
