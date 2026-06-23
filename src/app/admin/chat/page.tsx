import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { listThreads } from "@/lib/chat";
import { PageHeader } from "@/components/admin/ui";
import ChatInbox from "@/components/admin/ChatInbox";

export const dynamic = "force-dynamic";

export default async function AdminChatPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  const threads = await listThreads();
  return (
    <div>
      <PageHeader title="ແຊັດລູກຄ້າ" subtitle="ຕອບຄຳຖາມລູກຄ້າແບບ realtime" />
      <ChatInbox initial={threads} />
    </div>
  );
}
