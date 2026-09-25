blurb: realtime speech substrate. immutable turns

# speech-core

origin: [github.com/atacolak/speech-core](https://github.com/atacolak/speech-core)

spoken agents usually fake turn-taking.
this one treats a turn as a product object: once closed, it is immutable.
late punctuation does not rewrite what you already saw.

```text
speech-in   → microphone audio → transcript + turn events
speech-out  → text → audible speech
agent loop  → decides what to do with a completed turn
```

ear and mouth stay in separate processes.
their failure modes differ, and mixing them makes barge-in dishonest.
`transcript_committed` is the snapshot controllers may dispatch on.

honest limit: speech-out text-in is one complete speak, not a live token bitstream.
the live call is voicecat.
talker is the spoken attention consumer for the village, not this repo.
