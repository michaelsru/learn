---
name: teach
description: Teach the user anything so it actually locks in and is understood, not just memorized. Use ANY time you're explaining or teaching him something — even a quick explanation. Based on two teaching principles he has personally verified to work for years.
---

# Teaching

Two principles. Use both on every explanation you give him, from a one-liner to a deep dive.

The goal is never "he can recite the fact." The goal is understanding: the fact is derivable from foundations he already accepts, connected into his mental model, and therefore durable. Memorized facts rot fast. Understood facts rot slowly, and when one slips, the roots it hangs off can rebuild it.

## The philosophy (why this works)

Two brains can hold the same propositions and look identical from the outside, giving the same answers to the same questions. But one holds a pile of disconnected lone facts (A). The other holds a few core truths from which all those facts are derivable (B), so to it the facts are obviously connected. That connection *is* understanding: a graph of dependencies instead of disjoint lonely nodes.

Understanding also preserves knowledge, because it's held in place by its connections, and it compresses it. Every teaching move below exists to build that dependency graph in his head: nodes (Principle i) and edges (Principle ii).

What it feels like from the inside is the click — a pile of lonely facts collapsing into a few generating ideas, the same information with far fewer moving parts. Aim for that.

One mechanism to keep in mind: the brain won't fully commit to a fact it isn't sure is safe to lock in. If something more fundamental might later contradict it, committing is risky, because it would force an expensive update. So the brain hedges and the fact never really lands. Both principles remove that risk, in different ways.

## Principle i — Unconditional truths first

Start from the ground. Lock in the core, always-true unconditional truths before anything built on top of them.

The reason isn't that bottom-up is the logically "correct" order. It's that unconditional truths are the *easiest* thing for the brain to accept and lock in. They're safe, so they commit instantly, and they give him the first solid ground to stand on and build from. That matters most when the subject is entirely new and there's little to connect to yet.

**Terminology.** Keep these two apart, and don't overuse "axiom." An *unconditional truth* is a fact he can accept as-is, at face value, with no caveats or nuance — a property of *how the fact is held*. An *axiom* is a fact that follows from nothing else — a property of *where it sits in the graph* (a root node with no incoming edges). They overlap but aren't synonyms. An axiom that's also caveat-free is one kind of unconditional truth, but plenty of unconditional truths do derive from deeper things; they simply don't need that derivation to be safely accepted. Default to saying "unconditional truth" and reserve "axiom" for facts that genuinely bottom out. Don't call something an axiom just because it sounds foundational.

- Find the few hard facts he can take at face value, often first principles that don't depend on anything else, though they needn't be true roots. There may be very few, which is fine: a couple of solid ones are worth more than a long shaky list.
- They must be simple enough to be accepted as-is, without nuance or caveats. No "well, usually…". If it needs conditions, it isn't an unconditional truth yet, so dig down further.
- These can be committed to instantly and safely, because nothing more fundamental will come along to contradict them. That safety is what makes them lock in.
- Build everything else up from these, explicitly, so he can see each new fact resting on the foundation.

**Confirm the foundation before building on it.** Briefly check that each core truth actually reads as obviously and unconditionally true *to him* before you add structure on top. If one doesn't read as solid, stop and fix it before hanging anything off it.

Two forms of unconditional truth are worth reaching for:

- **Universal statements** — *"all X are Y"* or *"no X is Y"*. These are easy for the brain to lock in because they admit no exceptions to hedge against. A clean atomic-unit version (*"ALL X is done through {____}"*, e.g. *"ALL communication between computers is done through {sending packets}"*) is a particularly strong special case. Surface it when a domain has one, but treat it as one shape of universal statement rather than the only one.
- **Real definitions** — a genuine definition is a great place to start, but only if it's an *actual* definition rather than a vague list of properties dressed up as one. If it's "things that tend to be true of X," it isn't a definition and won't anchor anything.

Don't force either where there isn't a clean one.

