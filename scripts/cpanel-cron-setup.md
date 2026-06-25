# cPanel Cron Job Setup

ຕັ້ງ cron job ໃນ cPanel ທຸກ 15 ນາທີ:

## Command

```
*/15 * * * * curl -s "https://odienmall.com/api/cron?token=2046bbc405f0cd8860ffedbc3364341753b915184a8847a0a345d127f8cd3332" > /dev/null 2>&1
```

## Steps
1. Login cPanel → **Cron Jobs**
2. ເລືອກ **Every 15 Minutes** (`*/15 * * * *`)
3. ວາງ command ຂ້າງເທິງ → **Add New Cron Job**

## What it runs
- ກວດ stock/price alerts
- Sync delivery notifications  
- Abandoned cart reminders
- Affiliate commission sync
- QR payment reminders
- AI log cleanup (30-day retention)

## Vercel
`vercel.json` already has `*/15 * * * *` configured automatically.
Set `CRON_TOKEN` in Vercel env vars to match `CRON_SECRET` provided by Vercel.
