origin: https://github.com/atacolak/voicecat
language: Python
updated: 2026-08-27

# voicecat

the **call**. speech-core is the ear and mouth. a headed omp TUI is the brain. this repo is the phone line between them.

you speak → one committed user turn → one spoken reply you can hear.

law: [CHARTER.md](https://github.com/atacolak/voicecat/blob/main/CHARTER.md). one live audio path at a time.

```text
you (browser or phone)
        │
        │  SmallWebRTC /desk     or     PCM /ws-phone
        ▼
   voicecat  (this process)
        │  16 kHz PCM in
        ▼
   speech-core     VAD / ASR / turn close
        │  transcript_committed
        ▼
   CollabGuestService "desk"    write-guest on omp collab
        ▼
   headed omp TUI               (the only jsonl writer)
        │  assistant text as it lands
        ▼
   speech-out leftover          first sentence = speak, rest = append
        │  progressive PCM
        ▼
   voicecat handset             desk speakers  or  phone earpiece
```

this process does **not** spawn omp. it joins a collab write-link file. missing file → fail closed (`collab_link_missing`).

## three pieces

| piece | repo | owns | does not own |
|---|---|---|---|
| **call** | this checkout | transport, PCM hop, collab guest, hear | VAD, ASR, TTS weights, session history |
| **ear + mouth** | sibling `speech-core` | speech-in daemon, leftover TTS | omp, `/desk` |
| **brain** | an omp world overlay | headed TUI, collab host, autoStart link file | speech daemons, webrtc |

omp `collab.autoStart` is opt-in ([can1357/oh-my-pi#9833](https://github.com/can1357/oh-my-pi/pull/9833)). default off. the overlay turns it on and writes the link file.

## run

1. start the headed omp TUI in the talker world so autoStart mints a room and writes the link file (default `~/.local/state/talker/collab.link`).
2. speech-core and speech-out must already be up.
3. start this process:

```bash
cd python
VOICECAT_ENV=$HOME/.config/voicecat/runtime.env \
  .venv/bin/sdc-pipecat-webrtc
```

loopback by default: `http://127.0.0.1:7860/desk`. allow mic, **Connect**, speak.

phone APK talks to the same process on `/ws-phone`. connecting phone **replaces** desk.

TUI restart mints a **new** room. restart this process so it re-reads the link file.

## remote desk

loopback is only reachable on the machine that binds it. for a browser on another host:

1. bind the runner to an address that host can route to (`VOICECAT_WEBRTC_BIND_HOST`, not `127.0.0.1`).
2. if a TLS reverse proxy terminates HTTPS in front of the runner, set `VOICECAT_WEBRTC_PUBLIC_HOST` to that hostname. the proxy is TCP/HTTPS only.
3. WebRTC RTP still needs a reachable ICE host candidate. set `VOICECAT_WEBRTC_ICE_HOST` to the same routable IPv4 the browser can send UDP to. otherwise the page loads and Connect hangs.

do not put overlay IPs or private hostnames in this repo. they belong in the operator env file.

## env

| env | meaning |
|---|---|
| `VOICECAT_ENV` | optional `KEY=VALUE` file (default `config/local.env`) |
| `VOICECAT_WEBRTC_BIND_HOST` | listen address (default `127.0.0.1`) |
| `VOICECAT_WEBRTC_ICE_HOST` | host ICE rewrite for remote browsers |
| `VOICECAT_WEBRTC_PUBLIC_HOST` | hostname printed for a TLS front |
| `VOICECAT_COLLAB_LINK_FILE` | write-link file; fail closed if missing |
| `CPA_API_KEY` | inference proxy; required |
| `SPEECH_CORE_WS_URL` / `SPEECH_OUT_WS_URL` | ear and mouth websockets |

secrets stay in the operator env file and `$XDG_CONFIG_HOME/voicecat/config.json`. never commit them.

## leftover (the mouth)

speech-out protocol:

1. first speakable unit of a turn → `{type:speak}`
2. later units of the **same** utterance → `{type:append}` (one pending continuation)
3. PCM already leaving while later text is still arriving

a leftover barge writes sidecar JSONL (`barge` then `barge-cut`). the TUI paints a custom row. committed user text is the only collab prompt.

## if it does not answer

- `ss -ltn` shows the bind host and port `7860`
- speech-core and speech-out up
- page **Connected**, not just loaded
- talker TUI footer reports the local collab relay and a fresh link file
- after a TUI restart, this process was restarted too

## read

| file | use |
|---|---|
| [CHARTER.md](https://github.com/atacolak/voicecat/blob/main/CHARTER.md) | law |
| [docs/BOARD.md](https://github.com/atacolak/voicecat/blob/main/docs/BOARD.md) | map |
| [docs/SEAM-LATENCY.md](https://github.com/atacolak/voicecat/blob/main/docs/SEAM-LATENCY.md) | measured lag |
| [spec/](https://github.com/atacolak/voicecat/blob/main/spec/README.md) | accepted requirements |
| [android/README.md](https://github.com/atacolak/voicecat/blob/main/android/README.md) | phone PCM client |
