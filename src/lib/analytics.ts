import "server-only";
import { query, queryOne } from "./db";

// Lightweight first-party web analytics (no third party). A client beacon posts
// a visitor id (anonymous, localStorage) on each page view + a periodic heartbeat.
// visit_events = history (daily/monthly), visit_pings = latest heartbeat (online).

const ONLINE_WINDOW = "5 minutes";

/** Record a visit. `view` inserts a history row; the ping/last_seen is always updated. */
export async function recordVisit(
  visitorId: string,
  path: string | null,
  view: boolean,
): Promise<void> {
  const vid = (visitorId || "").slice(0, 64);
  if (!vid) return;
  const p = path ? path.slice(0, 300) : null;
  await query(
    `insert into odg_ecom.visit_pings (visitor_id, path, last_seen)
       values ($1,$2,now())
     on conflict (visitor_id) do update set path=excluded.path, last_seen=now()`,
    [vid, p],
  );
  if (view) {
    await query(
      `insert into odg_ecom.visit_events (visitor_id, path) values ($1,$2)`,
      [vid, p],
    );
  }
}

/** Number of distinct visitors seen in the last few minutes. */
export async function getOnlineCount(): Promise<number> {
  const row = await queryOne<{ n: number }>(
    `select count(*)::int as n from odg_ecom.visit_pings
      where last_seen > now() - interval '${ONLINE_WINDOW}'`,
  );
  return row?.n ?? 0;
}

export interface VisitBucket {
  label: string; // YYYY-MM-DD or YYYY-MM
  visitors: number;
  views: number;
}

export interface VisitStats {
  online: number;
  todayVisitors: number;
  todayViews: number;
  monthVisitors: number;
  totalViews: number;
  daily: VisitBucket[]; // last 14 days
  monthly: VisitBucket[]; // last 12 months
}

export async function getVisitStats(): Promise<VisitStats> {
  const [online, today, month, total, daily, monthly] = await Promise.all([
    getOnlineCount(),
    queryOne<{ visitors: number; views: number }>(
      `select count(distinct visitor_id)::int as visitors, count(*)::int as views
         from odg_ecom.visit_events where created_at::date = current_date`,
    ),
    queryOne<{ visitors: number }>(
      `select count(distinct visitor_id)::int as visitors
         from odg_ecom.visit_events where created_at >= date_trunc('month', current_date)`,
    ),
    queryOne<{ views: number }>(`select count(*)::int as views from odg_ecom.visit_events`),
    query<{ label: string; visitors: number; views: number }>(
      `select to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as label,
              count(distinct visitor_id)::int as visitors,
              count(*)::int as views
         from odg_ecom.visit_events
        where created_at >= current_date - interval '13 days'
        group by 1 order by 1`,
    ),
    query<{ label: string; visitors: number; views: number }>(
      `select to_char(date_trunc('month', created_at), 'YYYY-MM') as label,
              count(distinct visitor_id)::int as visitors,
              count(*)::int as views
         from odg_ecom.visit_events
        where created_at >= date_trunc('month', current_date) - interval '11 months'
        group by 1 order by 1`,
    ),
  ]);

  return {
    online,
    todayVisitors: today?.visitors ?? 0,
    todayViews: today?.views ?? 0,
    monthVisitors: month?.visitors ?? 0,
    totalViews: total?.views ?? 0,
    daily,
    monthly,
  };
}
