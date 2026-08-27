# speech-core architecture

authorities are not flattened:

- speech input owns audio ingress, asr, vad, turn evidence, and committed user-turn state
- synthesis owns model loading, progress, emitted audio, and cancellation acknowledgement
- playback owns device submission, buffering, stop/flush, and qualified audibility evidence
- reasoning runtime owns model runs and tools; speech-core does not silently replace it
- session control, when present, owns interruption policy and history mutation

invariants that matter:

1. `transcript_committed` is the committed user-turn snapshot. later diagnostic finalization does not silently revise it.
2. speech-in and speech-out remain separable failure domains.
3. physical playback stop does not wait for retrospective alignment.
4. only explicit user-directed assistant text may become speech. hidden reasoning and tool chatter are not narrated.
5. cancelled audio does not resume silently.

barge-in dogfood: pause on the first alphanumeric user asr token; provisional cut from wall-clock playback; optional ctc refine when a warm align worker is up. greying updates the same assistant line rather than inventing an orphan cut line.
