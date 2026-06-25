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
  const error = firstParam(sp.error);
  // Only allow internal redirects.
  const safe = redirect && redirect.startsWith("/") ? redirect : "/account";
  const lineEnabled = !!(process.env.LINE_LOGIN_CHANNEL_ID?.trim() && process.env.LINE_LOGIN_CHANNEL_SECRET?.trim());
  const lineLiffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID?.trim() || "";
  return <LoginForm redirect={safe} lineEnabled={lineEnabled} lineLiffId={lineLiffId} lineError={error} />;
}
