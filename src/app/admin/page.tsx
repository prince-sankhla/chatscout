import { ControllerCommandCenter } from "@/components/admin/controller-command-center";
import { ControllerShell } from "@/components/admin/controller-shell";
import { requireAdminUser } from "@/lib/supabase/auth";

type AdminPageProps = { searchParams: Promise<{ status?: string; q?: string; communityStatus?: string; verification?: string; health?: string; category?: string; region?: string; owner?: string; sort?: string }> };

export default async function AdminPage({ searchParams }: AdminPageProps) {
  await requireAdminUser();
  const params = await searchParams;
  return <ControllerShell active="overview" title="Command Center" description="The operational picture of ChatScout at a glance."><ControllerCommandCenter searchParams={params} /></ControllerShell>;
}
