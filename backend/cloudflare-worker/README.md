# CHSH Leaderboard Backend

This Cloudflare Worker stores shared CHSH leaderboard entries in Cloudflare D1.

## Deploy

1. Create a D1 database named `chsh_leaderboard`.
2. Replace `database_id` in `wrangler.toml` with the D1 database ID.
3. Apply the schema:

```powershell
wrangler d1 execute chsh_leaderboard --file=./schema.sql --remote
```

If you already created the table before the simulation columns were added,
either recreate the table while testing or run equivalent `ALTER TABLE`
commands for `sim_wins`, `sim_total`, and `sim_value`.

4. Deploy:

```powershell
wrangler deploy
```

5. Copy the Worker URL into the CHSH page's "Leaderboard API URL" field.

The frontend keeps using browser-local storage if this URL is blank.

## Note

This endpoint accepts public submissions. Before advertising the leaderboard
widely, add a moderation flow, Cloudflare Turnstile, or a shared submit token.
