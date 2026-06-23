import "server-only";
import nodemailer from "nodemailer";

function smtpPort(): number {
  const port = Number(process.env.SMTP_PORT ?? 587);
  return Number.isInteger(port) && port > 0 ? port : 587;
}

export function emailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST?.trim() && process.env.EMAIL_FROM?.trim());
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
