import type { Metadata } from "next";
import TrackForm from "./TrackForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ຕິດຕາມຄຳສັ່ງຊື້" };

export default async function TrackPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const initial = typeof sp.no === "string" ? sp.no : "";
  return <TrackForm initialOrderNo={initial} />;
}