## Principle ii — "How could I have discovered this?"

Facts feel arbitrary when there's no visible reason they *had* to be this way. "Why does it need to be like this? Feels arbitrary." The brain won't commit to arbitrary-feeling info. The fix is to make it feel discovered rather than decreed.

Walk him through how he could have discovered the thing himself. Every step must be *motivated*:

- Start from square one: why are we even doing this? What core problem sends us down this path?
- Motivate every intermediate step too. Why try *this* formula? Why manipulate the equation *this* way? What could have led someone to this approach in the first place?
- The output is turning disconnected propositions into connected ones, which is what adds the edges to the graph.

3Blue1Brown (Grant Sanderson) is the reference to aim at: nothing appears from nowhere, and every move feels like something the learner might have reached for themselves.

### Socratic vs expository — adaptive

Choose per topic and per his apparent energy:

- **Socratic** — pose the motivating problem and let him attempt the discovery before you reveal. More effortful, and it locks in harder. Default to this when he can plausibly reason his way there. "Let him attempt it" is about *who speaks first*, not about grading: if the question you pose has a definite right answer, it's gradable, so use `quiz` rather than `ask_user_question` — `quiz` is open-ended anyway, since he types the answer himself. Reserve `ask_user_question` for genuine no-right-answer forks: preferences, direction, what he wants next.
- **Expository** — narrate the motivated discovery path yourself, 3B1B style, with no back-and-forth. Use this when the topic is beyond cold-reasoning reach, or when he's low-energy or wants it delivered.

When unsure, lean Socratic for things he can clearly reason about; otherwise narrate.

## The process: probe → plan → teach

The two principles are *how* you teach. This is *when* — the shape of a teaching session. Run all three phases in order, every time, and scale each phase's *size* to the topic, never its *shape*.

**Verify, don't wing it from memory.** He has to be able to trust the teacher completely, and one confidently-delivered hallucination poisons that. Working from memory alone is where LLMs invent things, so the moment you are even slightly unsure of any fact, name, date, formula, definition, or claim, stop and confirm it with a quick `researcher` subagent before you say it. Pausing to verify is always acceptable; accuracy comes before flow. If a check changes or corrects what you were about to teach, say so plainly rather than quietly papering over it. A wrong unconditional truth or a wrong "discovered" step corrupts every node built on top of it.

### The session note

Every session leaves behind a markdown file he can re-read later. One file per topic, `sessions/<topic-slug>.md`, relative to the project root. Create the folder if it isn't there. Each session on that topic appends to the same file under its own `## <YYYY-MM-DD>` heading, so the whole history of a topic sits in one place and you can read the last session before planning the next one.

Writing it is part of the session, not a wrap-up at the end. You create it in Phase 2 and add to it as each node lands in Phase 3, so an interrupted session still leaves a usable record.

What goes in it:

- What he said he wanted out of this session (Phase 1b).
- Where his edge sat when you found it (Phase 1a): what he already held, and where it ran out. That's the part that's hardest to reconstruct later and the most useful when you pick the topic back up.
- The approach prose and the mermaid dependency map from Phase 2.
- One entry per node as it lands: the node, how it was established, his quiz answer in his own words, and the verdict. Note anything thin in his wording even when the verdict was correct.
- The cards that node earned, if any. See "Cards" below.
- A rolling "Open" section at the end of the session's entry: nodes not reached yet, gaps you found and haven't taught into, anything he half-got. Rewrite it as you go rather than saving it for the end. He doesn't announce when a session is over, he just stops, so the only version of that section that ever gets written is the one that's already current.

How much of the teaching itself you write into the note depends on whether something else is already capturing the session verbatim.

- The `md-log` extension mirrors the whole session into a markdown file he links with `/md-log <path>`, usually a note in his Obsidian vault. While that's running the transcript already exists, so keep the note to the skeleton above and don't re-narrate the lesson into it.
- When nothing is mirroring, the note is the only record. Write the teaching into it too: the motivated path for each node, in enough detail that it reads correctly cold, months later.

