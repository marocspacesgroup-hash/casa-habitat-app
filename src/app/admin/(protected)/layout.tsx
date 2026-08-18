import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/auth";
import { logout } from "@/lib/supabase/auth-actions";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAdmin } = await requireAdmin();

  if (!user) {
    redirect("/admin/login");
  }
  if (!isAdmin) {
    redirect("/admin/login?error=not_admin");
  }

  return (
    <div className="min-h-screen bg-[#F4F2EE]">
      <header className="bg-navy border-b border-gold/15">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/admin/dashboard" className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full border border-gold flex items-center justify-center font-display text-gold text-xs">
              CH
            </span>
            <span className="font-display text-ivory text-[15px]">
              Administration <em className="text-gold not-italic italic">Casa Habitat</em>
            </span>
          </Link>
          <div className="flex items-center gap-5">
            <span className="text-ivory/40 text-xs font-mono hidden sm:inline">
              {user.email}
            </span>
            <Link
              href="/admin/listings/new"
              className="bg-gold text-navy text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-sm"
            >
              + Nouveau bien
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="text-ivory/60 hover:text-gold text-xs uppercase tracking-wider"
              >
                Déconnexion
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-10">{children}</main>
    </div>
  );
}
