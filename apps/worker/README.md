# Veto usage worker

This Worker receives anonymous app-start events and writes them to the
Cloudflare Analytics Engine `Veto` dataset.

## Deploy

```bash
pnpm install
pnpm --filter @vetoexpress/usage-worker deploy
```

After deployment, set the returned URL as a build-time variable for the
Electron app:

```powershell
$env:VETO_TELEMETRY_ENDPOINT = "https://veto-usage.example.workers.dev"
pnpm build:win
```

The endpoint is compiled into the Electron build. If it is omitted, Veto
starts normally and does not send telemetry.

## Data points

- `index1`: random installation ID
- `blob1`: event name (`app_started`)
- `blob2`: app version
- `blob3`: operating system (`process.platform`)
- `blob4`: CPU architecture (`process.arch`)
- `double1`: 1

No conference data, user names, file paths, or hardware identifiers are sent.
Cloudflare may record transport metadata as part of its normal worker logs.

## Query

Use a Cloudflare API token with `Account Analytics: Read`:

```bash
curl "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/analytics_engine/sql" \
  -H "Authorization: Bearer $API_TOKEN" \
  --data "SELECT SUM(_sample_interval) AS launches FROM Veto WHERE blob1 = 'app_started' AND timestamp >= NOW() - INTERVAL '30' DAY"
```
