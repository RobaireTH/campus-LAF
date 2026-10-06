<<<<<<< HEAD
import { DM_Sans, Bricolage_Grotesque } from 'next/font/google';
import './globals.css';
=======
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toast";
>>>>>>> origin/main

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

<<<<<<< HEAD
const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  display: 'swap',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${dmSans.variable} ${bricolage.variable}`}>
      <body className="font-sans antialiased bg-[#FDFCF7] text-gray-900">
        {children}
=======
export const viewport: Viewport = {
  themeColor: "#fffbf2",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
>>>>>>> origin/main
      </body>
    </html>
  );
}