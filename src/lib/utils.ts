import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge needs to know our custom tokens from globals.css, otherwise it treats
 * `text-body` as a colour and drops `text-primary-foreground` (and similar for shadows).
 * Add new size/shadow tokens here when you add them to @theme.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["display", "h1", "h2", "h3", "body", "small", "caption"] }],
      shadow: [{ shadow: ["card", "pop", "sticker"] }],
    },
  },
});

/** Merge Tailwind classes, letting later classes win (`cn("p-2", isBig && "p-4")`). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
