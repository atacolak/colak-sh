blurb: persistent engineering actors so the operator is not the message bus

# actor village

the system currently spans several local/public components rather than one standalone repository.
this page is the public artifact.
there is no actor-village github dump on purpose.

persistent leads own one project each.
they keep a beads ledger, a cockpit pane, and an operator mailbox.
independent work mints a sibling lead.
workers are ephemeral.
the operator is not the router between them.

```text
ata
  herdr cockpit
    mardi-gras board     beads as a tree
    lead panes           one persistent actor each
      beads (br)         work truth
      hcom               mail between leads
      omp runtime        the fork that hosts them
  talker                 spoken attention, later
  systemd-ops            inspect/control user units
```

public pieces, origin links only:

- omp fork: [github.com/atacolak/oh-my-pi](https://github.com/atacolak/oh-my-pi) (upstream [can1357/oh-my-pi](https://github.com/can1357/oh-my-pi))
- hcom: [github.com/atacolak/hcom](https://github.com/atacolak/hcom)
- systemd-ops: [github.com/atacolak/systemd-ops](https://github.com/atacolak/systemd-ops)
- mardi-gras: [github.com/atacolak/mardi-gras](https://github.com/atacolak/mardi-gras)
- speech-core: [github.com/atacolak/speech-core](https://github.com/atacolak/speech-core)

the rest (project scopes, beads conventions, actor-bridge, cockpit recycle) is local runtime machinery.
screenshots of the live cockpit live on the mardi-gras origin, not inlined here; the exhibit strips figures.

honest limit: this is a running village, not a product you npm install.
if the architecture ever stabilizes into a monorepo, that can happen later.
tonight this page is the canonical public shape.
