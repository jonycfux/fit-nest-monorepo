import { tv } from "tailwind-variants";

// The "PanelWindow" chrome-bar container used to wrap every content section
// (Attributes, Note, Backup exercises, Continue, Details, …). Slots because the
// header (gradient bar + cyan underline) and body are visually distinct regions
// every consumer needs, not just a single class string.
export const panelWindowVariants = tv({
  slots: {
    base: "overflow-hidden rounded-lg border border-default bg-surface-card",
    header:
      "flex items-center justify-between border-b-2 border-chrome-underline bg-chrome px-4 py-2.5",
    title: "font-condensed text-caption font-semibold uppercase tracking-wide text-heading",
    meta: "font-condensed text-caption uppercase tracking-wide text-muted",
    body: "p-4",
  },
});
