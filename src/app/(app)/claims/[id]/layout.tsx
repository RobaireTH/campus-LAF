import { ProtectedPage } from "@/components/layout/protected-page";
import { getShellUser } from "@/lib/session";

export default async function HandoverLayout({ children, params }: LayoutProps<"/claims/[id]">) {
  const { id } = await params;
  return (
    <ProtectedPage user={await getShellUser()} callbackUrl={`/claims/${id}`}>
      {children}
    </ProtectedPage>
  );
}
