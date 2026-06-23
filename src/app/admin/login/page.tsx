import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import AdminLoginForm from "./AdminLoginForm";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect("/admin");
  return <AdminLoginForm />;
}
