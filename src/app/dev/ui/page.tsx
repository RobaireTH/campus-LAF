import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { PageContainer } from "@/components/layout/page-container";
import { Showcase } from "./showcase";

export const metadata = { title: "UI kit · Campus Lost & Found" };

/** Living reference for the shared components. Hidden in production builds. */
export default function UiKitPage() {
  if (process.env.NODE_ENV === "production" && process.env.SHOW_DEV_PAGES !== "true") notFound();
  return (
    <AppShell user={{ name: "Ada Obi", verified: true, role: "ADMIN" }}>
      <PageContainer
        title="UI kit"
        description="Every shared component in src/components/ui and src/components/layout, with the tokens from globals.css."
      >
        <Showcase />
      </PageContainer>
    </AppShell>
  );
}
