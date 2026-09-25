blurb: the phone line between speech-core and a headed omp tui

# voicecat

origin: [github.com/atacolak/voicecat](https://github.com/atacolak/voicecat)

speech-core is the ear and mouth.
a headed omp tui is the brain.
this repo is the phone line.

```text
you → voicecat → speech-in → headed omp → speech-out → you
```

one live audio path at a time.
desk `/desk` or phone `/ws-phone`.
connecting the phone replaces the desk.
this process does not spawn omp; it joins a collab write-link and fails closed if the file is missing.

honest limit: first sentence is speak, the rest appends.
it is a call, not a speech stack.
