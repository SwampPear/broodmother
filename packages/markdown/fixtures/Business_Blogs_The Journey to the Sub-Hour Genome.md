# The Journey to the Sub-Hour Genome

*The public research post, live at `/research/ecseq-0`. Source of truth is `website/src/content/posts/ecseq-0.tsx`; this is the readable vault copy. Technical basis is [[Whitepaper]]; positioning rules in [[ECSEQ Research Post — Positioning]].*

> [!info] Synced from `ecseq-0.tsx` on 2026-07-27, for a read-through pass.
> Prose below is verbatim from the site — all 42 paragraphs, in site order. **Nothing is embedded.** Every image and every interactive is replaced in place by a bracketed description of what sits there, so the text can be read straight through without the figures loading.

| Field | Value |
|-------|-------|
| Authors | Michael Vaden, Jack Ready, Evan Goldstein |
| Slug | `ecseq-0` |
| Paper | `/research/ecseq-0/ecseq-0.pdf`, refreshed with `npm run sync:paper` in `website/` |
| Also | `The Journey to the Sub-Hour Genome.docx` in this folder, for Drive |

**Excerpt.** A passive electrode array that reads an incorporation electrically, with no label, no camera, and no wash. What that removes, what it costs, and how far we are from any of it working.

**▪ Cover image — ECSEQ-0 end to end** *(`pipeline.png`, 1716 × 803, sits under the title as the post's header art; same diagram as Fig. 1 of the paper).* A wide two-panel schematic. Left, the instrument: one pixel at 2 µm pitch with a ~1,000-copy clonal cluster and a ~1 µm active site, the 62-point EIS spectrum it returns, the passive-matrix shared converter, and an exploded view of the layer stack (polymer / gold / Al₂O₃ / platinum). Right, the decoder: the two-stage basecaller, the four discrimination axes it reads across (perturbation signal, faradaic, kinetic, molecular, plus dwell time), and the outputs — calls in sequence context, the residual concentrating on C↔T, and scaling with compute.

Site caption: *ECSEQ-0 end to end. A passive electrode array performs localized impedance spectroscopy at each pixel; a two-stage decoder turns the 62-point sweep into a base call, with the discrimination carried by three frequency-distinct axes rather than by a label.*

---

Sequencing a human genome takes about a day, and most of that day isn’t spent reading DNA. It’s spent moving liquid.

Nearly every high-throughput platform in use works the same way underneath: attach a fluorescent label to each base, take a picture, wash the chemistry out, repeat. The polymerase itself is fast, incorporating a base roughly every hundred milliseconds. The camera and the fluidics around it are what set the pace, and they’re also what set the price, because precision fluid handling is most of what you’re buying when you buy a sequencer, and a single-use flow cell is most of what you’re buying when you run one.

**Our claim here is structural, not comparative.** Not that we think we can be cheaper, which is unfalsifiable from where we sit, but that the cost and the runtime of the incumbent architecture are direct consequences of three things: optics, a consumable flow cell, and a per-cycle wash. Our design inherits whatever limits its own readout entails, which moves the bottleneck off fluid exchange and onto readout electronics and compute. We think that’s a far safer place for a bottleneck to live, given where AI and computation have gone in the last few years, and our bet is on it mattering less every year.

## What Would Actually Change

A clinician with a critically ill newborn needs an answer within the shift, not within the week. Rapid whole-genome sequencing exists for exactly this case, and the constraint on it is that it runs at a handful of centers on an instrument costing several hundred thousand dollars at minimum. Most infants would never get it. An answer produced on something small enough to sit in a hospital rather than a reference lab is a different clinical object than the same answer produced somewhere else a week later.

On a more speculative note, we think the throughput this compute allows may be what brings us a step closer to a general **genotype-to-phenotype model**. Every genomics dataset we have is small by the standards of the models that would want to consume it, and the reason is cost per sample, not interest. If sequence gets cheap enough, population-scale data stops being a funding decision and becomes the default. Imagine sequencing ten thousand organisms and mapping every one of those genomes against the space of their physical expression. That would change the world.

## The Wash Is the Clock

In a conventional platform the wash does two jobs. It clears the previous cycle’s chemistry so the next base can be read, and it acts as a synchronizer, holding every copy in a cluster on the same clock. Because of that second job, cycle time is bounded below by the fluidics, and everything downstream inherits that bound.

Read the base without a label and both jobs disappear at once. There’s nothing to clear, so all four nucleotides sit in the reaction simultaneously and the polymerase runs continuously instead of one base per cycle. What ECSEQ-0 reads is the electrical disturbance the incorporation itself makes: as a polymerase extends a surface-bound strand, the impedance of the electrode-electrolyte interface shifts, and that shift depends on which base went in. Measuring it by impedance spectroscopy at each pixel is the whole measurement. **Nothing is labeled, nothing is imaged, nothing is exchanged.**

Every pixel stacks a top gold electrode over an anodized Al₂O₃ dielectric over platinum. Gold anchors the DNA and carries the molecular signal, and platinum is the impedance transducer. Two metals rather than one is what makes frequency decomposition available at all: the two interfaces relax on different timescales, so their contributions separate across frequency instead of summing into one indistinguishable response. The array is addressed passively over row and column lines, with no per-pixel circuitry and no basecalling logic on chip.

**→ Interactive 1 — Chip surface** *(`ChipSurface.tsx`).* Two panels side by side. **Left, a static surface:** ten pixels a side, a flat isometric electrode grid at the designed 2 µm spacing, with clonal DNA clusters lying on top, each tinted by the base going in. Occupancy is Poisson at λ = 1, so roughly 37% of tiles are empty, 26% carry two templates and render as a blend belonging to neither base, and only 37% are the clean single clusters the instrument is built to read. Nothing moves. **Right, a live instrument:** hovering (tapping on touch) any pixel points the readout at it and runs a continuous 62-point sweep — a drive tone stepping 100 Hz to 100 kHz, with the Δlog|Z| and Δφ traces filling in point by point behind an acquisition marker, and that base's peak |Z| shift and median dwell called out. Magnitudes and dwell times come from the simulator's held-out set.

Site caption: *Ten pixels on a side, at the 2 µm spacing of the designed chip. Each patch of colour is a DNA cluster, tinted by the base going in. Hover a pixel and the instrument reads it: a voltage is applied at 62 frequencies in turn, and the pixel's own baseline is divided out. Magnitudes and dwell times come from the simulator's held-out set.*

A single molecule doesn’t move the impedance enough to detect, so each landed fragment is copied in place by isothermal bridge amplification: a surface-bound strand arches over, hybridizes to a neighbouring primer, gets extended, and denatures into two bound copies. Iterate and you get a clonal cluster of roughly a thousand identical copies over one pixel. What the sensor reads is the ensemble average of a thousand polymerases doing the same thing at the same time, and amplification runs at the same 65 °C as sequencing, on the same primer lawn the electrode already needs.

**→ Interactive 2 — Pipeline walkthrough** *(`PipelineWalkthrough.tsx`).* One incorporation traced end to end through five clickable stages: **1 Cluster** (the ~1,000-copy clonal cluster on a single pixel), **2 Sweep** (the 62-point impedance sweep it returns), **3 Perturbation** (raw spectra against the baseline-subtracted Δlog|Z| / Δφ the model actually sees), **4 Encoder** (the three physics-motivated branches pooling into one embedding), and **5 Transformer** (the temporal stage reading the whole cluster and calling each base in sequence context). From stage 3 onward a base selector (A/C/G/T) switches which nucleotide is going in, and the dwell for that base is shown alongside. Every curve is simulator output, not a chip measurement.

Site caption: *One incorporation, from a thousand copies of DNA on a pixel through to a base call. Click the five stages. Every curve is simulator output, not a measurement from a chip.*

Anyone who’s followed electronic sequencing is thinking about homopolymers by now, and they should be. The last semiconductor sequencer to reach market infers run length from the magnitude of one summed signal, so telling five identical bases from six means resolving a noisy continuous value into an integer, and independent benchmarking made that its characteristic error mode. That failure comes from being flow-limited: one nucleotide species is dispensed at a time, so a run collapses into a single event. **ECSEQ-0 was never flow-limited.** All four nucleotides are present continuously, so each incorporation is a separate kinetic event spaced from its neighbours by the polymerase’s own timing, and a homopolymer should read as a train of dwell-resolved events rather than one smeared magnitude. This is a testable prediction and an open problem for us.

## Three Axes, and Why One Is Not Enough

The incorporation perturbs the interface along three physically distinct axes, and they sit in different frequency bands because the two metals relax on different timescales. A **kinetic band** from 100 Hz to 10 kHz, where the platinum double layer dominates, carries the base-dependent time the polymerase spends in its closed conformation. A **molecular band** in the 10 to 100 kHz tail carries the dielectric and dipole coupling of the incorporated nucleotide to the gold. And a **faradaic band** at 20 to 90 Hz carries base-dependent charge transfer near the guanine oxidation onset, which is what breaks the A/G pair the other two leave tangled.

> [!note]
> The molecular band assignment is a modelling assumption, and the one we most expect to move. That’s why the encoder is handed the whole sweep rather than just the tail: we want it to locate the perturbation, not assume where it lives.

It’s worth seeing why no single axis carries the call. Dwell time is the most intuitive of the three and the easiest to overrate. The four distributions overlap heavily, and there’s no threshold you can draw that separates them.

**→ Interactive 3 — Dwell threshold** *(`DwellThreshold.tsx`).* The four per-base dwell distributions drawn as overlapping density curves against a dwell-time axis in milliseconds (gamma, k = 2.78, with means A 66 ms, T 80 ms, C 88 ms, G 116 ms — G pauses longest, A shortest). Three draggable handles, each labelled with the millisecond value it sits at, split the axis into four regions; a **"called" strip directly under the axis** shows the resulting rule, its four zones tinted and lettered in each base's own colour so the rule reads as a rule and not as more data. Handles are clamped between their neighbours, so handle *i* always owns boundary *i*. A live meter below reports the accuracy your placement achieves, against a tick marking 25% for guessing and a note that a usable read needs 99%, and the closing text changes depending on whether you beat ~33.5%. The point is that you cannot win — the four overlap so heavily that no set of splits gets past about 34%, which is why dwell is one of three signals rather than the measurement.

Site caption: *Pause length is one of the three signals the chip reads. This figure isolates it, to show how far timing gets you on its own.*

The spectrum has the same problem in a different form. Charge-transfer resistance varies roughly 25% pixel to pixel from fabrication and functionalization tolerances alone, which swamps anything base identity contributes. So the model never sees a raw spectrum. It sees the change between the incorporation and that same pixel’s quiescent baseline, in polar form: a log-magnitude change and a phase change at each frequency.

## What the Wash Was Also Doing

Removing the wash isn’t free, and the bill comes due in read length. Two independent mechanisms bound it, and the effective limit is the tighter of the two.

The first is geometric and easy to picture. An electrode’s field doesn’t reach far into an electrolyte, because dissolved ions rearrange to cancel it within a few nanometres. Each base carries the polymerase active site 0.34 nm further out, so after roughly nine bases at the ionic strength an active polymerase requires, the event falls outside the region the electrode can sense. The most dilute compatible buffer stretches that to about twenty-six.

The second is coherence, and it’s the tighter one. The wash was the synchronizer. Without it, each of the thousand copies performs its own random walk in position, and the ensemble smears.

**▪ Static figure — Ensemble phase spread** *(`phase-spread.png`, 1877 × 1168; same plot as Fig. 13 of the paper).* A line chart of positional spread σₙ (in bases) against sequencing cycle number on a log x-axis running 10⁰ to 10³. Two curves rise from the origin: nominal kinetics at CV = 0.485 (the steeper one) and a hypothetical deterministic chemistry at CV = 0.190. A dashed horizontal line marks the one-base contrast limit, where adjacent positions stop resolving; the two curves cross it at N_max = 4 and N_max = 28 respectively, both annotated on the plot. A callout in the upper right marks the 1,150-cycle read a single-run genome would assume, by which point σ has reached about 16 bases.

Site caption: *Positional spread of the ensemble, σₙ = 0.485√n bases, against cycle number; adjacent positions stop resolving once σₙ exceeds one base.*

So this is a short-read architecture, and it’s short for two reasons rather than one. Lifting either bound alone buys nothing. The target is smaller than it sounds, though, because **a read needs to be mappable, not long**: from about nine bases to the 20 to 25 base floor that unique placement against a 3.2 Gb reference requires. A factor of three, not the three orders of magnitude that would put us in competition with nanopore on read length. That’s a tractable engineering bet, and it’s also where most of our risk sits. If single-pixel validation can’t clear the mapping floor at a polymerase-compatible ionic strength, the whole-genome application closes and this stays a targeted-panel device.

## Where’d All the Time Go?

Now the arithmetic, which is the part that surprised us.

Read length doesn’t appear in the base rate at all. It enters only through the run count, through how many times the fixed overhead of sample preparation has to be paid. So closing a genome in a single run is just a parallelism condition: pixels, times read length, times occupancy yield, exceeds the bases you need.

Two things fall out of that. The architecture-independent figure of merit is an areal base rate of about 2.1 × 10⁶ bases per second per mm², quoted at 2 µm pitch and full occupancy, depending only on pixel count and polymerase turnover and surviving every correction to read length. And once a configuration closes a genome in one run, sequencing occupies well under 1% of wall-clock time: at a 30-base read, about 3.5 seconds of sequencing against a 35-minute library prep.

**→ Interactive 4 — Time to genome** *(`TimeToGenome.tsx`).* A calculator sitting directly on the throughput model. Five sliders on the left — bases read per fragment, size of the sensing surface, fraction of sensors catching exactly one fragment, time to prepare the sample, and times each position is read — drive a results panel on the right showing where the wall-clock time actually goes, plus derived cells for sensor pixel count, bases per second per mm² at full occupancy, readout channels at 512 pixels each, and data coming off the chip in GB/s. At the defaults it reproduces the whitepaper's figures. **Two warnings at the bottom cannot be dismissed:** the accuracy gate is pinned at our measured 71.2%, so a clean read at any interesting length remains astronomically unlikely, and the read-length gates fire outside the 20-to-26-base window. No setting on the panel produces a usable read, by design.

Site caption: *How long a whole genome would take, if the chip existed. Move the sliders and watch where the time goes. None of this is measured; it is arithmetic on a design, and at the default settings it reproduces the whitepaper's figures. The warnings at the bottom cannot be dismissed.*

That result is deliberately anticlimactic. **Time-to-result becomes time-to-prep.** It’s an array-area claim and a sample-prep claim, not a sequencing-speed claim, and neither is where our technical differentiation lies. Prep is a borrowed primitive, and the most concrete lever on it is switching from conventional fragmentation and ligation to tagmentation, where rapid kits report hands-on times around ten minutes.

The area is the harder half. At a 30-base read and a 0.5 µm pitch, closing a 30× genome in one run needs roughly 2,200 mm² of active area. That’s within the reticle-stitched area of a single 300 mm wafer, about 2.4× the 900 mm² panel scale our throughput analysis uses as its reference point, and several hundred times the 3.69 mm² of the full-spec die we’ve actually designed.

> [!note]
> Those three areas are different devices. The 4-pixel prototype tests whether the signal exists at all; the 960 × 960 full-spec die is a discrimination demonstrator and a targeted-panel device; the single-run genome is a projection past panel scale, at a finer pitch than we’ve designed. It also assumes reads clearing both Q20 accuracy and the mapping floor, and a 30-base read is itself marginally past the roughly 26-base ceiling the most dilute compatible buffer allows.

The readout figures here are quoted at panel scale, 900 mm² at 2 µm pitch, rather than at the larger single-run area above. Reading its 2.25 × 10⁸ pixels at cadence needs about 3.4 × 10⁹ spectra per second, which one front-end per pixel would never deliver at a cost consistent with a passive array. Code-division multiplexing does: about 512 pixels per converter and roughly 67,000 converters, which is a big data-acquisition box and a buildable one. It depends on an analog baseline nuller, standard in SQUID readouts, to cancel the quiescent baseline before digitization; without one the buildable depth collapses roughly thirtyfold, to about 250 pixels per converter, which is under the 512 the scheme needs.

Either way, none of this touches the chip, and all of it sits on the cost-and-capability curve that fluidics does not.

## Where We Are

Every number here comes from a physics simulator that models the chain from polymerase kinetics through gold and platinum transduction, dephasing, and correlated noise. Those numbers answer the narrower question that has to come first: whether the three-axis signal, as modeled, carries enough information to separate four bases, and whether a decoder can recover it. An instrument whose signal can’t be decoded in principle isn’t worth fabricating.

The answer is mostly yes, we’ve found, with a specific and instructive caveat.

The per-event encoder, calling each incorporation in isolation, reaches 50.1%. The temporal stage lifts that to **71.2% per base**, or Phred Q5.4, on 30-base reads. The production floor is Q20, which is 99%. We’re roughly thirty times too error-prone at short read lengths for whole-genome mapping.

> [!note]
> That’s a single-call accuracy rather than consensus, and because the residual is correlated, consensus won’t follow the naive binomial. Ground truth is simulated, so the figure characterizes the model and the simulator jointly. And each number assumes one delimited spectrum per incorporation, so the reported error is substitutions alone, with no insertions or deletions.

So that’s the honest position: a decoder that works on simulated data, with hardware validation and some clever engineering left to close the gap.

## Why We Think the Gap Closes

**The error has structure, and that’s our strongest indicator of success.** The residual isn’t spread evenly across four bases the way noise would be. Guanine is called at 98.8% and the A↔G purine pair is essentially resolved, accounting for 1.3% of all errors and under 0.4% of all calls. The limiting channel is the pyrimidine pair instead, which the faradaic axis doesn’t target by design: thymine is called correctly in only 45.0% of cases, and C↔T is the single largest error channel. Cytosine sits at 65.2%, and adenine at 75.3% loses predominantly to thymine rather than to its fellow purine. That localizes the shortfall to a missing discrimination axis rather than to a noise floor, which is a far more tractable thing to be wrong about.

**▪ Static figure — Per-base confusion matrix** *(`confusion.png`, 1187 × 449; same plot as Fig. 10 of the paper).* Two 4 × 4 heatmaps side by side, true base down the rows and predicted base across the columns, in a blue colour scale. **Left, row-normalized:** the G→G cell is near-saturated at 0.99 while T→T sits at just 0.45, with T's mass bleeding into A (0.25) and C (0.29), and C→C at 0.65 leaking 0.24 into T. **Right, the same matrix as raw counts** over roughly 25,000 events per base, showing the C↔T block carrying by far the heaviest off-diagonal traffic. The visual reading is that the purine pair is clean and the pyrimidine pair is not.

Site caption: *Per-base confusion after fine-tuning, row-normalized (left) and as raw counts (right). Guanine resolves cleanly at 0.99 and the A↔G pair with it; the residual concentrates on the C↔T channel, with thymine called correctly in 0.45 of cases.*

> [!note]
> The faradaic axis is the least established of the three. Its assignment to the 20 to 90 Hz band is a modelling assumption, the compatibility of an elevated gold bias with polymerase fidelity is a second, and guanine oxidation is irreversible, so the measurement consumes the base it reads.

Structured error does carry a cost. Because it’s systematic rather than random, coverage doesn’t average it away; the same miscall recurs at the same reference position across independent reads. Only added information fixes it, which makes a fourth discrimination axis for the C/T pair the decisive route, and the clearest single piece of physics we know we’re missing.

**Context is our largest demonstrated lever.** The same architecture reaches 89.6% per base at 100-base reads, where the per-event encoder also rises to 76.7%. That isn’t a supported operating point, since 100 bases sits outside both read-length bounds. What it measures is decoder capacity given abundant context, which is exactly what an extended sensing envelope would supply. Read length and accuracy are one problem, not two.

**And there’s direct precedent on the decoder side.** Successive nanopore basecaller architectures moved read accuracy into the high eighties and low nineties on a physical signal that never changed, with the conditional-random-field decoder outperforming CTC. That’s the curve we’re claiming to be on, and it’s the concrete content of “AI is the instrument.” Our chip is passive and fixed and reports the state of its own surface; everything that turns that report into an answer is a model. An instrument built this way improves on the schedule of machine learning rather than that of semiconductor process development. Nobody can upgrade a shipped flow cell’s chemistry by software.

## Beyond the First Chip, and the Next Experiment

Both read-length bounds are sequencing problems specifically. They exist because synthesis carries the event away from the electrode, and because a thousand copies of a growing strand can’t stay in step without a clock. Most things worth measuring hold still. A hybridized target, an antibody-antigen pair, a redox-active metabolite: each sits inside the sensing envelope permanently, and none are read-length-limited at all. The same array, the same three-axis physics, and the same class of decoder read them, with pitch and active-site size chosen to match the analyte. And because the readout is continuous and electrical, they can run as long-duration monitoring rather than single-shot tests.

**That’s the reason to build an instrument and not a sequencer.** Sequencing is the hardest application we could find, chosen because the signal is weak, the event is fast, and the answer has to be one of four. If the architecture holds there, label-free pathogen detection, targeted molecular panels, and continuous biomarker monitoring are easier chips on the same reader, inheriting the same decoder and the same simulator-and-calibration flywheel. The cost argument has the same shape: to first order the per-genome cost is chip cost divided by reuse count, plus prep, and neither term is a single-use flow cell.

> [!note]
> The 50 to 100 strip-and-reload cycles we work with follow from how long a thiol-gold bond should survive before desorption degrades it. It’s a mechanism rather than a measurement, and nobody has run that experiment on our surface yet.

All of it gates on one measurement. Does a single natural-base incorporation, in a clonal cluster on a roughly 1 µm² gold-platinum pixel, produce a reproducible, base-discriminating impedance signature above the noise floor? We’ve written down the ways that comes back no, with thresholds set from the blank-chip baseline before the run rather than after seeing the data: phase coherence to a pre-set cycle count, mean impedance shift clearing measured noise by a pre-set margin, resolvable dielectric contrast in the molecular band, acquisition fitting inside the roughly 66 ms incorporation window, and per-base accuracy reaching Q20 at whatever read length turns out to be achievable. A threshold chosen after the data isn’t a kill criterion.

The immediate work is hardware: fabricate a single pixel, run the calibration pair, recalibrate the simulator against the real interface, and fine-tune the basecaller from its existing checkpoint onto real reads. On the model side the next step is event segmentation, since every accuracy here assumes one delimited spectrum per incorporation and a real device delivers an unsegmented stream. Inferring the alignment rather than being handed it is a CTC or transducer problem, the same model class that carried nanopore where it went.

The array is the part that has to be built once. It’s fixed, passive, and deliberately cheap, and its whole job is to report the state of its own surface honestly. The chip that reads a panel today should read it better next year, and read something else entirely the year after, with nobody returning to the fab in between. None of that is close yet. But it’s far off for reasons we can enumerate, in an order we can attack, and the first one is a single pixel.

---
---

# Review Pass, 2026-07-25

An adversarial pass against `whitepaper.tex` caught several things worth recording, because they are the kind of error that recurs.

**Corrected in the prose.** Adenine had been swept into "the pyrimidine pair" (it is a purine; its residual is A→T loss, which is the whitepaper's own framing). The analog nuller's collapse was written as "fourfold" from misreading its 4.85-bit reclaim as linear, when it is roughly thirtyfold, 7,100 pixels per converter down to 250. The readout figures sat immediately after the 2,200 mm² single-run configuration without saying they are quoted at panel scale, which is a 40× different pixel count. The molecular band assignment was stated as fact when the whitepaper calls it the specification most likely to move. The nanopore precedent said 65% to over 99%; the whitepaper now says high eighties and low nineties, and 99% is a consensus figure. The 25% spread belongs to charge-transfer resistance, not absolute impedance.

**Corrected in the data.** `SIGNATURE` had been computed over only the `faradaic_valid` subset, 27% of events, which biases magnitudes up by roughly 1.7×. Recomputed over all 750 held-out events. The consequence matters: on the full population C and T sit within 0.12 percentage points and **the ordering flips depending on selection**, so the post no longer claims either is larger, only that they are not separable in magnitude. That is the honest version of the claim and a stronger one.

**Left unreconciled, deliberately.** The whitepaper puts the molecular perturbation at "order 15%" and derives 1.67× between guanine and the pyrimidines; the simulator gives 3 to 5% and about 2×. Both gaps are real and neither is papered over: the interactives quote the simulator's own numbers and no on-screen ratio is asserted. Worth chasing before publication.

**Corrected in the widgets.** `DwellThreshold` claimed a best-achievable accuracy in "the low forties" when the Bayes ceiling on those distributions is 33.7%, which made two branches of its own copy unreachable; it also truncated G's tail at 320 ms and renormalised, biasing the number low. `TimeToGenome` showed the coherence bound only when the looser geometric bound was not already firing, so the tighter of the two was hidden at every default setting, and it was excluded from gating entirely. The confusion row in the walkthrough was labelled "posterior", which is a different object from P(call | truth).

---

# Interactive Figures

**Status: four implemented.** Client components under `website/src/components/interactive/`. Every displayed number comes from `constants.ts`; every curve comes from `spectra.json`, exported from `data/dataset_val.npz`, which is real held-out simulator output rather than a drawing. Design tokens per [[Design Reference]].

| # | Component | Placed in | What it does that a static figure cannot |
|---|---|---|---|
| 1 | `ChipSurface.tsx` | The wash is the clock | Static isometric surface on the left, live instrument on the right: hover a pixel and watch its sweep acquired frequency by frequency and reduced to the perturbation |
| 2 | `PipelineWalkthrough.tsx` | The wash is the clock | Five stages of one incorporation; drop to a single molecule and watch the signal vanish into the noise floor |
| 3 | `DwellThreshold.tsx` | Three axes | Drag decision boundaries and fail to separate the bases by dwell alone |
| 4 | `TimeToGenome.tsx` | Where'd all the time go? | Break the sub-hour claim yourself; two gates that cannot be switched off |

Cut during review: an axis-toggle explorer (no completed ablation stands behind it), a guess-the-base game, an animated dephasing race (`fig12-phase-spread` carries the point statically), and a baseline-subtraction explorer.

## Design rules, applied to all four

- Legible and complete at the default state with no interaction. Most readers never touch it.
- Every derived number computed in-component from `constants.ts`, so a spec change updates every figure at once.
- Anything projected rather than measured says so in body text, not a tooltip.
- Pointer events throughout, so every control works on touch.
- Wide plots scroll horizontally below a 460px min-width rather than scaling their own text into illegibility on a phone.
- Nothing computed live from a model. Curves are pre-exported.
- Base selection appears only on stages where base identity is the variable. The cluster and sweep stages do not offer it, because the raw sweep looks the same whichever base it was.

## The honesty constraints, which are the point

1. **`TimeToGenome` cannot output an encouraging number.** The accuracy gate is permanently on at our measured 71.2%, and read-length gates fire outside the 20 to 26 base window. Reach a one-run genome on the sliders and the result still greys out.
2. **`DwellThreshold` is designed to be lost.** No placement of the cuts gets past about 34%, against the 99% a usable read needs. The Bayes ceiling on those distributions is 33.7%, and the default cuts already sit essentially on it.
3. **No toy classifier accuracy is shown anywhere.** Every one we tried sat near chance and would have misrepresented the argument. The one accuracy figure any widget reports is `DwellThreshold`'s, which is an exact integral over the four densities rather than a trained thing.

## Note on `ChipSurface`

Three versions of this were built, and the first two put the motion in the wrong place.

The first animated converter groups energizing under Hadamard code-division. Accurate about the readout, but the readout is engineering, and it buried the point. The second animated the surface itself, every cluster advancing asynchronously. Truer to the architecture, but a surface that never stops moving is hard to read and gives the eye nothing to hold.

The shipped version splits the two. **Left: a static surface.** Ten pixels a side, a flat isometric electrode grid with clonal clusters lying on top, each coloured by the base it is incorporating. No extrusion, no height encoding: the grid reads as the chip surface it is. Nothing moves, so it can be examined. **Right: a live instrument.** Hovering any pixel points the readout at it, and the scope runs a continuous 62-point sweep: a drive tone stepping from 100 Hz to 100 kHz, and beneath it the Δlog|Z| and Δφ traces filling in point by point behind an acquisition marker. That is where the real-time behaviour belongs, because that is what is actually happening in real time.

Signature values are frozen into `SIGNATURE` in `constants.ts`, measured off `dataset_val.npz`:

| Base | Peak shift in \|Z\| | Median dwell |
|---|---|---|
| G | 5.04% | 97.7 ms |
| A | 4.26% | 60.7 ms |
| T | 3.49% | 67.4 ms |
| C | 3.37% | 76.5 ms |

Using the real numbers rather than invented ones buys three things. Guanine visibly towers, which is why it is the base we call most reliably. **C and T differ by 0.12 percentage points**, and which of the two is nominally larger flips depending on how the events are selected, so their tiles are genuinely hard to tell apart and their traces nearly superimpose. That is not a rendering compromise, it is the single largest error channel in the basecaller, and the reader meets it here before the confusion matrix names it. And occupancy is Poisson at λ = 1, so 37% of tiles are flat and empty, 26% carry two templates and render as a blend whose trace belongs to neither base, and only 37% are the clean single clusters the whole instrument is built to read.


---

# Interactive Figure Copy

> [!important] **This section is the edit surface.** Every user-facing string in the four interactive components, in the order it appears on screen. Edit the wording here, then hand it back to be applied to the components — nothing else in this document is wired to the code.

**How to read it.**

- `{like this}` is a value interpolated at runtime from `constants.ts` or computed in-component. **Rewrite the words around it; leave the braces in place.** Changing a number means changing `constants.ts`, which changes it everywhere at once.
- **Bold** here is bold on screen.
- *Dynamic:* the string switches on device — touch gets one word, pointer another.
- *Conditional:* the component picks one variant based on state. All variants are listed; every one needs to work.
- Short axis and tick labels are grouped at the end of each component as **Chart labels**, since they are labels rather than prose.

---

## 1. Chip surface — `ChipSurface.tsx`

**Frame caption.** *Dynamic: Hover / Tap.*

> Ten pixels on a side, at the 2 µm spacing of the designed chip. Each patch of colour is a DNA cluster, tinted by the base going in. {Hover|Tap} a pixel and the instrument reads it: a voltage is applied at 62 frequencies in turn, and the pixel's own baseline is divided out. Magnitudes and dwell times come from the simulator's held-out set.

**Left panel heading.** *Dynamic: Hover / Tap.*

> **The chip.** {Hover|Tap} to pick a pixel.

**Right panel heading.**

> Pixel ({x}, {y}) — {current sweep frequency}

**Readout below both panels.** *Conditional on what landed on the selected pixel. The box holds a fixed minimum height so moving the cursor never reflows the page.*

*Empty pixel:*

> **Nothing landed here.** The sweep still runs and still costs a slot, but there is no DNA here and nothing comes back. Roughly a third of the array is like this, and that wasted third divides into every throughput number we quote.

*Two fragments:*

> **Two fragments landed here.** Both are growing and both are being read, so the trace on the right is {base A} and {base B} added together into a curve that belongs to neither. A fifth to a quarter of pixels land this way, and every one has to be found and thrown out.

*One clean cluster (the default state, which lands on G):*

> **About {1,000} copies, all adding {G}.** That shifts the interface by {5.04}% and holds for a median of {98} ms. {per-base note, below}

**Per-base notes.** *One is appended to the clean-cluster readout above. Matched in length so the panel does not reflow on hover.*

- **A** — Adenine is the other purine, and the faradaic band below is what keeps it from being confused with guanine. What it does lose to is thymine.
- **C** — Cytosine and thymine sit within a tenth of a percentage point of each other here, and that pair is the single largest error channel we have.
- **G** — Guanine pushes hardest and waits longest, but it is the faradaic band below that resolves it: it oxidises at the lowest potential of the four.
- **T** — Thymine is the base we call worst, at 45%. It sits within a tenth of a percentage point of cytosine, and that pair is our largest error channel.

**Annotation inside the faradaic strip.** *Set on three lines, so it breaks where the line breaks are.*

> guanine oxidises / at the lowest / potential of the four

**Chart labels.** `drive` · `Δlog|Z|` · `Δφ` · `20 to 90 Hz` · `100 Hz` · `100 kHz` · `no cluster, flat response` (empty pixels only)

---

## 2. Pipeline walkthrough — `PipelineWalkthrough.tsx`

**Frame caption.** *Dynamic: Click / Tap.*

> One incorporation, from a thousand copies of DNA on a pixel through to a base call. {Click|Tap} the five stages. Every curve is simulator output, not a measurement from a chip.

**Stage tabs.** `1 Cluster` · `2 Sweep` · `3 Perturbation` · `4 Encoder` · `5 Transformer`

**Base selector.** *Appears from stage 3 onward only, because the raw sweep looks the same whichever base it was.* Label `Base`, with `dwell {82} ms` at the right.

**Stage text.** *One paragraph under the figure, switching with the stage.*

1. **Cluster** — One fragment, copied {1,000} times in place until it covers the pixel. A single molecule moves the impedance far too little to detect. A thousand of them, all adding the same base at once, do not.
2. **Sweep** — While the base goes in, the pixel is swept at 62 frequencies: 50 from 100 Hz to 100 kHz, plus 12 more between 20 and 90 Hz. The shaded regions are the three bands that carry base identity.
3. **Perturbation** — Electrodes differ from each other more than bases do, so the raw spectra are nearly identical. Dividing each pixel by its own baseline cancels that out and leaves Δlog|Z| and Δφ. This is the only thing the model is ever shown.
4. **Encoder** — One convolutional branch per band, pooled into a {256}-number summary of the event. How long the polymerase paused enters separately, because it is a timing measurement rather than a spectral one.
5. **Transformer** — A transformer reads the whole strand at once, so every position is called against its neighbours rather than alone. This is where most of the accuracy comes from. The bars show how often each base is called as what, on held-out reads.

**In-figure copy, stage 1 (Cluster).** *Conditional on the toggle.*

- Button: `Drop to a single molecule` / `Show the full cluster`
- Caption: `{1,000} copies` → `ensemble average is measurable`
- Caption: `1 copy` → `signal is inside the noise floor`
- Label: `1 µm active site`

**In-figure copy, stage 2 (Sweep).**

- `50 points, 100 Hz to 100 kHz`
- `plus a 12-point faradaic sub-band, 20 to 90 Hz, swept separately`
- Band ribbon: `Kinetic` · `Molecular`

**In-figure copy, stage 3 (Perturbation).** *Conditional on the toggle.*

- Button: `Show the raw spectra` / `Subtract the baseline`
- Heading: `event against baseline, log|Z|` / `Δlog|Z|, all four bases`

**In-figure copy, stage 4 (Encoder).** `Kinetic branch` · `Molecular branch` · `Faradaic branch` · `pool` · `{256}-dim embedding` · `dwell {82} ms, separate`

**In-figure copy, stage 5 (Transformer).** *Dynamic: the caption shortens on a phone.*

- Wide: `30-cycle read, bidirectional attention at the called position`
- Narrow: `30-cycle read, attention at the call`
- Panel heading: `calls, truth = {G}`

**Chart labels.** `log₁₀|Z|` · `100 Hz` · `100 kHz` · `100 Hz to 100 kHz` (narrow only)

---

## 3. Dwell threshold — `DwellThreshold.tsx`

**Frame caption.**

> Pause length is one of the three signals the chip reads. This figure isolates it, to show how far timing gets you on its own.

**Opening paragraph, above the chart.**

> **What this shows.** Each time the polymerase adds a base it pauses, and that pause is never quite the same length twice. So each base gives a spread of pause lengths rather than a single number, and that is what one curve is: tall where that length comes up often. The four spreads do sit in different places — A averages {66} ms, G the slowest at {116} ms.

**Second paragraph, above the chart.**

> **What to try.** If the length of the pause were enough on its own to tell you which base had just been added, you could simply cut the time axis into four and read the answer off whichever slice a pause fell into. **Drag the three handles** to place those cuts. The strip under the axis is the rule you have built: a pause landing in that stretch gets called that base. The bar below scores your rule against every pause the four bases actually produce, with a tick marking what blind guessing would score.

**Score readout.**

> Bases your rule gets right, timing alone — {33.6}%
>
> tick marks guessing, 25% · a usable read needs 99%

**Legend.** One entry per base: `{A} · {66} ms average`

**Closing paragraph.** *The opening sentence is conditional on whether the reader has beaten 33.5%; the body is the same either way.*

*Above 33.5%:* > **That is the ceiling, and it is nowhere near good enough.**

*At or below 33.5%:* > **No placement gets you far past chance.**

> The averages differ, so timing does carry real information. But the spreads are wide enough that they sit almost on top of each other, and a pause of 90 ms is entirely ordinary for any of the four. No placement of the cuts gets past about 34%. That is why timing is one of three signals rather than the measurement, and why the model receives it as a scalar alongside the spectrum rather than trying to recover it from the low-frequency band. The other two axes, dielectric coupling at the gold interface and base-dependent charge transfer, are what make four-way discrimination possible at all.

**Chart labels.** `called` (naming the decision strip) · `dwell time, ms` · the four zone letters `A` `T` `C` `G` · each handle's millisecond value

---

## 4. Time to genome — `TimeToGenome.tsx`

**Frame caption.**

> How long a whole genome would take, if the chip existed. Move the sliders and watch where the time goes. None of this is measured; it is arithmetic on a design, and at the default settings it reproduces the whitepaper's figures. The warnings at the bottom cannot be dismissed.

**Controls.** *Each has a label, a live value, and a note underneath.*

| Control | Label | Note underneath |
|---|---|---|
| 1 | Bases read per fragment | The chip can sense about {9} bases, {26} at best. A read needs {20} to {25} to be findable in a genome. |
| 2 | How tightly the sensors are packed | *per-pitch note, below* |
| 3 | Size of the sensing surface | Prototype is 4 pixels. The designed chip is 3.69 mm². 900 mm² is a projection. |
| 4 | Sensors that catch exactly one fragment | Letting fragments land at random tops out near 37%. The rest are empty or catch two. |
| 5 | Time to prepare the sample | 35 min the usual way, about 10 min hands-on with a faster kit. |
| 6 | Times each position is read | *(no note)* |

**Per-pitch notes.** *Control 2 is a three-way button group, not a slider. One note shows at a time.*

- **2 µm** — Designed and drawn, sized for the roughly 1 µm cluster amplification gives us today. The 4-pixel prototype is within reach of our own maskless exposure tool; the full 960 × 960 die needs a foundry.
- **1 µm** — Not designed, and needs a foundry. Clusters would be grown to about half their current diameter by running fewer amplification cycles, which costs copies and so weakens the ensemble average.
- **0.5 µm** — Projection. Clusters would have to be grown to roughly a quarter of today's diameter. Cycle count controls that directly, but how few copies the readout still tolerates is untested.

**Results panel.** *Values shown are what the defaults produce.*

> Time to a whole genome — {22.8 hr}
>
> prep {22.8 hr} · sequencing {2 min}
>
> {39} run{s} required · sequencing is {0.17}% of the total time

*`run{s}` pluralises on the run count: "1 run required", "39 runs required".*

**Derived cells.** `Sensor pixels` · `Bases per second per mm², at full occupancy` · `Readout channels at 512 px each` · `Data coming off the chip`

**Warnings.** *The first is permanently on. The other three fire on the read length and cannot be dismissed either.*

*Always on:*

> **Not accurate enough yet.** Our basecaller gets {71.2}% of bases right, measured at 30 bases. Carried across a read this long, purely as illustration, a clean read would turn up about {3.8e-5} of the time. No setting on this panel produces a usable read. We leave this warning on because we have not earned the right to switch it off.

*Read length below {20}:*

> **Reads are too short to place.** A human genome is 3.2 billion bases, so a fragment needs {20} to {25} bases before you can tell where it came from. At {15} it matches everywhere and therefore nowhere.

*Read length above {26}:*

> **Longer than the sensor can see.** Each base added pushes the reaction a third of a nanometre further from the electrode. It fades out of reach after about {9} bases, or {26} in the friendliest buffer. {30} is past that.

*Read length above {4}:*

> **The copies drift out of step.** The thousand copies on a pixel each run at their own pace, and with no wash to resynchronise them they smear a full base apart after about {4} cycles. Reaching {30} needs that fixed too, not just the sensing range.

---

# Further Interactive Concepts

Not built. Ranked by how much each would add relative to build cost. The theme is that the best ones let the reader attempt something and lose, because a constraint you have personally run into is more convincing than one you have been told about.

### A. Sensing horizon ruler
*No static figure exists for this, and it is the largest single risk in the program.*

Side elevation of the electrode with the Debye envelope shaded above it. Each click adds a base, pushing the polymerase active site 0.34 nm further out, with a signal-amplitude meter falling as it goes. At about nine bases it goes dark. An ionic-strength slider moves the envelope between the 9-base nominal point and the 26-base dilute-buffer ceiling, with a marker at the 20 to 25 base mapping floor. Pairs directly with `DephasingRace`: run both and the "two bounds, lifting either alone buys nothing" argument needs no prose at all.

### B. Cluster overgrowth
Amplification cycles on a slider. Cluster radius grows against two fixed rings: its own 0.5 µm allotment and the neighbouring sensing zone starting at 1.5 µm. The cluster must roughly triple its radius before it reports into its neighbour, which sounds comfortable until you notice nothing physical arrests it and we have no measured bound on radius against cycle count.

### C. Passive matrix, and what it costs
Hover any pixel and its row and column lines light up, which makes "passively addressed" concrete instantly. Then the payload: an array-size slider lengthens the lines and slides the RC corner frequency down across the sweep until it eats the 100 kHz top where the molecular axis lives. Marked unquantified, because we have not modelled line resistance at any scale.

### D. Faradaic exposure budget
The faradaic axis consumes the base it reads. Step through a read and watch previously oxidized guanines accumulate inside the sensing envelope, each contributing a low-Rct guanine-like background, with the marginal signal diluting as 1/(1 + n_G). A duty-cycle control trades faradaic coverage against cumulative exposure. The most under-communicated risk in the architecture, and it has no figure anywhere.

### E. Consensus does not save you
Two panels, one coverage-depth slider. Left: an uncorrelated error model climbing toward Q30 exactly as the naive binomial predicts. Right: our actual correlated residual, where the same C↔T miscall recurs at the same reference position across independent reads and the curve plateaus short. Watching them diverge beats the sentence "coverage does not remove it."

### F. Scroll-linked pipeline
Bind the walkthrough's stage to scroll position, manual controls still available. Elegant when it works, genuinely annoying on mobile, and the payoff is aesthetic rather than argumentative. Listed last for that reason.

---

## Figure inventory

All exported from the current `whitepaper.tex` build. Vault copies prefixed `blog-ecseq0-` in `attachments/`; web copies in `website/public/research/ecseq-0/`.

| Whitepaper figure | Vault attachment | Web asset | Section |
|---|---|---|---|
| `fig01-overview` | `blog-ecseq0-pipeline.png` | `pipeline.png` | Cover |
| `fig12-phase-spread` | `blog-ecseq0-phase-spread.png` | `phase-spread.png` | What the wash was also doing |
| `fig10-confusion` | `blog-ecseq0-confusion.png` | `confusion.png` | Why we think the gap closes |

Cut, with the reason: `fig02-sensor-stack` (pixel cross-section), `fig04-amplification` (the walkthrough's first stage carries the cluster), `fig05-dwell` (`DwellThreshold` replaces it), `fig07-raw-spectra` and `fig08b-perturbation` (`BaselineSubtraction` supersedes both), `fig11-operating-plane` (`TimeToGenome` covers the same trade), `fig13-quality` (the viability gate is stated in the prose and enforced by `TimeToGenome`), `fig03-array` (`ChipSurface` replaces it), `fig06-basecaller` (the walkthrough's encoder and transformer stages carry it), `fig08a-perturbation` (redundant with 08b), `fig09-training` (too internal for a public post).

Three static figures remain, against four interactives.
