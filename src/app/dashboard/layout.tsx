import { verifySession } from "@/lib/dal";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { Logo } from "@/components/shared/logo";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifySession();

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar fixa — desktop */}
      <aside className="hidden w-64 shrink-0 flex-col bg-bv-black lg:flex">
        <div className="px-5 py-5">
          <Logo variant="light" showTagline />
        </div>
        <SidebarNav papel={session.papel} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <MobileNav papel={session.papel} />
          </div>
          <UserMenu nome={session.nome} papel={session.papel} />
        </header>
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