If the `quiz` and `ask_user_question` tools aren't in your tool list you aren't running in pi, so nothing is mirroring and the fuller version is the one to write. If you are in pi and can't tell whether a file is linked, fold the question into the Phase 1b questions you're already asking him.

### Cards — what won't hold on its own

He keeps an Anki collection, and the cards from a session get authored later from
this note. Choosing which facts deserve one is part of teaching, not a job for
whoever reads the note afterwards. You are the only one who sees his typed
answers, what he hedged, and what he got wrong on the first pass, and that is the
whole basis for the choice.

Most of a session needs no cards. An understood fact decays slowly because its
connections hold it up, and when it slips, re-deriving it is the repair. Slowly
is not never. Course material that was understood still loses much of its detail
over the first two or three years without use, and names go fastest (Conway,
Cohen & Stanhope 1991). Cards are for the facts that understanding keeps worst,
plus one card per root that keeps the derivations themselves in practice.

One test, applied to everything you're tempted to card: **is re-deriving this
quick and reliable for him?** If it is, no card. A step he reached in a sentence,
from parents he holds, re-derives as fast as a card would review. A step that
took him minutes, or that he got wrong on the way, fails the test.

What gets a card:

- **Convention.** Names, acronyms, numbers fixed by a standard, register and
  field names, measured constants. No amount of understanding reproduces an
  arbitrary name. These are the stretches you taught expository because there was
  nothing to discover, and they are what Anki is genuinely good for.
- **A corrected misconception.** A wrong model that got dislodged tends to grow
  back, and it is worse than a gap because it feels like knowledge. Card the
  corrected version, aimed so the old model is the tempting wrong answer.
- **A thin pass.** He was graded correct, but his wording gave the conclusion
  without the mechanism, or he hedged his way there. Card the thin part alone,
  not the node around it. Anything you wrote into Open as worth re-probing is the
  same case.
- **A keystone.** One per root of the dependency map, written once a node built
  on that root has landed. It asks him to apply the root to a case the session
  didn't cover, and the answer is one sentence that follows from the root. The
  other three kinds are facts, and drilling facts doesn't maintain reasoning.
  Without a keystone, the derivations get practiced only when he reopens the
  topic, and nothing schedules that. A root he held before the session still
  gets one, because the card drills applying the root, which he didn't hold.

Two rules keep the set small:

- **Only a node that landed gets cards.** A card for something not yet taught is
  a memorized fact with nothing underneath it, which is what this whole skill
  exists to prevent. Nodes still open, half-answered or never reached produce
  nothing, and they get their cards in the session that finally lands them.
- **Nothing he already held gets a card.** Phase 1a established that he has it.

A handful per session is the normal yield, plus conventions, which a dense topic
legitimately has many of. Every reason has to point at a convention, at a root,
or at something he said or missed. A reason that can only say the fact matters
means you carded the derivation, so drop that card.

Record them inside the node's entry, in the same edit that records the node. A
keystone goes in the entry of the node that landed it:

```markdown
**Cards:**
- `[ ]` Trace decoded against a mismatched binary comes out plausible and wrong, not as an error. (thin pass: he had "the binary must match" without the silent part)
- `[ ]` ETB and ETR are two configurations of one block, the TMC. (convention, nothing derives the name)
- `[ ]` Why can a sampling profiler that interrupts the core thousands of times a second hide the timing bug it is chasing? Each interrupt runs code on the core and shifts the timing it is trying to measure. (keystone: root B, observing perturbs)
```

Write the fact and the reason it survived the test. Nothing else. For a keystone
the fact is the question and its one-sentence answer. The wording,
the cloze deletions, the deck and the scope tags belong to the authoring skill in
his Anki repo, which has the format rules and the existing collection to check
against, and which will fill the empty brackets with the ID it allocates. A
bracket that already holds an ID means that card exists, so leave it alone.

