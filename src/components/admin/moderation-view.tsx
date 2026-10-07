import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { PostsPanel } from "./posts-panel";
import { ReportQueue } from "./report-queue";
import type { AdminPostsPage, ReportEntry, VerificationEntry } from "./types";
import { VerificationQueue } from "./verification-queue";

export const MODERATION_TABS = ["verification", "reports", "posts"] as const;

export type ModerationTab = (typeof MODERATION_TABS)[number];

interface ModerationViewProps {
  verifications: VerificationEntry[];
  reports: ReportEntry[];
  posts: AdminPostsPage;
  tab?: ModerationTab;
}

export function ModerationView({ verifications, reports, posts, tab }: ModerationViewProps) {
  const waiting = verifications.length === 0 && reports.length > 0 ? "reports" : "verification";

  return (
    <Tabs defaultValue={tab ?? waiting}>
      <TabsList>
        <TabsTrigger value="verification">
          ID reviews <Badge>{verifications.length}</Badge>
        </TabsTrigger>
        <TabsTrigger value="reports">
          Reports <Badge>{reports.length}</Badge>
        </TabsTrigger>
        <TabsTrigger value="posts">Posts</TabsTrigger>
      </TabsList>
      <TabsContent value="verification">
        <VerificationQueue entries={verifications} />
      </TabsContent>
      <TabsContent value="reports">
        <ReportQueue entries={reports} />
      </TabsContent>
      <TabsContent value="posts">
        <PostsPanel initial={posts} />
      </TabsContent>
    </Tabs>
  );
}
