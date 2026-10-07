import { ProtectedPage } from "@/components/layout/protected-page";
import { getShellUser } from "@/lib/session";

export default async function ReviewClaimsLayout({ children, params }: LayoutProps<"/items/[id]/claims">) {
  const { id } = await params;
  return (
    <ProtectedPage user={await getShellUser()} callbackUrl={`/items/${id}/claims`}>
      {children}
    </ProtectedPage>
  );
}
