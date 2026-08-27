# browser-ops architecture

pieces:

- `browserctl` — who may use which named face or scratch; one process per worker; many tab leases; one writer per tab
- daemon — holds that worker's cdp connection; json-line rpc on a unix socket
- `cloak` — bind, drive, and release as one agent tool

ownership is by lease id. a lease is a mutation capability for exactly one tab. occupancy is not authority: an expiring lease occupies a tab but cannot click. a process lease cannot mint or click.

shared chrome:

- two clients, same named profile → same worker / same daemon / same chrome
- two tab leases
- click or type on a tab this lease does not own → conflict
- socket steal is forbidden; operator recovery is a dedicated steal launch
- mutating drive without an active target lease is rejected

the client does not pass a cdp url. bind pins the tab. later acts send action + target + lease. two clients on one chrome cannot cross-mutate.

not in the public tree: live identity registries, cookies, scrape output, bind sidecars, screenshots, daemon logs.
