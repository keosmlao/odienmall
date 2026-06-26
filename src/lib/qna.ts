import "server-only";
import { query, queryOne } from "./db";
import { notify } from "./notifications";

// Product Q&A — customers ask, admin answers. Only answered (and non-hidden)
// questions show on the storefront.

export interface ProductQuestion {
  id: number;
  productCode: string;
  customerCode: string | null;
  customerName: string;
  question: string;
  answer: string | null;
  answeredAt: string | null;
  createdAt: string;
  isHidden: boolean;
}

type Row = {
  id: string;
  product_code: string;
  customer_code: string | null;
  customer_name: string;
  question: string;
  answer: string | null;
  answered_at: Date | null;
  created_at: Date;
  is_hidden: boolean;
};

function toQ(r: Row): ProductQuestion {
  return {
    id: Number(r.id),
    productCode: r.product_code,
    customerCode: r.customer_code,
    customerName: r.customer_name,
    question: r.question,
    answer: r.answer,
    answeredAt: r.answered_at ? r.answered_at.toISOString() : null,
    createdAt: r.created_at.toISOString(),
    isHidden: r.is_hidden,
  };
}

const COLS = `id, product_code, customer_code, customer_name, question, answer, answered_at, created_at, is_hidden`;

/** Public list for a product: answered + non-hidden (newest first). */
export async function getProductQuestions(productCode: string): Promise<ProductQuestion[]> {
  const rows = await query<Row>(
    `select ${COLS} from odg_ecom.product_questions
      where product_code = $1 and answer is not null and not is_hidden
      order by id desc limit 50`,
    [productCode],
  );
  return rows.map(toQ);
}

export async function askQuestion(input: {
  productCode: string;
  customerCode: string | null;
  customerName: string;
  question: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const q = input.question?.trim();
  if (!q) return { ok: false, error: "ກະລຸນາພິມຄຳຖາມ" };
  if (q.length > 1000) return { ok: false, error: "ຄຳຖາມຍາວເກີນໄປ" };
  await query(
    `insert into odg_ecom.product_questions (product_code, customer_code, customer_name, question)
     values ($1, $2, $3, $4)`,
    [input.productCode, input.customerCode, input.customerName?.trim() || "ລູກຄ້າ", q],
  );
  return { ok: true };
}

/** All questions by a customer (for their account history), newest first. */
export async function listQuestionsByCustomer(customerCode: string): Promise<ProductQuestion[]> {
  const rows = await query<Row>(
    `select ${COLS} from odg_ecom.product_questions
      where customer_code = $1
      order by id desc limit 100`,
    [customerCode],
  );
  return rows.map(toQ);
}

// ── Admin ───────────────────────────────────────────────────────────────────

export async function listQuestions(onlyOpen = false): Promise<ProductQuestion[]> {
  const rows = await query<Row>(
    `select ${COLS} from odg_ecom.product_questions
      ${onlyOpen ? "where answer is null" : ""}
      order by (answer is null) desc, id desc limit 200`,
  );
  return rows.map(toQ);
}

export async function countOpenQuestions(): Promise<number> {
  const r = await queryOne<{ n: string }>(
    `select count(*)::text as n from odg_ecom.product_questions where answer is null and not is_hidden`,
  );
  return Number(r?.n ?? 0);
}

/** Admin answers a question and notifies the asker. */
export async function answerQuestion(id: number, answer: string, by?: string): Promise<boolean> {
  const text = answer?.trim();
  if (!text) return false;
  const rows = await query<{ product_code: string; customer_code: string | null }>(
    `update odg_ecom.product_questions
        set answer = $2, answered_by = $3, answered_at = now()
      where id = $1 returning product_code, customer_code`,
    [id, text, by ?? null],
  );
  const row = rows[0];
  if (!row) return false;
  if (row.customer_code) {
    await notify(row.customer_code, {
      type: "qna",
      title: "ມີຄຳຕອບສຳລັບຄຳຖາມຂອງທ່ານ",
      body: text.slice(0, 120),
      link: `/product/${encodeURIComponent(row.product_code)}`,
    }).catch(() => {});
  }
  return true;
}

export async function setQuestionHidden(id: number, hidden: boolean): Promise<void> {
  await query(`update odg_ecom.product_questions set is_hidden = $2 where id = $1`, [id, hidden]);
}
