blurb: spoken attention. the ear for the village, not a second bus

# talker

speech-core is the ear and mouth.
talker is the human-facing consumer of what the village is doing.

you ask what is going on.
it should compress project summaries, actor attention, reports waiting on ata, and important runtime events.
it should not scrape mail, beads, or journals to fake that picture, and it should not clear another actor's mailbox just because it read it.

```text
you → voicecat → speech-core → talker → leftover speech-out
                         ↑
                   actor / project surfaces
```

the system currently spans several local/public components rather than one standalone repository.
talker is a local overlay on the omp runtime.
there is no public talker git origin yet.

honest limit: the product overlay that speaks live village attention is still waiting on shared producers.
leftover is still the mouth.
this pamphlet is the claim, not a checkout.
