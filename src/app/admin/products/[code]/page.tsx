import { redirect, notFound } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { getAdminProduct, getProductImages, getProductSpecs } from "@/lib/products-admin";
import { formatKip, htmlToText } from "@/lib/format";
import { PageHeader, Card, CardTitle, Badge } from "@/components/admin/ui";
import ProductEditForm from "./ProductEditForm";
import ShortDescriptionForm from "./ShortDescriptionForm";
import ProductSpecsEditor from "@/components/admin/ProductSpecsEditor";

export const dynamic = "force-dynamic";

export default async function AdminProductDetail({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");

  const { code } = await params;
  const decoded = decodeURIComponent(code);
  const product = await getAdminProduct(decoded);
  if (!product) notFound();
  const [images, specs] = await Promise.all([
    getProductImages(product.code),
    getProductSpecs(product.code),
  ]);

  return (
    <div>
      <PageHeader
        title={product.name}
        subtitle={product.code}
        back={{ href: "/admin/products", label: "ກັບໄປລາຍການສິນຄ້າ" }}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Read-only ERP info */}
        <Card>
          <CardTitle hint={<Badge tone="gray">ອ່ານຢ່າງດຽວ</Badge>}>ຂໍ້ມູນຈາກ ERP</CardTitle>
          <dl className="space-y-3 text-sm">
            <Field label="ຍີ່ຫໍ້" value={product.brandName ?? "—"} />
            <Field label="ໝວດສິນຄ້າ" value={product.categoryName ?? "—"} />
            <Field
              label="ລາຄາ (POS)"
              value={product.price != null ? formatKip(product.price) : "ສອບຖາມລາຄາ"}
            />
            <Field
              label="ສະຕັອກ"
              value={product.stock > 0 ? `${product.stock.toLocaleString()} ໜ່ວຍ` : "ໝົດສະຕັອກ"}
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {product.isNew && <Badge tone="brand">ໃໝ່</Badge>}
              {product.isPromo && <Badge tone="price">ໂປຣ</Badge>}
              {product.isHidden && <Badge tone="rose">ເຊື່ອງຢູ່</Badge>}
              {product.isFeatured && <Badge tone="amber">ແນະນຳ</Badge>}
            </div>
          </dl>
          <p className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-400">
            ຊື່, ລາຄາ, ສະຕັອກ ແລະ ໝວດ ມາຈາກລະບົບ ERP — ແກ້ໄຂຢູ່ ERP ເທົ່ານັ້ນ.
          </p>
        </Card>

        {/* Editable overlay */}
        <ProductEditForm
          code={product.code}
          images={images}
          isHidden={product.isHidden}
          isFeatured={product.isFeatured}
          description={product.description}
          erpDescription={htmlToText(product.erpDescription)}
        />
      </div>

      {/* Short description */}
      <section className="mt-5 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-black text-slate-800">ຄຳອະທິບາຍຫຍໍ້</h2>
        <p className="mb-3 text-xs text-slate-500">ສະແດງໃນ buy box ໃກ້ລາຄາ — ສັ້ນ 1-3 ແຖວ</p>
        <ShortDescriptionForm code={product.code} initial={product.shortDescription ?? null} />
      </section>

      {/* Specifications */}
      <section className="mt-5 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-black text-slate-800">ຂໍ້ມູນສະເພາະ (Specifications)</h2>
        <ProductSpecsEditor productCode={product.code} initial={specs} />
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-400">{label}</dt>
      <dd className="text-right font-medium text-gray-700">{value}</dd>
    </div>
  );
}
