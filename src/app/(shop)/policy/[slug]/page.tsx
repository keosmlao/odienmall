import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { POLICIES, POLICY_SLUGS } from "@/lib/pages-content";

export function generateStaticParams() {
  return POLICY_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = POLICIES[slug];
  return { title: p?.title ?? "ນະໂຍບາຍ" };
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = POLICIES[slug];
  if (!p) notFound();
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/help" className="text-sm text-slate-400 hover:text-orange-600">← ສູນຊ່ວຍເຫຼືອ</Link>
      <h1 className="mt-2 text-2xl font-black text-slate-900">{p.title}</h1>
      <div className="mt-4 space-y-3 rounded-2xl border border-slate-100 bg-white p-6">
        {p.body.map((para, i) => (
          <p key={i} className="text-sm leading-7 text-slate-600">{para}</p>
        ))}
      </div>
    </div>
  );
}
