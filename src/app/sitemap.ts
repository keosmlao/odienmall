import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";
import {
  getAllWebProductCodes,
  getWebBrands,
  getWebCategories,
} from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [codes, categories, brands] = await Promise.all([
    getAllWebProductCodes(),
    getWebCategories(),
    getWebBrands(),
  ]);

  const u = (path: string) => `${SITE_URL}${path}`;

  const staticPages: MetadataRoute.Sitemap = [
    { url: u("/"), changeFrequency: "daily", priority: 1 },
    { url: u("/products"), changeFrequency: "daily", priority: 0.9 },
    { url: u("/brands"), changeFrequency: "weekly", priority: 0.6 },
  ];

  return [
    ...staticPages,
    ...categories.map((c) => ({
      url: u(`/category/${encodeURIComponent(c.code)}`),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...brands.map((b) => ({
      url: u(`/brand/${encodeURIComponent(b.code)}`),
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    ...codes.map((code) => ({
      url: u(`/product/${encodeURIComponent(code)}`),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
