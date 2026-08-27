# stack

not a shopping list. the tools that keep showing up:

- rust and python for speech-core daemons and adapters
- typescript for agent tools, omp seams, and this site
- cloak / chromium behind a leased daemon, not raw cdp in the model
- unix sockets and explicit leases instead of "just attach to the port"
- just-bash + wterm in the browser for public terminals that must never be a host pty
- systemd user units for local daemons; git and beads for work that has to stay replayable

preferences: typed contracts, failing tests before the implementation, no silent fallbacks, no credentials in client code.
