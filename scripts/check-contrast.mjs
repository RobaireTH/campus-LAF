// Checks every text/background token pair in src/app/globals.css against WCAG AA.
// Usage: npm run tokens:contrast
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const root = css.match(/:root\s*{([\s\S]*?)}/)[1];
const tokens = Object.fromEntries(
  [...root.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]),
);

const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// [text, background, minimum] — 4.5 for text, 3 for UI boundaries (WCAG 1.4.11)
const pairs = [
  ["foreground", "background", 4.5],
  ["card-foreground", "card", 4.5],
  ["muted-foreground", "background", 4.5],
  ["muted-foreground", "muted", 4.5],
  ["muted-foreground", "card", 4.5],
  ["primary-foreground", "primary", 4.5],
  ["primary-foreground", "primary-hover", 4.5],
  ["primary", "background", 4.5],
  ["secondary-foreground", "secondary", 4.5],
  ["accent-foreground", "accent", 4.5],
  ["success-foreground", "success", 4.5],
  ["success-soft-foreground", "success-soft", 4.5],
  ["warning-foreground", "warning", 4.5],
  ["warning-soft-foreground", "warning-soft", 4.5],
  ["danger-foreground", "danger", 4.5],
  ["danger-soft-foreground", "danger-soft", 4.5],
  ["danger", "card", 4.5],
  ["lost-foreground", "lost", 4.5],
  ["found-foreground", "found", 4.5],
  ["status-open-foreground", "status-open", 4.5],
  ["status-claimed-foreground", "status-claimed", 4.5],
  ["status-resolved-foreground", "status-resolved", 4.5],
  ["input", "background", 3],
  ["input", "card", 3],
  ["ring", "background", 3],
];

let failed = 0;
for (const [fg, bg, min] of pairs) {
  if (!tokens[fg] || !tokens[bg]) {
    console.error(`missing token: ${!tokens[fg] ? fg : bg}`);
    failed++;
    continue;
  }
  const r = ratio(tokens[fg], tokens[bg]);
  const ok = r >= min;
  if (!ok) failed++;
  console.log(`${ok ? "pass" : "FAIL"}  ${r.toFixed(2).padStart(5)}:1  (min ${min})  ${fg} on ${bg}`);
}
if (failed) {
  console.error(`\n${failed} pair(s) below WCAG AA`);
  process.exit(1);
}
console.log("\nAll pairs meet WCAG AA.");
