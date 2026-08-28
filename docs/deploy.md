# deploy

serve the built client and websocket from one origin. keep the model backend private.

```text
LLM_BASE_URL=http://127.0.0.1:8317/v1
LLM_MODEL=gemini-3.1-flash-lite(minimal)
LLM_API_KEY=
```

put the key in a local env file, never in git, never in `VITE_*`. hashed IPs only in the budget file. node 24.
