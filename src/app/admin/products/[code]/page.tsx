import { redirect, notFound } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { getAdminProduct, getProductImages, getProductSpecs } from "@/lib/products-admin";
import { getAllTags, getProductTags } from "@/lib/product-tags";
import ProductTagsEditor from "@/components/admin/ProductTagsEditor";
import { saveProductTags, createProductTag } from "../actions";
import { formatKip, htmlToText } from "@/lib/format";
import { PageHeader, Card, CardTitle, Badge } from "@/components/admin/ui";
import {
  ProductGalleryForm,
  ProductPublishForm,
  ProductDescriptionForm,
} from "./ProductEditForm";
import ShortDescriptionForm from "./ShortDescriptionForm";
import PriceNoteForm from "./PriceNoteForm";
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
  
  const [images, specs, allTags, productTags] = await Promise.all([
    getProductImages(product.code),
    getProductSpecs(product.code),
    getAllTags(),
    getProductTags(product.code),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={product.name}
        subtitle={product.code}
        back={{ href: "/admin/products", label: "ກັບໄປລາຍການສິນຄ້າ" }}
      />

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Properties & Metadata */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card: ERP Info */}
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
              <div className="flex flex-wrap gap-1.5 pt-2.5 border-t border-slate-100/70">
                {product.isNew && <Badge tone="brand">ໃໝ່</Badge>}
                {product.isPromo && <Badge tone="price">ໂປຣ</Badge>}
                {product.isHidden && <Badge tone="rose">ເຊື່ອງຢູ່</Badge>}
                {product.isFeatured && <Badge tone="amber">ແນະນຳ</Badge>}
              </div>
            </dl>
            <p className="mt-4 border-t border-slate-100 pt-3 text-[10px] font-bold text-slate-400">
              ຊື່, ລາຄາ, ສະຕັອກ ແລະ ໝວດ ມາຈາກລະບົບ ERP — ແກ້ໄຂຢູ່ ERP ເທົ່ານັ້ນ.
            </p>
          </Card>

          {/* Card: Publishing Toggles */}
          <ProductPublishForm
            code={product.code}
            isHidden={product.isHidden}
            isFeatured={product.isFeatured}
          />

          {/* Card: Tags */}
          <Card>
            <CardTitle>Tags</CardTitle>
            <ProductTagsEditor
              productCode={product.code}
              allTags={allTags}
              initial={productTags}
              setTags={saveProductTags}
              createTag={createProductTag}
            />
          </Card>

          {/* Card: Price Note */}
          {product.price == null && (
            <Card>
              <CardTitle>ໂນດລາຄາ (Price note)</CardTitle>
              <p className="mb-3 text-[11px] text-slate-450 leading-normal">
                ສິນຄ້ານີ້ບໍ່ມີລາຄາ POS — ຂໍ້ຄວາມນີ້ຈະສະແດງແທນ &quot;ສອບຖາມລາຄາ&quot; ທົ່ວໄປ
              </p>
              <PriceNoteForm code={product.code} initial={product.priceNote ?? null} />
            </Card>
          )}
        </div>

        {/* Right Column: Gallery, Specs & Content */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card: Gallery */}
          <ProductGalleryForm code={product.code} images={images} />

          {/* Card: Short Description */}
          <Card>
            <CardTitle>ຄຳອະທິບາຍຫຍໍ້</CardTitle>
            <p className="mb-3 text-[11px] text-slate-455 leading-normal">
              ສະແດງໃນ buy box ໃກ້ລາຄາ — ສັ້ນ 1-3 ແຖວ
            </p>
            <ShortDescriptionForm code={product.code} initial={product.shortDescription ?? null} />
          </Card>

          {/* Card: Storefront Specs Override */}
          <ProductDescriptionForm
            code={product.code}
            description={product.description}
            erpDescription={htmlToText(product.erpDescription)}
          />

          {/* Card: Description / Specifications */}
          <Card>
            <CardTitle>ຄຳອະທິບາຍ / ສະເປັກສິນຄ້າ</CardTitle>
            <ProductSpecsEditor
              productCode={product.code}
              initial={specs}
              erpDescription={htmlToText(product.erpDescription) ?? undefined}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100/70 pb-2.5 text-xs font-semibold">
      <dt className="text-slate-450 font-bold">{label}</dt>
      <dd className="text-right text-slate-800 font-extrabold">{value}</dd>
    </div>
  );
}
