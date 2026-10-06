import type { Metadata, Viewport } from "next";

import "./globals.css";
import { Toaster } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "Campus Lost & Found",
  description: "Find and return lost items across campus.",
};

export const viewport: Viewport = {
  themeColor: "#fffbf2",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
