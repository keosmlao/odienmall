import { firstParam } from "@/lib/params";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const redirect = firstParam(sp.redirect);
  // Only allow internal redirects.
  const safe = redirect && redirect.startsWith("/") ? redirect : "/account";
  return <LoginForm redirect={safe} />;
}
