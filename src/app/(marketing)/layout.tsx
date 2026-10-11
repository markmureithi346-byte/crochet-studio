import { getCurrentUser } from "@/lib/data/auth";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";

/**
 * MARKETING LAYOUT (route group, URL stays "/")
 *
 * A route group is a folder name in parentheses that does not affect the URL.
 * We use it to give the landing page a completely different chrome — wide
 * container, simple header, footer — from the signed-in app shell, without
 * duplicating any pages.
 */
export default async function MarketingLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader user={user} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
