import "server-only";

// LINE Notify — sends a message to the admin group chat.
// Set LINE_NOTIFY_TOKEN in .env to activate; no-op when missing.
// https://notify-bot.line.me/

const TOKEN = process.env.LINE_NOTIFY_TOKEN?.trim() ?? "";

export function lineNotifyConfigured(): boolean {
  return !!TOKEN;
}

/** Best-effort: never throws, silently skips when token is absent. */
export async function lineNotifyAdmin(message: string): Promise<void> {
  if (!TOKEN) return;
  try {
    await fetch("https://notify-api.line.me/api/notify", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ message }).toString(),
    });
  } catch {
    // network failure — best-effort
  }
}
