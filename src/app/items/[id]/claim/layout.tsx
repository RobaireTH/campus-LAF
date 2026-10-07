import { ProtectedPage } from "@/components/layout/protected-page";
import { getShellUser } from "@/lib/session";

export default async function ClaimLayout({ children, params }: LayoutProps<"/items/[id]/claim">) {
  const { id } = await params;
  return (
    <ProtectedPage
      user={await getShellUser()}
      callbackUrl={`/items/${id}/claim`}
      requireVerified
      verifyReason="You need a verified student ID before you can submit a claim."
    >
      {children}
    </ProtectedPage>
  );
}
