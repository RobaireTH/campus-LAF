import Link from "next/link";
import Image from "next/image";

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[minmax(20rem,0.8fr)_minmax(32rem,1.2fr)]">
      <section className="relative hidden min-h-screen overflow-hidden bg-foreground text-white lg:block">
        <Image src="/brand/auth-campus.png" alt="Students returning a lost backpack on campus" fill priority sizes="40vw" className="object-cover" />
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative flex min-h-screen flex-col justify-between p-10 xl:p-14">
          <Link href="/" className="inline-flex w-fit items-center gap-2 font-display text-h3 drop-shadow-md">
            <Image src="/brand/findr-mark.png" alt="" width={44} height={44} className="size-11 object-contain" />
            Findr
          </Link>
          <div className="max-w-lg space-y-5 pb-2 drop-shadow-md">
            <p className="font-display text-[clamp(2.25rem,4vw,4.25rem)] font-extrabold leading-[1.02]">Lost things find their way home.</p>
            <p className="max-w-md text-lg font-medium text-white/90">Report, search, and safely return items across campus.</p>
            <div className="flex flex-wrap gap-x-7 gap-y-2 border-t border-white/40 pt-5 text-small font-semibold text-white/90">
              <span>Verified community</span>
              <span>Private claims</span>
              <span>Safer handovers</span>
            </div>
          </div>
        </div>
      </section>
      <section className="flex items-center justify-center px-gutter py-10 lg:px-12">
        <div className="w-full max-w-form">
          <Link href="/" className="mb-10 inline-flex items-center gap-2 font-display text-h3 lg:hidden">
            <Image src="/brand/findr-mark.png" alt="" width={40} height={40} className="size-10 object-contain" priority />
            Findr
          </Link>
          <div className="mb-7 space-y-2">
            <h1 className="text-h2 sm:text-h1">{title}</h1>
            <p className="text-muted-foreground">{description}</p>
          </div>
          {children}
          <div className="mt-7 text-center text-small text-muted-foreground">{footer}</div>
        </div>
      </section>
    </main>
  );
}
