import { PageContainer } from "@/components/layout/page-container";
import { parseSearchParams, searchItems } from "@/lib/items/api";
import { categories, locations } from "@/lib/items/mock-data";
import {
  ActiveFilters,
  BrowsePending,
  BrowseProvider,
  FilterSheetButton,
  FilterSidebar,
  SearchBar,
  TypeToggle,
} from "./browse-filters";
import { BrowseResults } from "./browse-results";

export const metadata = { title: "Browse lost & found · Campus Lost & Found" };

/** Browse / Search (SOF-37). Filters come from the URL query. */
export default async function BrowsePage({ searchParams }: PageProps<"/">) {
  const params = parseSearchParams(await searchParams);
  const result = await searchItems(params);
  const hasFilters = Boolean(params.q || params.type || params.category || params.location || params.from);
  // TODO(SOF-9/SOF-19): categories + locations from the API instead of mock data.
  const options = { categories, locations };

  return (
    <PageContainer
      title="Lost something? Found something?"
      description="Search everything handed in or reported on campus."
    >
      <BrowseProvider>
        <div className="flex flex-col gap-3">
          <SearchBar />
          <div className="flex items-center gap-2">
            <TypeToggle className="flex-1 sm:flex-none" />
            <FilterSheetButton {...options} total={result.total} />
          </div>
        </div>

        <div className="mt-6 flex gap-8">
          <FilterSidebar {...options} />
          <section aria-labelledby="results-heading" className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="flex flex-col gap-3">
              <h2 id="results-heading" className="font-sans text-small font-medium text-muted-foreground" aria-live="polite">
                {result.total} {result.total === 1 ? "item" : "items"}
                {params.q ? ` for “${params.q}”` : ""}
              </h2>
              <ActiveFilters {...options} />
            </div>
            <BrowsePending>
              <BrowseResults
                key={JSON.stringify(params)}
                params={params}
                initialItems={result.items}
                initialCursor={result.nextCursor}
                hasFilters={hasFilters}
              />
            </BrowsePending>
          </section>
        </div>
      </BrowseProvider>
    </PageContainer>
  );
}
