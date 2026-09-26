# deploy

serve the built client and websocket from one origin. keep the model backend private.

```text
LLM_BASE_URL=http://cpa-bouncer:8317/v1
LLM_MODEL=gemini-3.8-flash-high(minimal)
LLM_FALLBACK_MODELS=gemini-3.7-flash-high,gemini-3.1-flash-lite
LLM_API_KEY=
```

farm ids that actually exist: `gemini-3.8-flash-high`, `gemini-3.7-flash-high`, `gemini-3.1-flash-lite`. the `(minimal)` suffix turns thinking off. the node loop walks `LLM_FALLBACK_MODELS` when the primary stream fails. `scripts/flash-lite-gate.mjs` is the local 8318 lock for a host-side key; production on services-1 talks to `cpa-bouncer` instead. do not start local `colak-sh-gate` unless asked.

put the key in a local env file, never in git, never in `VITE_*`. hashed IPs only in the budget file. node 24.

wterm compiles an inlined wasm module. CSP must include `script-src 'self' 'wasm-unsafe-eval'` or `WebAssembly.instantiate` is refused, init destroys the widget, and the exhibit is wallpaper with no shell.

vite inlines the nerd-icon subset as a `data:` font. CSP must allow `font-src 'self' data:` or github/x icons stay tofu. keep that face on `.chat-social` only — it has two private-use glyphs and must not sit in the terminal stack. do not load fonts from google.

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
