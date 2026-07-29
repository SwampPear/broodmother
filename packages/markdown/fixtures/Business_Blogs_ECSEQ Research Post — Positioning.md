# ECSEQ Research Post — Positioning

*How the public research post should be written so it showcases the research credibly and reads well to YC. Companion to [[ECSEQ Research Post]] (the content), [[Throughput & Competitive Landscape]] (market evidence), and [[Risks & Kill-Criteria]] (the derisking spine). Status: DRAFT, 2026-07-20.*

---

## The core tension

The post has to do two jobs that pull in opposite directions.

**As research**, it earns credibility by being unusually honest about what is simulated and what is measured. Technical readers in sequencing have watched a decade of platform announcements overpromise; the fastest way to lose them is a confident number with no provenance.

**As a YC-facing artifact**, it has to answer the question a partner actually asks about a pre-hardware company: *not* "does it work" — nobody can know that yet — but "**are these the people who will find out fastest, and will it matter if they're right?**"

> [!IMPORTANT]
> These jobs are not actually in conflict, and that is the key insight. The honesty *is* the pitch. A pre-registered kill criterion is simultaneously good science and the single most investor-legible signal that founders understand their own risk. [[Risks & Kill-Criteria]] is currently the strongest asset the company has for this purpose and it is not visible in the public post.

---

## What the current post already does right

Keep these — they are the post's real differentiators, and most technical company blogs lack them.

- **Names the load-bearing uncertainty explicitly.** "Here is the part that has to work" before the discrimination axes is exactly the right move.
- **Separates simulated from measured, up front and unhedged.** "Every number below comes from a physics simulator, not a chip... They do not say anything yet about a physical device."
- **Reports a negative/ablation result.** The with/without-faradaic table is the most credible thing in the post, because companies do not usually publish the axis that only helps a little.
- **Argues from error *structure*, not error *rate*.** "The residual error has exactly the structure the signal model predicts" is a far stronger claim than 89.6%, and it is the argument a skeptical electrochemist would want.
- **Ends on what is unknown**, with a concrete next experiment.

---

## What to add

### 1. A "why now / why this is worth doing" opening beat

The post currently opens on mechanism (labels and washes). It never says how big the prize is. A YC reader needs the stakes in the first screen.

The material already exists in [[Throughput & Competitive Landscape]] §2.1–2.2 and is properly sourced: incumbent instruments run \$289k–\$1.25M, a 30× genome costs ~\$100–345 in reagents *at maximum scale on the largest flow cell*, and every run burns a consumable flow cell (Illumina 25B kit \$11.7k–14.5k). The structural point is the one to lead with: **cost and runtime are direct consequences of optics plus a single-use flow cell plus a per-cycle wash — the three things this architecture deletes.**

> [!NOTE]
> Frame as *structural* advantage, not as a better number. "We think we can be cheaper" is unfalsifiable and reads as bluster pre-hardware. "Their cost is optics and a consumable; we have neither" is an architecture claim a reader can check against our own reasoning.

### 2. The derisking plan, promoted and made concrete

Currently the single-pixel experiment is one closing paragraph in an aside. It should be its own section with the actual decision rules from [[Risks & Kill-Criteria]] — the three pre-registered kill criteria (dephasing, SNR, discrimination-pattern-match) and the explicit note that thresholds are set *before* the run.

This is the highest-leverage addition in this document. It converts "we have no hardware" from a weakness into evidence of operating discipline, and it is genuinely rare in public technical writing.

### 3. Scale honesty about the throughput section

> [!WARNING]
> This is the post's one real credibility gap. The "How long a read can get" section derives 42× coverage and a ~36-minute genome from a **900 mm²** array. The designed chip in [[Whitepaper]] is 960×960 at **3.69 mm²** — roughly 250× smaller — and [[Throughput & Competitive Landscape]] §1.3 states plainly that the 960×960 device "is not a genome sequencer," it is a discrimination demonstrator. The post never marks that jump.

A reader who does the arithmetic will catch this, and catching it retroactively taints the sections that *are* rigorous. Fix by labelling the regime explicitly: the near-term chip is a demonstrator; the genome-scale numbers describe a panel-scale array that is a projection resting on flat-panel economics. Internally this is well-reasoned and well-caveated — the public version should inherit those caveats, not just the conclusion.