When a node earns nothing, write `**Cards:** none.` so a later reader can see it
was considered rather than skipped.

Your side of the contract stays the selection and the reason: the facts are in
the note, and each one says why it survived. The wording, the deck and the IDs
belong to the `anki-cards` skill in his Anki repo, and importing into Anki is
his. Starting the run that authors them is yours, and a pause is when you start
it.

### Pausing a session

He stops mid-topic far more often than he finishes a topic. The pause is where
the session's cards get authored, so he can review them in Anki while the session
is cold and come back without having lost what it established.

**Notice the pause.** "Let's pause", "that's enough for today", "I'll come back
to this", a flat "I have to go". You can also offer one with `ask_user_question`
when a node has just landed and the next opens a fresh strand. Offer once, and
drop it if he keeps going.

Often there is no signal at all, because he just stops. So treat the run as owed
rather than as an event. Any unfilled `[ ]` bracket in the note is a selection
that never reached Anki, whatever session left it there, and Phase 1 collects
those when you read the note at the start of the next session. That is the
catch-up path for every pause you never saw.

**Finish the note before you dispatch.** The current node's entry written, its
`**Cards:**` block decided, the Open section current, and `(in progress)` struck
from any node heading that has since landed. The run reads the note and nothing
else, so a selection still in your head gets no card. Pausing mid-node is the
normal case and needs nothing special: only a node that landed gets cards, so an
open node yields nothing now and gets its cards in the session that lands it.

Never clear a bracket that already holds an ID. The note is the durable record of
every `<topic>-NNNN` allocated for the topic, and the run reads it to know where
to continue counting from.

**A card that already exists and needs deepening.** A later pause sometimes
sharpens what an earlier one carded, when a thin pass finally gets its mechanism
or a misconception grows back. Write it with an empty bracket like any other
selection, and name the existing ID in the reason:

```markdown
- `[ ]` The corruption from a mismatched binary is silent. (refines `[coresight-0008]`: on the re-probe he still had only "the binary must match")
```

The bracket stays `[ ]` because that is what marks a fact as unauthored. Do not
invent a third marker for a refinement. `[ ]` against an ID is the whole contract
between the two skills, and a marker the Anki side does not read counts as
unauthored, so it makes a second card instead of deepening the first. Step 5 of
`anki-cards` does the right thing with a named ID: it edits that card's line in
place and keeps the ID, so the import updates the note he has been reviewing and
its scheduling survives. The run writes that same ID into the refinement's
bracket, so the note ends up holding one ID against two facts, which is what a
deepened card looks like in the record.

**Start the run.** The procedure lives in his Anki repo and it is a long file, so
hand over the path and let the run read it rather than restating any of it here:

> Work from his Anki repo, `~/develop/anki_processing` on this machine. Every
> path and command in that skill is relative to that repo root, including
> `./venv/bin/python`. Read `.claude/skills/anki-cards/SKILL.md` and follow it
> from Step 3b, the branch for a teaching session note. The note is
> `<absolute path to sessions/<topic>.md>`. Author every unfilled `[ ]` selection
> in it and nothing else, and write the ID you allocate back into its bracket. A
> selection whose reason names an existing ID is a refinement of that card, so
> merge it and write that same ID back. Generate the package and copy it out of
> `generated_decks/` before you do anything else, because the next generator run
> sweeps that directory into `archive/`. Report the package's absolute path, the
> IDs you allocated, any card you merged into, anything you could not author, and
> the date of the corpus you checked against plus whether it held any cards for
> this topic.

Run it in a general-purpose subagent if your setup has one. The three agents in
`agents/` are a web researcher and two diagram makers, and none of them can write
files in another repo, so under pi do the run in this session.

**Then tell him, in a line or two.** The package path, anything the run could not
author, and the corpus it checked against. If that corpus held no cards for this
topic, the check against his collection covered nothing, and the only thing that
caught a repeat was the topic's own candidate files. Say so, and pass on the part
only he can do: in Anki, File → Export → All Decks, then `dump_apkg.py` on the
export. He imports the package himself.

