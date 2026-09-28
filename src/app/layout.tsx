import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Campus Lost & Found",
  description: "Report, find and claim lost items on campus.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