### 4. The "AI is the instrument" thesis, stated once, plainly

The post explains the two-stage model but never states the strategic claim: **accuracy is carried by the temporal transformer, so the instrument improves without touching the chip.** No competitor can upgrade a shipped flow cell's chemistry by software. That is the compounding-advantage argument, it is already in [[Throughput & Competitive Landscape]] §2.4, and it is exactly the shape of claim that makes a hardware company interesting rather than capital-intensive and slow.

### 5. Pre-empt the Ion Torrent comparison

Any sequencing-literate reader will think it within a paragraph: the last semiconductor sequencer to market died on homopolymer indels. Raising it first and explaining why the failure mode differs (and where the analogous risk sits — the A↔G / C↔T residual) is far stronger than letting the reader raise it. [[Throughput & Competitive Landscape]] §2.4 already has the argument.

---

## Recommended section order

Reorders the existing material; only §2, §7, and the accuracy-comparison note require new writing.

| # | Section | Job |
|---|---------|-----|
| 1 | Lead — the wash is the bottleneck | Mechanism hook (existing, keep verbatim) |
| 2 | **What it would unlock** | Stakes + sourced market numbers (new) |
| 3 | Why label-free changes the shape of the machine | The insight (existing) |
| 4 | The chip / amplification / three axes | How it works (existing) |
| 5 | The basecaller + "AI is the instrument" | Compounding advantage (existing + one paragraph) |
| 6 | What it does, on simulated data | Evidence, caveated (existing) |
| 7 | **How we find out we're wrong** | Kill criteria (new — promote from aside) |
| 8 | What we do not know yet | Honest bounds (existing) |

---

## Rhetorical rules

**Claim:**
- Architecture and its consequences — no optics, no flow cell, no per-cycle wash.
- Error *structure* matching prediction (stronger than any accuracy number).
- Reusability as a mechanism, stated as a mechanism.
- Speed of learning: what the next experiment resolves and when.

**Disclaim, explicitly and early:**
- Every accuracy figure is simulator-plus-model, not a device.
- The faradaic axis rests on two untested assumptions.
- Dephasing rate is unmeasured; it sets read length.
- 50–100 run reuse is a mechanism, not a measurement.
- Genome-scale throughput is panel-scale projection, not the demonstrator chip. *(currently missing)*

**Never:**
- Put ECSEQ's simulated accuracy in the same table as competitors' demonstrated accuracy without marking the asymmetry. On present evidence ours is the least proven number in the field; a naive side-by-side reads as either naive or dishonest, and both are fatal.
- Imply a shipping timeline. There is no chip.
- Use "revolutionary," "breakthrough," or "disrupt." The architecture argument is strong enough unassisted; superlatives signal the opposite of confidence to this audience.

---

## Credibility traps

> [!WARNING]
> Ranked by how badly each would damage a technical reader's trust.

1. **The 900 mm² jump** (see §3 above) — unmarked scale change in the throughput derivation.
2. **Simulation circularity.** [[Risks & Kill-Criteria]] #5 flags this itself: the model is trained and evaluated on the same simulator, so accuracy partly measures self-consistency. The post says results "measure the model and the simulator together," which is good — but naming the circularity directly is better, and costs nothing given the kill criteria follow.
3. **Per-read vs. per-base vs. consensus.** The post reports 89.6% per-base; [[Throughput & Competitive Landscape]] says ~88% per-read; the product metric is 30× consensus. Three different numbers for "accuracy" invites a reader to assume the most flattering one was chosen. Define the metric once, use it consistently.
4. **Reuse economics stated as fact.** 50–100 runs underpins the entire cost thesis and is a mechanism with no measurement behind it.

---

## Open questions

> [!QUESTION]
> Does the public post state the kill criteria with actual numeric thresholds, or only describe that thresholds exist and are pre-registered? Numbers are more credible but commit us publicly before the baseline-noise measurement that is supposed to set them ([[Risks & Kill-Criteria]] step 1). Recommendation: describe the three criteria and the pre-registration discipline; publish the thresholds when step 1 sets them.

> [!QUESTION]
> Should the research post carry an explicit hiring/contact call to action? It is the highest-signal artifact the company has for recruiting the electrochemist and readout-electronics hire, and YC weights team formation heavily.