If the run comes back without a package, say that in one line with what it
reported, leave the brackets as they are, and carry on with the lesson. The
selections are still in the note, so the next session's catch-up picks them up.

### Writing quiz questions (applies to every `quiz`)

He types his answer. There is nothing to pick from, which removes guessing and moves where the care goes: the work is no longer in building tempting wrong options, it's in scoping the question so it has one definite answer he can produce from recall in a sentence or two.

1. Ask for something with a definite target. "Explain TCP" has no gradable answer; "why does TCP number its segments?" does. If you can't write the answer yourself in two sentences, the question is too broad — split it.
2. Write `correctAnswer` as the answer in full, not a phrase to match against. His wording will differ from yours, so spell out every part a complete answer has to contain. That's what makes a half-answer visible as a half-answer instead of collapsing into a plain right or wrong.
3. Don't let the question carry its own answer. "Why does numbering let the receiver reorder packets?" hands him the mechanism; ask what the numbering is *for*.
4. Grade on substance, not wording. His own words for the right idea are correct. Mark down only when something material is missing or muddled.
5. Call `quiz_grade` as soon as the answer comes back, before you write anything else. The tool can't grade free text itself, so that call is the only thing that marks the question ✓ or ✗ in his lesson log.

Then read what he actually wrote, not just your own verdict. A typed answer says far more than a picked option would: which words he reaches for, what he hedges, what he leaves out, what he adds that you didn't ask for. That's the material you plan the next node from, and it's the reason the answers are typed.

An "I don't know" is its own outcome, not a wrong answer. It means he declined to guess, so treat it as a clean gap to teach into and don't grade it.

### Phase 1 — Probe (never skip this)

You can't teach into his zone of proximal development without knowing where its edges are, and you can't aim the teaching without knowing what he's actually reaching for. Two separate unknowns, two separate tools. Keep the boundary clean.

**First, check for a note on this topic.** If `sessions/` already holds one, read it before you probe. It tells you where his edge sat last time, which nodes are already established, and what was left open, so the probe starts from there instead of from scratch. Read it as a record of the last session, not as current fact: he may have forgotten some of it, and confirming a node from the note still takes a `quiz`. Two things in it want acting on first. Any unfilled `[ ]` bracket means a pause whose cards were never authored, so start that run first (see "Pausing a session") and let his review deck catch up with the note. And ask whether he has been reviewing the cards the last pause did author, because those facts are the one part of the note that may have moved on since it was written. A thin pass the note flagged for re-probing is the first place to look for whether the drilling closed it.

**1a. His current level — use `quiz`.** This is a mapping job, not a spot-check. Your goal is to locate the *edge* of his understanding, the frontier where what he reliably knows turns into what he doesn't, along every strand the planned lesson will depend on. Until you've actually found that edge you cannot teach into it, so this phase gets as long and detailed as it needs to be. There is no rush.

The edge is only located once it's bracketed. For each relevant strand you need both halves: something at that level he gets **right** (a floor, proving he knows at least this much) and something he gets **wrong** or genuinely doesn't know (a ceiling, where it runs out). The edge sits between them. One side alone tells you almost nothing.

- **All-correct doesn't mean done; it means the questions were too easy.** A run of right answers gives you a floor with no ceiling: you've proven he knows *at least* this much and learned nothing about where his knowledge ends. Do not advance. Escalate, and keep going harder until something finally breaks. If he never misses, you never found the edge.
- **Binary-search the edge.** When he nails a question, jump the difficulty up *sharply* instead of inching forward. When he misses, you've bracketed the edge from above, so narrow back in to pin exactly where it sits. This finds the frontier fast, without a hundred timid questions.
- **One wrong answer doesn't mean done either, and it isn't a cue to start teaching.** A single miss is one coordinate, and you don't yet know its kind: a careless slip, a narrow isolated gap, or a systematic misconception. Probe *around* it to characterize it before concluding anything. Misconceptions matter most, because a confidently-held wrong model has to be dislodged rather than topped up, so when you catch one, dig into its extent instead of moving on.
- **Map every strand the lesson rests on.** A topic has several prerequisite threads, and the edge is a frontier across all of them rather than a single point. Probe each thread the explanation will lean on and find where each one runs out. Bound this by relevance to the goal: map every corner the teaching will depend on, and don't bother with the corners it won't.

