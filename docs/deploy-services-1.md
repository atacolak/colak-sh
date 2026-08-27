# deploy notes (services-1)

portfolio origin stays loopback/private. cloudflare tunnel publishes only `colak.sh`.

```text
internet -> cloudflare tunnel -> 127.0.0.1:8787
  / /assets /healthz /ws
```

## CPA

the model backend is CLIProxyAPI / CPA. it must remain private.

local development:

```text
LLM_BASE_URL=http://127.0.0.1:8317/v1
LLM_MODEL=gemini-3.1-flash-lite
```

production on `services-1` cannot use sfub's loopback. use the existing private path:

```text
LLM_BASE_URL=http://proxy.net.colak.sh/v1
```

that hostname is netbird/split-horizon only. do not add a public cloudflare hostname for CPA. do not publish 8317.

use a dedicated CPA client API key for colak.sh. put it in a root/service-readable env file on services-1, not in git, not in `VITE_*`.

## budgets

daily UTC buckets persist at `BUDGET_PATH` (default `/data/usage-budget.json`). hashed IPs only. missing CPA usage telemetry debits 10,000 tokens.

## node

verify and run under Node 24.
