# Sampaloc IV BMIS UI Tokens

Last verified: 2026-10-11

## Source of Truth

Tokens currently live in `app/globals.css`. Tailwind CSS 4 is configured through `@import "tailwindcss"` and an inline `@theme` block. DaisyUI is enabled with the light theme:

```css
@plugin "daisyui" {
  themes: light --default;
}
```

## Primary Colors

| Token | Value | Usage |
| --- | --- | --- |
| `primary-50` | `#f0fdf4` | Light green surfaces and file controls. |
| `primary-100` | `#dcfce7` | Hover/light accents. |
| `primary-200` | `#bbf7d0` | Subtle borders. |
| `primary-300` | `#86efac` | Light accent. |
| `primary-400` | `#4ade80` | Accent. |
| `primary-500` | `#038a3d` | Focus borders. |
| `primary-600` | `#027032` | Main buttons and active states. |
| `primary-700` | `#025c2a` | Button hover and strong text. |
| `primary-800` | `#014721` | Dark accent. |
| `primary-900` | `#013b1c` | Strong shadow/accent. |

Use as Tailwind classes such as `bg-primary-600`, `text-primary-700`, `border-primary-200`, and `focus:border-primary-500`.

## Neutral Colors

The app frequently uses Tailwind built-in neutral palettes directly:

- `slate-*` for headings, body text, muted text, admin backgrounds, table headers, and empty states.
- `gray-*` for borders and modal dividers.
- `white` for card and modal surfaces.

These are existing patterns, but the project rule says not to introduce new raw Tailwind color classes. Prefer documented tokens or extend `@theme` before creating new palette usage.

## Status Colors

The Clinic Medicines page uses semantic aliases in `app/globals.css` (added 2026-10-18): `surface` / `surface-muted` map to the existing white/slate-50 surfaces; `content` / `content-muted` map to slate-900/slate-600; `outline` maps to slate-200. Stock badge tokens `stock-low-surface`, `stock-low-border`, `stock-low-text` reference the existing amber-50/200/700 palette, and `stock-empty-surface`, `stock-empty-border`, `stock-empty-text` reference rose-50/200/800. Available stock uses existing `primary-*` tokens. Use these token classes rather than introducing raw palette classes.

Existing status classes are repeated in document request components:

| Status | Classes |
| --- | --- |
| `PENDING` | `border-amber-200 bg-amber-50 text-amber-700` |
| `REVIEW` | `border-sky-200 bg-sky-50 text-sky-700` |
| `APPROVED` | `border-emerald-200 bg-emerald-50 text-emerald-700` |
| `GENERATED` | `border-primary-200 bg-primary-50 text-primary-700` |
| Error | `border-red-200 bg-red-50 text-red-700` or `border-rose-200 bg-rose-50 text-rose-800` |
| Success | `border-emerald-200 bg-emerald-50 text-emerald-700` |
| Info | `border-sky-200 bg-sky-50 text-sky-700` |
| Warning | `border-amber-200 bg-amber-50 text-amber-700` |

Proposed improvement: promote these status colors into named CSS theme tokens to satisfy the no-raw-color rule.

## Typography

- Root font: `Geist` through `next/font/google`, exposed as `--font-geist-sans`.
- Mono font: `Geist_Mono`, exposed as `--font-geist-mono`.
- Large page headings commonly use `text-3xl font-bold text-slate-900`.
- Section headings commonly use `text-lg font-semibold` or `text-2xl font-bold`.
- Labels commonly use `text-sm font-medium` or `text-sm font-semibold`.
- Muted helper text commonly uses `text-sm text-slate-600` or `text-xs text-slate-500`.

## Spacing and Layout Utilities

Custom component classes in `app/globals.css`:

| Class | Definition | Usage |
| --- | --- | --- |
| `.max-container` | `max-width: 1440px; margin: 0 auto;` | Landing page content width. |
| `.padding-x` | `padding-left/right: clamp(1rem, 4vw, 2.5rem);` | Responsive horizontal padding. |
| `.padding-y` | `padding-top/bottom: clamp(1.5rem, 4vw, 3rem);` | Responsive vertical padding. |

Page and card spacing patterns:

- Admin/clinic layout content: `p-4 md:p-8`.
- Page headers: usually title, description, then action controls.
- Cards/tables: `p-4`, `p-5`, `p-6`, or responsive `sm:p-6`.

## Border Radii

Existing radii are inconsistent:

- Admin tables and older admin cards use `rounded-lg` and `rounded-xl`.
- Document request and resident self-service pages often use `rounded-2xl`, `rounded-3xl`, or arbitrary `rounded-[24px]` / `rounded-[28px]`.
- Modals often use `rounded-lg` with sticky header/footer sections.

Project-level frontend guidance prefers cards at 8px radius or less unless the design system says otherwise. Existing UI does not fully follow that. New admin-operational surfaces should prefer `rounded-lg` unless matching an established page-local pattern is necessary.

## Shadows

- Cards: `shadow-sm`.
- Login panels: `shadow-lg`.
- Primary buttons sometimes use `shadow-md shadow-primary-600/30`.
- Avoid adding decorative orb or gradient backgrounds.

## Responsive Breakpoints

Tailwind default breakpoints are used: `sm`, `md`, `lg`, and occasionally larger grid behavior. No custom breakpoints are configured.

## Buttons

Common patterns:

- Primary: `bg-primary-600 text-white hover:bg-primary-700`.
- Secondary: `border border-gray-200 text-slate-700 hover:bg-slate-50`.
- Icon-only row actions: compact `p-1.5` or square `h-10 w-10`.
- Disabled: `disabled:cursor-not-allowed disabled:opacity-50` or `disabled:opacity-60`.

Use lucide icons for recognizable commands when possible.

## Forms

Common input pattern:

- `rounded-lg` or `rounded-2xl`
- `border border-gray-200` or `border-slate-200`
- focus state `focus:border-primary-500`, often with `focus:outline-none`
- error text `text-sm text-red-500` or `text-red-600`

Required fields are usually marked by small red asterisks through local `RequiredMark` helpers.

## Tables

Common table shell:

- Outer wrapper: `overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm` or `rounded-[24px] border border-slate-200`.
- Header row: `bg-slate-50`, uppercase labels, `text-xs font-semibold tracking-wide`.
- Rows: `border-b border-gray-100` or `border-t border-slate-100`.
- Search/filter bars use bordered white or slate surfaces.

## Light and Dark Mode

Only DaisyUI light theme is configured. No verified dark mode implementation exists.

## Known Inconsistencies

- `app/(Admin)/admin/page.tsx` defines chart colors as hardcoded hex values.
- Many components use raw Tailwind palette classes such as `slate`, `gray`, `red`, `amber`, `emerald`, `sky`, `teal`, `cyan`, and `purple`.
- Radius scale varies between admin pages and newer resident/document pages.

Do not silently normalize these during unrelated work. Document a design-system cleanup as a separate task.
