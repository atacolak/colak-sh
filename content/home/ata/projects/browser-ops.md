blurb: lease a cloak browser, then drive one tab over a unix socket

# browser-ops

<img width="720" height="288" alt="knight" src="https://github.com/user-attachments/assets/b8ed1001-82c1-47d8-8013-7ea4aaf38911" />

origin: [github.com/atacolak/browser-ops](https://github.com/atacolak/browser-ops)

lease a [cloak](https://github.com/CloakLabs/cloakbrowser) browser, then drive one tab over a unix socket. one chrome process per named face. many tabs can share that process. each tab has at most one writer.

you do not attach puppeteer or a raw cdp url to a shared port. the daemon already holds that connection. you send one json line per action.

a lease is a mutation capability for exactly one tab. `switch_tab` to a sibling peeks. steal is operator recovery, not an agent verb.

honest limit: cdp stays on localhost. this is ownership machinery, not a general-purpose browser.