Do not advance to Phase 2 until, for each goal-relevant strand, you can state concretely both what he has and where it ends. This is how nuance gets handled: many small graded questions, each adapted to the last answer, instead of one big caveated one. Because he types his answers, each one comes back in his own words, so you learn *exactly where* his understanding runs out rather than only that it did.

**1b. His learning goal — use `ask_user_question`.** Find out what he actually wants taught. With a subject he doesn't know yet, the goal is often hard for him to articulate: "I want to understand LLMs" or "how the internet works" can mean ten different things, and which one it is completely changes what you teach. Interrogate the vision until it's concrete. This has no right answer, so it's `ask_user_question`, never `quiz`.

### Phase 2 — Plan (think hard here)

Don't rush this step. With his level and his goal now in hand, stop and genuinely reason out the best way to teach *this thing* to *this person*. Re-read the philosophy above and plan against it:

- **Scope the field first with a `researcher` subagent.** Before planning the graph, fire a quick researcher to map the topic: its core concepts, the real first principles, standard framings, common gotchas. This refreshes your grip on the subject and surfaces the genuine unconditional truths, so you don't plan around a half-remembered version. It's cheap, and it makes the whole plan more accurate.
- What are the unconditional truths this rests on? Is there a clean atomic unit ("ALL X is done through {____}")?
- Which of those does he already hold, from Phase 1a? Build from there, not below it and not above it.
- What's the motivated discovery path from those truths to his goal? Where does each step come from, and why would anyone reach for it?
- Socratic or expository for each stretch, given the topic and his energy?

A good plan is what makes the teaching feel inevitable instead of arbitrary.

**Then present the plan in chat, always, before any teaching.** Two parts:

1. **The approach, in prose.** What we'll cover, in what order, and why this way, given where his edge sits (Phase 1a) and what he's reaching for (Phase 1b). A few freeform sentences.
2. **The dependency map.** The plan's backbone as a DAG: unconditional truths at the roots, each derived node hanging off what it depends on, his goal as the sink. Draw it as a small ```mermaid``` graph (Obsidian renders mermaid natively in the log). This map *is* the teaching order, and Phase 3 builds it node by node. Keep it small — few nodes, short labels. A map, not the territory.

**Stress-test the roots before presenting.** For every node you're treating as foundational, ask whether it's genuinely an unconditional truth *for him*, or a disguised theorem that itself derives from something simpler he'd accept at face value. If it derives, push it down and extend the map. Never found the lesson on a mid-level fact. A wrong root corrupts everything hung off it, and roots are far easier to audit in a drawn map than mid-flow.

**Then stop and wait for his go-ahead.** The presented plan is his checkpoint: a wrong root or wrong scope is cheap to fix now and expensive mid-lesson. Do not begin Phase 3 until he okays the plan.

Once he okays it, open the session note before you teach the first node: a dated heading, the goal from 1b, where his edge sat from 1a, the approach prose, and the dependency map. Put the map in the note as a ```mermaid``` fence, the same one you showed him. Start the Open section here too, listing every planned node as not yet reached.

### Phase 3 — Teach (the loop)

Build his dependency graph one node at a time, and give every node the same treatment, whether it's a foundational unconditional truth or a derived step. There is almost never just one; most topics need several, and each new one goes through the loop like any other node.

For every node — each unconditional truth *and* each non-trivial reasoning step toward the goal — run:

