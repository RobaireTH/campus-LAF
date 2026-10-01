"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { Search, SlidersHorizontal, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateRangePicker, type DateRange } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { Option } from "@/lib/items/types";

/*
 * Browse filters. All state lives in the URL query (?q=&type=&category=&location=&from=&to=&sort=)
 * so results are shareable and survive refresh. Changing a filter replaces the URL; the
 * server page re-renders with the new results while the old ones dim.
 */

const FILTER_KEYS = ["type", "category", "location", "from", "to", "sort"] as const;
const ANY = "__any";

type Updates = Record<string, string | undefined>;

interface BrowseState {
  pending: boolean;
  get: (key: string) => string | undefined;
  set: (updates: Updates) => void;
  clear: () => void;
  activeCount: number;
}

const BrowseContext = React.createContext<BrowseState | null>(null);

function useBrowse() {
  const ctx = React.useContext(BrowseContext);
  if (!ctx) throw new Error("useBrowse must be used inside <BrowseProvider>");
  return ctx;
}

export function BrowseProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = React.useTransition();

  const value = React.useMemo<BrowseState>(() => {
    const navigate = (next: URLSearchParams) => {
      const qs = next.toString();
      startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
    };
    return {
      pending,
      get: (k) => params.get(k) ?? undefined,
      set: (updates) => {
        const next = new URLSearchParams(params.toString());
        for (const [k, v] of Object.entries(updates)) {
          if (v) next.set(k, v);
          else next.delete(k);
        }
        navigate(next);
      },
      clear: () => {
        const next = new URLSearchParams();
        const q = params.get("q");
        if (q) next.set("q", q);
        navigate(next);
      },
      activeCount: FILTER_KEYS.filter((k) => k !== "type" && k !== "to" && params.get(k)).length,
    };
  }, [params, pathname, pending, router]);

  return <BrowseContext.Provider value={value}>{children}</BrowseContext.Provider>;
}

/** Dims results while new ones load. */
export function BrowsePending({ children }: { children: React.ReactNode }) {
  const { pending } = useBrowse();
  return (
    <div aria-busy={pending} className={cn("transition-opacity", pending && "pointer-events-none opacity-50")}>
      {children}
    </div>
  );
}

export function SearchBar() {
  const { get, set } = useBrowse();
  const current = get("q") ?? "";
  const [q, setQ] = React.useState(current);
  // Keep the box in sync when the URL changes (back button, clear).
  const [synced, setSynced] = React.useState(current);
  if (synced !== current) {
    setSynced(current);
    setQ(current);
  }

  return (
    <form
      role="search"
      className="relative flex-1"
      onSubmit={(e) => {
        e.preventDefault();
        set({ q: q.trim() || undefined });
      }}
    >
      <Label htmlFor="browse-q" className="sr-only">
        Search lost and found items
      </Label>
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        id="browse-q"
        type="search"
        enterKeyHint="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search e.g. “black backpack” or “student ID”"
        className="h-12 rounded-lg pr-24 pl-11 text-body [&::-webkit-search-cancel-button]:hidden"
      />
      <div className="absolute top-1/2 right-1.5 flex -translate-y-1/2 items-center gap-1">
        {q && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              set({ q: undefined });
            }}
            aria-label="Clear search"
            className="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
        <Button type="submit" size="sm" className="hidden sm:inline-flex">
          Search
        </Button>
      </div>
    </form>
  );
}

