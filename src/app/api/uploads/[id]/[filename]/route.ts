import { getUploadBlob } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; filename: string }> },
) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return new Response("Not found", { status: 404 });
  }

  const blob = await getUploadBlob(id);
  if (!blob) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(blob.data), {
    headers: {
      "Content-Type": blob.contentType,
      "Content-Length": String(blob.sizeBytes),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": `inline; filename="${blob.filename.replace(/"/g, "")}"`,
    },
  });
}
