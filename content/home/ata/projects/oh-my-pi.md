blurb: long-lived oh-my-pi fork. contributions, not a checkout

# oh-my-pi

origin: [github.com/atacolak/oh-my-pi](https://github.com/atacolak/oh-my-pi)
upstream: [can1357/oh-my-pi](https://github.com/can1357/oh-my-pi)

long-lived fork of [can1357/oh-my-pi](https://github.com/can1357/oh-my-pi).
upstream `main` stays pristine.
local work lives on isolated `cap/*` branches and composes into a daily `runtime`.
this file is the contribution surface, not a checkout of the tree.

the fork is also the host for actor village: persistent leads, hcom, beads, and the cockpit sit on this runtime rather than a separate product repo.

open: [lsp nested roots](https://github.com/can1357/oh-my-pi/pull/9969), [collab autostart](https://github.com/can1357/oh-my-pi/pull/9833), [hindsight append](https://github.com/can1357/oh-my-pi/pull/9367), [retain strategy](https://github.com/can1357/oh-my-pi/pull/9365), [project-scoped settings](https://github.com/can1357/oh-my-pi/pull/9363), [stop a provider login from killing the session](https://github.com/can1357/oh-my-pi/pull/12271).

merged: conversation timestamps, the `/extensions` inspector, hidden custom tools, cursor requestContext rules, shared-role retry fallback, subagent hud labels, birch contrast, tokenizer unknown-encoding fallback, tui `/copy` outline fold, tui keep composer on inbound extension user messages.

honest limit: the interesting claim is the topology, not a 512mb dump of someone else's agent in this shell.
