import { format, formatDistanceToNowStrict, isToday, isYesterday } from "date-fns";

/** "just now", "5 min ago", "2 hours ago", "3 days ago" */
export function timeAgo(iso: string) {
  const d = new Date(iso);
  if (Date.now() - d.getTime() < 60_000) return "just now";
  return `${formatDistanceToNowStrict(d).replace(/minutes?/, "min")} ago`;
}

/** "Today", "Yesterday" or "Thu, 1 Oct 2026" */
export function friendlyDate(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEE, d MMM yyyy");
}
