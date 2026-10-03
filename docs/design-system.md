# Design system

Everything visual comes from the tokens in `src/app/globals.css` and the components in
`src/components/ui` + `src/components/layout`. Please use these instead of raw colours or
one-off styles, so every screen looks like the same app.

Figma: [Findr – Campus Lost & Found](https://www.figma.com/design/WWjAV9VWC8M6nnOxe1DNn3) —
page **01 Components (UI kit)** has the matching Figma variables ("Findr tokens").

## Tokens (SOF-35)

Tailwind v4 has no `tailwind.config`. Tokens are CSS variables on `:root`, exposed to
Tailwind with `@theme inline`, so they work as normal utility classes.

### Colour

| Use | Classes |
| --- | --- |
| Page / text | `bg-background text-foreground` |
| Cards, sheets, menus | `bg-card text-card-foreground`, `bg-popover` |
| Main action | `bg-primary text-primary-foreground hover:bg-primary-hover` |
| Secondary action / highlight | `bg-secondary text-secondary-foreground` |
| Subtle surfaces, helper text | `bg-muted`, `text-muted-foreground` |
| Borders / form field borders / focus | `border-border`, `border-input`, `ring-ring` |
| Feedback | `success`, `warning`, `danger` (solid) and `*-soft` (tinted bg + `*-soft-foreground`) |
| **LOST / FOUND** | `bg-lost text-lost-foreground`, `bg-found text-found-foreground` |
| **Item status** | `bg-status-open`, `bg-status-claimed`, `bg-status-resolved` (+ `*-foreground`) |
| Decoration only | `brand-pink`, `brand-yellow`, `brand-blue`, `brand-lime` |

LOST/FOUND and statuses should always show their label text too — never colour alone.
Easiest is the `<Badge>` component, which already does this.

### Type

- `font-sans` (DM Sans) for everything; `font-display` (Bricolage Grotesque) for headings
  (`h1`–`h3` get it automatically).
- Scale: `text-display` (hero only), `text-h1`, `text-h2`, `text-h3`, `text-body`,
  `text-small`, `text-caption`. Each sets size, line height and weight together.

### Spacing, radius, shadow

- Spacing is Tailwind's 4px scale (`p-4` = 16px). Page side padding: `px-gutter lg:px-gutter-lg`.
  Max content width: `max-w-page`; single-column forms: `max-w-form`.
- Radius: `rounded-sm` 6, `rounded-md` 10 (inputs, buttons), `rounded-lg` 14, `rounded-xl` 20 (cards, sheets), `rounded-full`.
- Shadows: `shadow-card` (cards), `shadow-pop` (menus, dialogs), `shadow-sticker` (playful accent, sparingly).

### Contrast

`npm run tokens:contrast` checks every text/background pair against WCAG AA (4.5:1 text,
3:1 for field borders and focus rings). Run it after changing any colour.

## Components (SOF-36)

Built on shadcn/ui patterns (Radix primitives + `cva`), themed with the tokens above.
See them all live at **`/dev/ui`** when running `npm run dev`.

| Component | File | Notes |
| --- | --- | --- |
| Button | `ui/button.tsx` | `variant`: primary, secondary, outline, ghost, danger, link · `size`: sm, md, lg, icon · `loading` · `asChild` for links |
| Input, Textarea | `ui/input.tsx`, `ui/textarea.tsx` | 44px tall (touch-friendly), `aria-invalid` turns the border red |
| Field | `ui/field.tsx` | Label + control + hint/error, wires up `aria-describedby`. Wrap every form control in it |
| Select | `ui/select.tsx` | Radix select |
| DatePicker, DateRangePicker | `ui/date-picker.tsx` | `disabledDays={{ after: new Date() }}` for "date lost" |
| Checkbox, Switch | `ui/checkbox.tsx`, `ui/switch.tsx` | Pair with `<Label htmlFor>` |
| Badge | `ui/badge.tsx` | `<ItemTypeBadge type="LOST" />`, `<ItemStatusBadge status="OPEN" />`, plus `success / warning / danger` for claims, KYC, moderation |
| UserAvatar | `ui/avatar.tsx` | Initials fallback, `verified` check |
| Card | `ui/card.tsx` | Shell only — the item card is SOF-27 |
| Dialog | `ui/dialog.tsx` | Bottom sheet on phones, centred from `sm` |
| Sheet | `ui/sheet.tsx` | `side="bottom"` for mobile filters, `"right"` for drawers |
| Tabs | `ui/tabs.tsx` | |
| Toast | `ui/toast.tsx` | `toast.success(...)` / `toast.error(...)`; `<Toaster />` is already in the root layout |
| PhotoPicker | `ui/photo-picker.tsx` | Previews, remove, drag & drop, size/type checks. `maxFiles={1} capture="environment"` for Verify ID. Upload happens on submit (SOF-14) |

### Layout (`src/components/layout`)

- `AppShell` — top nav + mobile bottom nav. Use it in a route-group layout and pass the
  signed-in user (`null` when signed out).
- `PageContainer` — page wrapper with gutters, max width (`width="form"` for forms) and an
  optional title/actions row. Clears the bottom nav on phones.
- `ProtectedPage` — server-side guard: redirects to `/login?callbackUrl=…` when signed out,
  shows "Verify your student ID" when `requireVerified` and not verified, 404s non-admins on
  `requireAdmin`. Real session lookup lands with SOF-40; API routes still check on their own (SOF-46).
- `nav-config.ts` — the nav routes in one place. Change them there if your page lives elsewhere.

Not in this kit (owned by Nurain): item card (SOF-27) and loading / empty / error states (SOF-32).
