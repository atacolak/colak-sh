# me

github: atacolak
x: reward_hacker

hi, i'm ata.
i build agent infrastructure and speech systems, then keep them honest about what they actually own.

these days i spend a lot of my time in the spec and architecture layer.
with coding agents getting better, i've found that the harder part is often deciding what should exist, where its authority lives, and how we'll know it actually works.
i let agents do a lot of the implementation, but i stay very involved in the design, verification, and the ugly cases they uncover.
i do not pick a language first, and i do not bound myself to the ones i already know.
the constraint is the design, not whether i already speak the syntax.

when i do pick a language, the bias is simple:

- python or javascript when i want to iterate fast and see results
- rust when the thing is long-lived, systems-y, or needs tighter correctness/performance constraints

the rest of the toolbox shows up because the work asked for it.
rust in speech-core, systemd-ops, and hcom.
python in voicecat and browser-ops.
typescript in this site, oh-my-pi, and the agent seams.
go in mardi-gras.
a little c++ in speech-out.
shell and systemd glue the runtime together.

what i care about, language aside:

- i want to be able to inspect what the system actually did when something goes wrong.
- i really dislike ambiguous ownership. if two things can mutate the same state, i want to know exactly why.
- i usually start with the smallest seam i can get away with and let the system grow from actual use.

the live thread is actor village: persistent engineering actors so the operator is not the message bus.
i fork and contribute around oh-my-pi, keep local capabilities isolated from upstream, and care more about inspectable seams than demos that only work once.

if you want the work, start in now.md and `projects/`.
actor-village.md is the system page.
speech-core and talker are the spoken seam.
mardi-gras and systemd-ops are how the village is watched and how units get authored.
i'm glad you came by.