export function TypeToggle({ className }: { className?: string }) {
  const { get, set } = useBrowse();
  const current = get("type")?.toUpperCase() ?? "ALL";
  const opts = [
    { v: "ALL", label: "All" },
    { v: "LOST", label: "Lost" },
    { v: "FOUND", label: "Found" },
  ];
  return (
    <div role="group" aria-label="Show lost or found items" className={cn("inline-flex rounded-lg bg-muted p-1", className)}>
      {opts.map((o) => (
        <button
          key={o.v}
          type="button"
          aria-pressed={current === o.v}
          onClick={() => set({ type: o.v === "ALL" ? undefined : o.v.toLowerCase() })}
          className="h-9 flex-1 rounded-md px-4 text-small font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40 aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-card"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function OptionSelect({ id, label, param, options, placeholder }: { id: string; label: string; param: string; options: Option[]; placeholder: string }) {
  const { get, set } = useBrowse();
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={get(param) ?? ANY} onValueChange={(v) => set({ [param]: v === ANY ? undefined : v })}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>{placeholder}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function DateFilter({ id }: { id: string }) {
  const { get, set } = useBrowse();
  const from = get("from");
  const to = get("to");
  const value: DateRange | undefined = from ? { from: parseISO(from), to: to ? parseISO(to) : undefined } : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>Date lost / found</Label>
      <DateRangePicker
        id={id}
        value={value}
        disabledDays={{ after: new Date() }}
        onChange={(r) =>
          set({
            from: r?.from ? format(r.from, "yyyy-MM-dd") : undefined,
            to: r?.to ? format(r.to, "yyyy-MM-dd") : undefined,
          })
        }
      />
    </div>
  );
}

function SortSelect({ id }: { id: string }) {
  const { get, set } = useBrowse();
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>Sort</Label>
      <Select value={get("sort") ?? "newest"} onValueChange={(v) => set({ sort: v === "newest" ? undefined : v })}>
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest first</SelectItem>
          <SelectItem value="oldest">Oldest first</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export interface FilterOptions {
  categories: Option[];
  locations: Option[];
}

function FilterFields({ categories, locations, idPrefix }: FilterOptions & { idPrefix: string }) {
  return (
    <>
      <OptionSelect id={`${idPrefix}-category`} label="Category" param="category" options={categories} placeholder="All categories" />
      <OptionSelect id={`${idPrefix}-location`} label="Campus location" param="location" options={locations} placeholder="Anywhere on campus" />
      <DateFilter id={`${idPrefix}-date`} />
      <SortSelect id={`${idPrefix}-sort`} />
    </>
  );
}

/** Desktop sidebar (md and up). */
export function FilterSidebar(props: FilterOptions) {
  const { activeCount, clear } = useBrowse();
  return (
    <aside aria-label="Filters" className="hidden w-64 shrink-0 flex-col gap-5 md:flex">
      <div className="flex items-center justify-between">
        <h2 className="font-sans text-body font-semibold">Filters</h2>
        {activeCount > 0 && (
          <Button variant="link" size="sm" onClick={clear}>
            Clear filters
          </Button>
        )}
      </div>
      <FilterFields {...props} idPrefix="side" />
    </aside>
  );
}

/** Phone: filters in a bottom sheet. */
export function FilterSheetButton({ total, ...props }: FilterOptions & { total: number }) {
  const { activeCount, clear, pending } = useBrowse();
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="md:hidden">
          <SlidersHorizontal /> Filters
          {activeCount > 0 && <Badge variant="primary" className="px-1.5">{activeCount}</Badge>}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>Changes apply straight away.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4">
          <FilterFields {...props} idPrefix="sheet" />
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={clear} disabled={activeCount === 0} className="flex-1">
            Clear
          </Button>
          <SheetTrigger asChild>
            <Button className="flex-[2]" loading={pending}>
              Show {total} {total === 1 ? "item" : "items"}
            </Button>
          </SheetTrigger>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/** Removable chips for each active filter, plus "Clear filters". */
export function ActiveFilters({ categories, locations }: FilterOptions) {
  const { get, set, clear, activeCount } = useBrowse();
  const chips: { key: string; label: string; remove: Updates }[] = [];
  const cat = get("category");
  const loc = get("location");
  const from = get("from");
  const to = get("to");
  if (cat) chips.push({ key: "category", label: categories.find((c) => c.value === cat)?.label ?? cat, remove: { category: undefined } });
  if (loc) chips.push({ key: "location", label: locations.find((l) => l.value === loc)?.label ?? loc, remove: { location: undefined } });
  if (from)
    chips.push({
      key: "date",
      label: to ? `${format(parseISO(from), "d MMM")} – ${format(parseISO(to), "d MMM")}` : `From ${format(parseISO(from), "d MMM")}`,
      remove: { from: undefined, to: undefined },
    });
  if (get("sort") === "oldest") chips.push({ key: "sort", label: "Oldest first", remove: { sort: undefined } });
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => set(c.remove)}
          className="inline-flex h-8 items-center gap-1 rounded-full border bg-card pr-2 pl-3 text-small hover:bg-muted"
          aria-label={`Remove filter: ${c.label}`}
        >
          {c.label} <X className="size-3.5" aria-hidden />
        </button>
      ))}
      {activeCount > 1 && (
        <Button variant="link" size="sm" onClick={clear}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
