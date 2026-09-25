# deploy

serve the built client and websocket from one origin. keep the model backend private.

```text
LLM_BASE_URL=http://127.0.0.1:8317/v1
LLM_MODEL=gemini-3.1-flash-lite(minimal)
LLM_API_KEY=
```

put the key in a local env file, never in git, never in `VITE_*`. hashed IPs only in the budget file. node 24.

vite inlines the nerd-icon subset as a `data:` font. CSP must allow `font-src 'self' data:` or github/x icons stay tofu and the exhibit cannot paint private-use glyphs. do not load fonts from google; production CSP will block them.

## docker on services-1

`BUDGET_PATH` must be a file inside a mounted **directory**. do not bind-mount the json file itself. persist writes a sibling tmp and `rename`s onto the dest; docker returns `EBUSY` on a file mount, and an unhandled persist used to crash node and drop `/ws`.

from the `colak-sh` container, talk to the bouncer on the docker network:

```text
LLM_BASE_URL=http://cpa-bouncer:8317/v1
```

`https://proxy.net.colak.sh` from that container fails TLS. the public site key is not the bouncer key; put the bouncer key in `runtime.env`.

```yaml
volumes:
  - ./src:/app:ro
  - ./data:/data
```
