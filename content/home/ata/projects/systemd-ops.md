blurb: inspect, control, and author systemd. writes only through plan/apply

# systemd-ops

origin: [github.com/atacolak/systemd-ops](https://github.com/atacolak/systemd-ops)

inspect, control, and author systemd.
cli first, optional mcp.
writes exist only through plan/apply.

three rules, enforced in code:

1. no write prefix means reads still work and writes are refused. there is no implied namespace.
2. mutations go through a sealed plan token. stale, wrong class, or the other manager: refused.
3. the mcp frontend grants nothing by default. without `--grant`, tools are not advertised.

honest limit: no libsystemd, no dbus library, no async runtime.
the cli default is the user instance.
