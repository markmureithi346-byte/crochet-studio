import { requireUser } from "@/lib/data/auth";
import { AppShell } from "@/components/app/app-shell";

/**
 * APP SHELL LAYOUT (route group, URLs unchanged)
 * ----------------------------------------------
 * Every signed-in page inherits the sidebar, mobile drawer and theme toggle from
 * here, so those are defined once instead of in every page.
 *
 * `requireUser()` is the security boundary. Note it is called in the LAYOUT, not
 * just the page: a layout wraps every nested route, so no signed-in page can
 * accidentally be added without protection.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  return <AppShell user={user}>{children}</AppShell>;
}
