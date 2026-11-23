# adsiq-mcp

An [MCP](https://modelcontextprotocol.io/) server for [AdsIQ](https://ads-iq.vercel.app). Exposes the AdsIQ REST API — prediction, agentic orchestration, DCO, campaigns, and billing — as MCP tools you can call from Claude Desktop, Claude Code, or any other MCP-aware client.

This package is a **thin client**: it does not duplicate any AdsIQ business logic. It authenticates you against Supabase, holds the resulting JWT in memory, and proxies tool calls through to the AdsIQ Vercel deployment.

## Install

```bash
npm install -g adsiq-mcp
# or run on demand
npx adsiq-mcp
```

## Configuration

Set these env vars before launching the server:

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `ADSIQ_API_URL` | no | `https://ads-iq.vercel.app` | Base URL of the AdsIQ deployment |
| `ADSIQ_SUPABASE_URL` | **yes** | — | Supabase project URL used for auth |
| `ADSIQ_SUPABASE_ANON_KEY` | **yes** | — | Supabase anon public key |
| `ADSIQ_EMAIL` | no | — | Optional auto sign-in email |
| `ADSIQ_PASSWORD` | no | — | Optional auto sign-in password |

If `ADSIQ_EMAIL` / `ADSIQ_PASSWORD` are set, the server signs in on startup; otherwise call the `sign_in` tool first.

## Claude Desktop config

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "adsiq": {
      "command": "npx",
      "args": ["-y", "adsiq-mcp"],
      "env": {
        "ADSIQ_API_URL": "https://ads-iq.vercel.app",
        "ADSIQ_SUPABASE_URL": "https://YOUR-PROJECT.supabase.co",
        "ADSIQ_SUPABASE_ANON_KEY": "eyJhbGci...",
        "ADSIQ_EMAIL": "you@example.com",
        "ADSIQ_PASSWORD": "••••••••"
      }
    }
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `sign_in` | Sign in with email + password; stores the Supabase JWT in memory. |
| `sign_out` | Clear the in-memory session. |
| `whoami` | Return the currently signed-in user (or null). |
| `predict_ad` | Run the AdsIQ performance prediction on an ad concept. |
| `run_agent` | Run the Agentic Orchestrator on a campaign snapshot. |
| `generate_dco` | Generate Dynamic Creative Optimisation prompts. |
| `list_campaigns` | List campaigns the signed-in user owns. |
| `get_campaign` | Fetch one campaign by id. |
| `create_campaign` | Persist a new campaign with its prediction payload. |
| `get_agent_history` | Fetch autonomous agent run history. |
| `log_ai_usage` | Record AI token usage against the signed-in account. |
| `verify_subscription` | Return the subscription status for the signed-in user. |
| `cancel_subscription` | Cancel the signed-in user's subscription. |
| `create_checkout_session` | Create a Stripe checkout session for `professional` or `pay_as_you_go`. |
| `enterprise_enquiry` | Submit an enterprise sales enquiry. |
| `list_agencies` | List agencies visible to the signed-in user. |
| `admin_dashboard` | Admin read-side metrics (overview, revenue, ai-cost, usage, campaigns, system, inbox, audit). |
| `admin_list_users` | List every AdsIQ user with plan, subscription and campaign metadata. |
| `admin_delete_user` | Permanently delete a Supabase auth user. |
| `admin_grant_subscription` | Manually grant or overwrite a user's subscription (bypasses Stripe). |
| `admin_update_subscription` | Patch an existing subscription row (status, plan, period, extend days). |
| `admin_cancel_subscription_record` | Soft-cancel a subscription row by id. |
| `admin_refund` | Issue a Stripe refund by payment intent or checkout session. |
| `admin_broadcast` | Send an email broadcast to a user audience. |
| `admin_list_broadcasts` | List past admin email broadcasts. |
| `admin_export` | Export CSV of users / campaigns / revenue / usage / audit. |
| `admin_provision_account` | Create a pre-confirmed user and activate their subscription (no Stripe). |

### Admin tools

The `admin_*` tools call the server's `/api/admin/*` routes, which are guarded
by an admin-role check against the signed-in Supabase user. Signing in as a
normal user will cause every admin tool to return a `403 Forbidden` from the
upstream API. Grant the admin role in Supabase (user metadata) before using
these tools.

## Develop

```bash
npm install
npm run build
npm start
```

Dev with hot reload:

```bash
npm run dev
```

## License

MIT © 2026 Alexander / PresciaIQ
