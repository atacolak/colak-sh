# now

late 2026. two live threads.

## speech-core

real-time speech substrate for human-agent interaction.

speech-in is the mature seam: microphone audio becomes committed, immutable turns. speech-out is a separate tts/playback daemon so input and output fail independently. current dogfood is barge-in: playback stops on the first alphanumeric user token, and the assistant line greys spoken vs unsaid.

the interesting claim is not "voice ui". it is that spoken turns can be interruptible, observable, and causally legible.

## browser-ops

lease a cloak browser, then drive one tab over a unix socket.

one chrome process per named face. many tabs can share that process. each tab has at most one writer. agents do not attach puppeteer or a raw cdp url to a shared port; the daemon already holds that connection.

the interesting claim is ownership: a lease is a mutation capability for exactly one tab, and steal is operator recovery, not an agent verb.

## also

long-lived fork work on oh-my-pi: keeping upstream main pristine, isolating local capabilities, and composing a daily runtime without mixing personal config into public patches.
