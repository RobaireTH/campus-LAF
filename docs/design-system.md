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
