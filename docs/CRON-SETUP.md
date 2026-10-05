# Cron Setup for Monitor Checks

Monitor checks **do not run automatically** after deployment. You must configure a server-side cron job to hit the API every 5 minutes (or more frequently).

## 1. Set CRON_SECRET

In your `.env` or deployment environment variables:

```
CRON_SECRET=your-long-random-secret-string
```

Generate a random string, e.g. `openssl rand -hex 32`.

## 2. Add Cron Job

### Option A: Linux Server (crontab)

```bash
crontab -e
```

Add this line (runs every 5 minutes):

```
*/5 * * * * curl -s -X GET "https://YOUR-DOMAIN.com/api/cron/monitors" -H "Authorization: Bearer YOUR_CRON_SECRET" > /dev/null 2>&1
```

Replace `YOUR-DOMAIN.com` and `YOUR_CRON_SECRET` with your values.

### Option B: Vercel Cron (vercel.json)

If using Vercel:

```json
{
  "crons": [
    {
      "path": "/api/cron/monitors",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

Vercel will call the endpoint. Ensure `CRON_SECRET` is set and the handler validates it.

### Option C: External Service (cron-job.org, EasyCron, etc.)

1. Create an account at [cron-job.org](https://cron-job.org) or similar
2. Add a new cron job:
   - URL: `https://YOUR-DOMAIN.com/api/cron/monitors`
   - Schedule: Every 5 minutes
   - Headers: `Authorization: Bearer YOUR_CRON_SECRET`
   - Method: GET or POST

## 3. Verify

After setup, check that `Last checked` updates in Dashboard → Monitor within 5–10 minutes. You can also trigger a manual check via the "Run check" button in Monitor.

## 4. Discord & Email Alerts

When a monitor goes down:

- **Discord**: Set webhook URL in Dashboard → Settings → Apps (Discord card)
- **Email**: Set alert emails (comma-separated) in the same card. Requires SMTP env vars.
