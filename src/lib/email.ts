import "server-only";
import nodemailer from "nodemailer";

function smtpPort(): number {
  const port = Number(process.env.SMTP_PORT ?? 587);
  return Number.isInteger(port) && port > 0 ? port : 587;
}

export function emailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST?.trim() && process.env.EMAIL_FROM?.trim());
}

function makeTransporter() {
  const port = smtpPort();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASSWORD ?? "";
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST!.trim(),
    port,
    secure: process.env.SMTP_SECURE === "1" || port === 465,
    auth: user ? { user, pass } : undefined,
  });
}

export interface OrderConfirmationData {
  orderNo: string;
  customerName: string;
  customerEmail: string;
  items: { name: string; qty: number; price: number }[];
  subtotal: number;
  shippingFee: number;
  paymentMethod: "cod" | "transfer";
  trackUrl: string;
}

export async function sendOrderConfirmationEmail(data: OrderConfirmationData): Promise<void> {
  if (!emailConfigured()) return;
  const rows = data.items
    .map(
      (i) =>
        `<tr><td style="padding:6px 8px;border-bottom:1px solid #f1f1f1">${i.name}</td><td style="padding:6px 8px;border-bottom:1px solid #f1f1f1;text-align:center">${i.qty}</td><td style="padding:6px 8px;border-bottom:1px solid #f1f1f1;text-align:right">${i.price.toLocaleString()} ₭</td></tr>`,
    )
    .join("");
  const total = data.subtotal + data.shippingFee;
  const payLabel = data.paymentMethod === "cod" ? "ເກັບເງິນປາຍທາງ (COD)" : "ໂອນຜ່ານທະນາຄານ / QR";
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;background:#fff">
      <div style="background:#f97316;padding:16px 20px;border-radius:10px 10px 0 0">
        <h1 style="color:#fff;margin:0;font-size:20px">OdienMall</h1>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 10px 10px">
        <h2 style="font-size:16px;color:#111827">ຢືນຢັນຄຳສັ່ງຊື້ — ${data.orderNo}</h2>
        <p style="color:#6b7280;font-size:14px">ສະບາຍດີ <strong>${data.customerName}</strong>, ພວກເຮົາໄດ້ຮັບຄຳສັ່ງຊື້ຂອງທ່ານແລ້ວ.</p>
        <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px">
          <thead><tr style="background:#f9fafb">
            <th style="padding:8px;text-align:left">ສິນຄ້າ</th>
            <th style="padding:8px;text-align:center">ຈຳນວນ</th>
            <th style="padding:8px;text-align:right">ລາຄາ</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="margin-top:12px;padding:12px;background:#f9fafb;border-radius:8px;font-size:14px">
          <div style="display:flex;justify-content:space-between"><span>ຍອດລວມ</span><strong>${data.subtotal.toLocaleString()} ₭</strong></div>
          <div style="display:flex;justify-content:space-between;margin-top:4px"><span>ຄ່າຂົນສົ່ງ</span><strong>${data.shippingFee === 0 ? "ຟຣີ" : `${data.shippingFee.toLocaleString()} ₭`}</strong></div>
          <div style="display:flex;justify-content:space-between;margin-top:8px;border-top:1px solid #e5e7eb;padding-top:8px"><span><strong>ທັງໝົດ</strong></span><strong style="color:#f97316">${total.toLocaleString()} ₭</strong></div>
        </div>
        <p style="font-size:14px;color:#6b7280;margin-top:12px">ວິທີຊຳລະ: <strong>${payLabel}</strong></p>
        <a href="${data.trackUrl}" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#f97316;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px">ຕິດຕາມອໍເດີ</a>
        <p style="font-size:12px;color:#9ca3af;margin-top:24px">OdienMall · +856 20 5992 9992 · ບ້ານຂົວຫຼວງ, ຈັນທະບູລີ, ວຽງຈັນ</p>
      </div>
    </div>`;

  const transporter = makeTransporter();
  await transporter.sendMail({
    from: process.env.EMAIL_FROM!.trim(),
    to: data.customerEmail,
    subject: `ຢືນຢັນຄຳສັ່ງຊື້ ${data.orderNo} — OdienMall`,
    html,
    text: `ອໍເດີ ${data.orderNo} ຮັບແລ້ວ. ຍອດລວມ ${total.toLocaleString()} ₭. ກວດສອບ: ${data.trackUrl}`,
  });
}

export async function sendAffiliateOtp(email: string, code: string): Promise<void> {
  if (!emailConfigured()) {
    throw new Error("ລະບົບ email ຍັງບໍ່ໄດ້ຕັ້ງຄ່າ");
  }

  const port = smtpPort();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASSWORD ?? "";
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST!.trim(),
    port,
    secure: process.env.SMTP_SECURE === "1" || port === 465,
    auth: user ? { user, pass } : undefined,
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM!.trim(),
    to: email,
    subject: "ລະຫັດຢືນຢັນ Affiliate — ODIENMALL",
    text: `ລະຫັດຢືນຢັນຂອງທ່ານແມ່ນ ${code}\nລະຫັດນີ້ໝົດອາຍຸພາຍໃນ 10 ນາທີ.\nຖ້າທ່ານບໍ່ໄດ້ສະໝັກ ກະລຸນາບໍ່ຕ້ອງດຳເນີນການໃດໆ.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px">
        <h2 style="color:#f97316">ODIENMALL Affiliate</h2>
        <p>ລະຫັດຢືນຢັນ email ຂອງທ່ານ:</p>
        <div style="font-size:32px;font-weight:800;letter-spacing:8px;padding:16px;background:#fff7ed;color:#c2410c;text-align:center">${code}</div>
        <p>ລະຫັດນີ້ໝົດອາຍຸພາຍໃນ 10 ນາທີ.</p>
      </div>`,
  });
}
