# speech-core

real-time speech substrate for human-agent interaction.

```text
speech-in   → microphone audio → transcript + turn events
speech-out  → text → audible speech
agent loop  → decides what to do with a completed turn
```

## why it exists

spoken agents usually fake turn-taking. speech-core treats a turn as a product object: once closed, it is immutable. late punctuation does not rewrite what the operator already saw. `transcript_committed` is the authoritative snapshot; later finalization is diagnostic.

speech input and speech output stay in separate processes. their failure modes differ, and mixing them makes barge-in and cancellation dishonest.

## what works

- speech-in daemon: pcm in, nemotron asr, silero vad, smart-turn v3 endpointing
- speech-out daemon: tts plus playback, with cancellation that actually stops audio
- dogfood barge-in: cut playback on first alphanumeric user token; grey the original assistant line
- adapters for live mic and wav replay

## honest limits

- speech-out text-in is one complete `speak`, not a live token bitstream
- live dual self-asr and experimental position tracking stay off by default
- this filesystem is a public sketch, not the private runtime

read `architecture.md` if you want the authority cut.
