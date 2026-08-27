# browser-ops

lease a cloak browser, then drive a specific tab over a unix socket.

one chrome process per named face. many tabs can share that process. each tab has at most one writer.

you do not attach puppeteer or a raw cdp url to a shared port. the daemon already holds that connection. you send one json line per action.

## the loop

```text
bind {site | profile | scratch}
  → launch or join chrome
  → daemon already holding that chrome
  → sidecar: worker, lease, target, socket
navigate | click | type | ...
  → json-line on the daemon socket
  → daemon pins the leased tab, then runs the action
release
  → drop this tab lease
```

## why it is unusual

shared chrome is the hard part. two clients on one named face get two tab leases, not two competing writers on the visible tab. `tabs` tags pages `owned_by_me` / `owned_by` / `unowned`. switching to a sibling tab peeks; it does not steal focus. steal is operator recovery, not an agent verb.

lease ids are mutation capabilities. they stay in the sidecar and are stripped from model-visible tool text.

cdp stays on localhost. cookies live in gitignored profile dirs. no secrets in lease json.

read `architecture.md` for the ownership cut.