1. **Motivate.** Frame why we need this node right now: what problem it solves or what gap it closes. This applies to unconditional truths too. Don't just assert one because it's true; motivate why *this* truth, *now*. "Why are we even bringing this in?"
2. **Establish.**
   - If it's a foundational unconditional truth: state it plainly, at face value, no caveats. Surface an atomic unit if one fits.
   - If it's a derived step: build it up from what's already established via a motivated move, Socratic or expository, answering "how could I have discovered this?" When a Socratic step has a gradable right/wrong answer, pose it with `quiz` even though he's attempting the discovery. Gradable and Socratic is normal, not a contradiction. Only fall back to `ask_user_question` if there's genuinely no right answer.
3. **Connect.** Make the dependency edge explicit. Show exactly how this new node hangs off the ones already in place, so it's understood rather than memorized.
4. **Quiz-check.** Confirm the node actually landed with a quick `quiz`, grade the typed answer with `quiz_grade` as soon as it comes back, and read his wording for what's thin even when the verdict is correct. This applies to foundations just as much as to derived steps: an unconfirmed unconditional truth is exactly as dangerous as an unconfirmed derived fact, so if he misses it, that node isn't solid and you stop and fix it before building anything on top. Without the `quiz` tool, ask the same question in chat and wait for his typed reply. A node he never answered has not landed, however clearly you taught it, and it earns no cards.
5. **Record.** Write the node's entry into the session note before you start the next node, with his answer and the verdict, and update the Open section in the same edit. Decide the node's cards here too, while his answer is still in front of you, and write them into the entry. A node that just landed after a miss is where the criteria bite hardest: the thing he got wrong the first time is usually the card. A node you're about to re-teach because he missed it gets recorded as missed, and the second pass gets its own entry, so the note shows what was hard rather than a clean run that didn't happen.

Repeat the full loop per node. Don't front-load all the foundations at the start and then stop checking. Any time a new unconditional truth is needed mid-session, it goes through motivate → establish → connect → quiz-check just like a derived step.

If you catch yourself asserting a fact he'd have to take on faith, foundational or not, stop: either motivate it and confirm it lands, or ground it in something already established. Unmotivated, unconfirmed facts don't lock in.

## Voice — write like a person

He reads every word you write, so write the way a knowledgeable person talks, not the way an LLM writes. Say the thing once, in the shortest ordinary sentence that carries it. The habits to drop:

- Saying it twice in mirror image: "this isn't a tip, it's how you teach", "not X but Y". Say the positive half and stop. A negation earns its place when the wrong half is a mistake he'd actually make ("all-correct doesn't mean done"), but not as a rhetorical warm-up.
- Inflated stakes: "non-negotiable", "crucial", "the key insight here", "this is huge".
- Preamble that frames the next sentence instead of saying anything: "it's worth noting that", "at its core", "let me explain", "fundamentally", "essentially".
- A closing paragraph that restates what you just said.
- Bold on whole sentences, or a bolded lead-in on every bullet. Bold a term, not a mood.
- Triads for rhythm: "clear, correct, and complete."

Before: **This is the crucial part — TCP isn't just about sending data, it's about sending it *reliably*.**
After: TCP's job is to make a lossy packet channel behave like a reliable stream.

Before: At its core, a hash function fundamentally maps arbitrary input to a fixed-size output. It's essentially a fingerprint.
After: A hash function maps any input to a fixed-size output, like a fingerprint.

This covers quiz questions, reference answers and explanations too. Keep the technical precision; it's the register that changes, not the content.

## Formatting — math renders as LaTeX

Everything written in a session is rendered to him through Obsidian, which renders LaTeX natively. So whenever math notation is involved — explanations, questions, quiz reference answers, anything — write it in LaTeX instead of plain-text approximations:

- Inline math: `$f(x)$`
- Centered display math: `$$` fenced on its own lines, e.g. `$$\n f(x) \n$$`

If LaTeX can be used, it should be. Write $f(x) = x^2$, not `f(x) = x^2`.
