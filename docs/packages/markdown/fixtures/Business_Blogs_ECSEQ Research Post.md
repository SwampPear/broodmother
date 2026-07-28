# ECSEQ Research Post

*Published content for the public research post on the Proprium site, live at `/research` → `ecseq-massive-throughput-sequencing-by-synthesis`. Condensed public-facing version of [[Whitepaper]]; caveats track [[Risks & Kill-Criteria]]. Positioning notes in [[ECSEQ Research Post — Positioning]].*

---

## Metadata

| Field | Value |
|-------|-------|
| Title | An AI-native sensor platform for biology, starting with DNA |
| Slug | `ecseq-massive-throughput-sequencing-by-synthesis` |
| Published | 2026-07-20 |
| Type | research |
| Authors | Proprium Bioscience |
| Source of truth | `website/src/content/posts/ecseq-massive-throughput-sequencing-by-synthesis.tsx` |

> [!IMPORTANT]
> The site renders from the `.tsx` file, not from this doc. This is the readable vault copy for review and reuse — edits here do not reach the website. Change both, or change the `.tsx` and re-sync this page.

**Excerpt.** A passive silicon electrode array that reads biology electrochemically, paired with an AI model that turns that raw signal into an answer. The instrument is general; its first and hardest application is DNA sequencing — label-free, wash-free, and free of optics.

![[blog-ecseq-pipeline-overview.png]]

*ECSEQ end to end: a passive electrode array measures an impedance spectrum at every pixel on every incorporation, and a two-stage model turns those spectra into base calls.*

---

## Lead

We started Proprium to make AI the instrument for reading biology.

Almost everything we know about a genome, a cell, or a disease is read by a machine that turns a physical process into a signal — and for decades the only way to do that at scale was to label the biology, photograph it, and wash it away. The result is extraordinary and expensive: walls of optics, precision fluidics, single-use consumables. The intelligence lived in the hardware.

We think that is inverting. Put a cheap, passive silicon array against a biological sample, measure how the sample perturbs the electrode surface *electrically*, and let a neural network do the reading — and the instrument becomes mostly software. The chip stays simple and fixed; every advance in AI makes it a better instrument without a new chip. That is the platform: one reader, many chips, each chip a different measurement across medicine and research, all improving on the same curve the models do.

A bet like this is only worth making if you prove it on the hardest problem first. So our first system is a DNA sequencer, and its first use case is **short-read panels** — reading short, known stretches of DNA where speed, cost, and a lab-free instrument matter more than read length. The rest of this post is how that first system works.

> [!todo] Figure: the platform in one image — one benchtop reader, interchangeable passive chips (sequencing today; pathogen panels, biomarker monitors next), with the AI model as the shared instrument across all of them.

Sequencing has gotten dramatically cheaper, but the machines have not gotten much simpler. Nearly every high-throughput platform still works the same way underneath: attach a label to each base, take a picture, wash the chemistry out, and repeat. That loop is what sets the pace. Not the polymerase, which is fast — the fluidics and the camera around it.

ECSEQ removes both. There is no dye and no wash. Instead the chip listens to the electrical signature that a base makes as the polymerase incorporates it, and a neural network reads that signature back into sequence. The bottleneck moves off the fluidics and onto readout electronics, which is a much better place for it to sit — data acquisition scales with ordinary engineering, fluid exchange does not.

---

## Why label-free changes the shape of the machine

Two things follow from dropping the label. First, there is nothing to clear between bases, so all four nucleotides can sit in the reaction at once and the polymerase can run continuously rather than one base per cycle. Wash-free operation is not a feature bolted on top; it is simply what is left once the label and the optics are gone.

Second, the sensor and the sample surface become the same object. The gold film that anchors the DNA is also the electrode that transduces the signal. That is a real constraint — optical platforms get to separate what the DNA sticks to from what does the measuring — but it buys something no competitor has: the surface is reusable. Every other platform sequences on a single-use flow cell. Here the same chip is stripped and reloaded for an estimated 50 to 100 runs.

---

## The chip

Each pixel is a vertical stack: a top gold electrode, an anodized Al₂O₃ dielectric, and an underlying platinum electrode. Gold binds the DNA and reports the molecular signal; platinum is the impedance transducer. Pixels sit on a 2 µm pitch with a 1 µm active site, matched to the footprint of one amplified DNA cluster, and a polymer fill isolates neighbors to suppress crosstalk. The array is addressed passively over row and column lines — no per-pixel circuitry, no basecalling logic on chip.

![[blog-ecseq-sensor-stack.png]]

*One pixel in cross-section. Gold anchors the DNA and reads the molecular signal, platinum reads the kinetics, and the polymer fill keeps adjacent pixels from bleeding into each other.*

The gold is functionalized with a monolayer of thiol-anchored primers, backfilled with a short-chain thiol that displaces loosely stuck DNA and stands the surviving primers upright. That backfill is doing two jobs at once: it sets the primer density amplification needs, and it is part of the baseline dielectric environment the molecular signal is measured against.

---

## Growing enough signal to measure

A single molecule does not move the impedance enough to detect. So each landed fragment is copied in place by isothermal bridge amplification: a surface-bound strand arches over, hybridizes to a neighboring primer, gets extended, and denatures into two bound copies. Iterate, and you get a clonal cluster of roughly a thousand identical copies sitting on one pixel. What the sensor reads is the ensemble average of a thousand polymerases doing the same thing at the same time.

![[blog-ecseq-bridge-amplification.png]]

*Bridge amplification builds the cluster directly on the electrode, at the same 65 °C used for sequencing. Nothing is amplified off-chip and captured afterward — the cluster is never detached from the surface that senses it.*

Bridge amplification was chosen over rolling-circle nanoballs for two reasons. It grows from the primer lawn the electrode already needs, with no circularization step and no separate capture event. And its foundational patent expired in 2019, where the nanoball array patents run into 2027–2028.

> [!IMPORTANT]
> The 2019 expiry is load-bearing for freedom to operate. See [[ECSEQ/IP & Patents/Patent Landscape & FTO Analysis]].

---

## Three axes of discrimination

Here is the part that has to work. Incorporating a base perturbs the impedance at the interface, and that perturbation has to differ measurably between A, C, G, and T. Because the gold and platinum interfaces relax on different timescales, their contributions separate across frequency, giving three physically distinct handles on base identity:

| Axis | Band | What it reads |
|------|------|---------------|
| Kinetic | 100 Hz – 10 kHz | Platinum double layer. The polymerase holds a closed conformation for a base-dependent dwell time, and that dwell modulates the impedance. |
| Molecular | 10 – 100 kHz | Gold interface. Dielectric and dipole coupling of the incorporated nucleotide to the monolayer. Separates purines from pyrimidines. |
| Faradaic | 20 – 90 Hz | Charge transfer. Bias the gold near guanine's oxidation onset and G presents a distinctly lower charge-transfer resistance than A. |

The faradaic axis exists for one specific job: A and G are both purines with similar dielectric behavior, and kinetics alone leave them tangled. Guanine has the lowest oxidation potential of the four bases, so biasing toward that onset makes the charge-transfer resistance base-dependent and breaks the pair. It is also the least established of the three — both the frequency assignment and the compatibility of an elevated bias with polymerase fidelity are modeling assumptions waiting on hardware.

![[blog-ecseq-raw-spectra.png]]

*Raw impedance spectra for one representative event per base, against that pixel's quiescent baseline. They look identical, because absolute impedance is dominated by pixel-to-pixel scale, not by base identity.*

Which is why the model never sees the raw spectrum. It sees the difference between the incorporation and that same pixel's own baseline, in polar form: a change in log-magnitude and a change in phase at each frequency. Working as a ratio against the pixel's own baseline cancels per-pixel offset, and charge-transfer resistance varies about 25% across the array from fabrication tolerances alone.

![[blog-ecseq-perturbation.png]]

*The same four events after baseline subtraction: Δlog|Z| and Δφ across the sweep. This is the actual model input, and the bases are now visibly separated.*

---

## The basecaller

Two stages, split along the shape of the problem. A single incorporation event is genuinely ambiguous, so the first stage does not try to call it — it organizes it.

The **encoder** is a 1D convolutional network with one branch per discrimination axis: a kinetic branch over the low band, a molecular branch over the full sweep, and a lighter faradaic branch over the 20–90 Hz sub-band. Making the frequency decomposition explicit gives each branch a well-scoped target instead of asking one network to untangle three physical mechanisms from a single spectrum. The three branches are pooled, concatenated, and projected to a 256-dimensional embedding, with the log-normalized dwell time carried alongside as its own scalar.

The **temporal stage** is a transformer encoder over the whole cluster's sequence of embeddings — around six layers, eight heads, bidirectional, since basecalling is offline and every position gets to see both directions of context. This is where most of the accuracy comes from. It resolves the within-group ambiguity a single event cannot, by reading each base against its neighbors' kinetics and the local sequence.

![[blog-ecseq-basecaller.png]]

*The two-stage basecaller. The encoder turns each 62-point sweep into one embedding per cycle; the transformer reads the whole read at once and emits a base per position.*

---

## What it does, on simulated data

Every number below comes from a physics simulator, not a chip. The simulator models the full chain — polymerase kinetics, Pt and Au transduction, cluster dephasing, correlated noise — and produces ground-truth-labeled spectra. So these results say that the three-axis signal, as modeled, carries enough information to call all four bases. They do not say anything yet about a physical device.

The encoder calls each incorporation in isolation at about 50%, and the temporal stage — reading each base against its neighbors — lifts that to **71.2% per base**, or Phred Q5.4. That is honest, and it is not yet enough: a read has to clear roughly Q20 (99%) to map against a genome, and closing that gap is the work ahead. But the number is a software curve, not a hardware limit — the same kind of curve that carried nanopore basecalling from ~65% to over 99% on an unchanged physical signal. This is what "AI is the instrument" means concretely: accuracy improves with model work, not with a new chip.

![[blog-ecseq-confusion.png]]

*Per-base confusion on held-out validation reads. Guanine is called cleanly and the A/G purine pair is essentially solved; the error concentrates on thymine and the C↔T pyrimidine channel.*

The more informative result is the shape of the error, because it tells us exactly what to fix. The faradaic axis does its job: guanine is called at 98.8% and the A↔G purine pair is essentially resolved, and a purine is almost never confused for a pyrimidine. The wall is the pyrimidine pair the faradaic axis does not target by design — thymine is the error sink and C↔T is the single largest channel. That points straight at the next lever: a fourth discrimination axis, or a stronger dielectric contrast, for the C/T pair.

---

## How long a read can get

Wash-free operation costs something. The wash in a conventional platform is also the synchronizer — it holds every copy in a cluster on the same clock. Without it, the thousand copies drift apart at their own stochastic rates, and the ensemble signal stays readable only while the cluster remains in phase. That drift sets the read-length ceiling.

Modeling dephasing as memoryless per-cycle attrition, coherence decays geometrically at the nominal simulator rate. Where the ceiling actually lands depends on how much coherence the basecaller can tolerate — a floor that has not been measured yet.

![[blog-ecseq-coherence.png]]

*Coherence decay against the coherence floor. A strict floor caps reads near 347 cycles, the nominal floor near 500, a permissive one near 1150. Read length falls only logarithmically as the floor tightens, so the horizon is forgiving of a strict floor and sensitive to a fast decay rate.*

Throughput then falls out of the readout, not the pixel count. At a 2 µm pitch over 900 mm², the array physically holds enough clusters for roughly 35× coverage of a human genome in a single pass. Reading them all at cadence needs about 3.4 × 10⁹ spectra per second — impossible one front-end per pixel, routine with frequency-division multiplexing onto roughly 6,800 fast converters. That is a serious data-acquisition system, but well within the channel count of instruments already deployed in the field, and it never touches the chip.

At that full-scale back end, a 30× human genome needs 427 cycles on a single run: roughly 35 minutes of sample prep plus about a minute of sequencing. But that configuration also sits at the most SNR-hungry corner, since each pixel keeps only about 3.7 effective bits of a shared 16-bit converter. Backing off to a shallower multiplex costs time and buys headroom — a genome in a couple of hours at a comfortable operating point, all on one reusable surface.

None of that is the first product, though. A single-run genome is the top of the ladder — gated on lifting per-base accuracy to the ~99% a read needs to map, and on building the array area to hold it — not the near-term chip. The first chip reads short, known panels, where a read of tens of bases is exactly enough and accuracy is the whole game. The genome is where the same architecture goes as the model and the fab mature.

> [!NOTE]
> Throughput envelope and the multiplex trade are developed in full in [[Throughput & Competitive Landscape]].

---

## Beyond the first chip

The read-length ceiling above is a *sequencing* problem: it exists because synthesis keeps moving the growing strand away from the electrode, out of the region the sensor can see. Most other things worth measuring hold still, right at the surface — a bound protein, a metabolite, a pathogen's nucleic acid — where the same passive array and the same class of AI decoder read them with no read-length limit at all. That is the whole reason to build an instrument rather than a sequencer. The hard chip, this one, validates the transduction physics and the decoding model against the sharpest problem we could pick; the easier chips — label-free pathogen detection, targeted molecular panels, continuous biomarker monitoring — reuse the same reader and the same model-and-calibration flywheel it builds. Sequencing is the wedge. The platform is the company.

## What we do not know yet

The honest summary is that this is a pre-hardware platform with a well-characterized model of itself. Four things bound the claims above.

All results are simulated, so the accuracy figures measure the model and the simulator together. The faradaic axis, which the whole A↔G separation depends on, rests on two untested assumptions: that its signal lands in the 20–90 Hz band, and that an elevated gold bias is compatible with polymerase fidelity. The dephasing rate that sets read length has never been measured. And the surface-reuse estimate underpinning the cost argument is a mechanism, not a measurement.

> [!WARNING]
> These four are the live risks, not rhetorical hedging. Ranked failure analysis and the single-pixel go/no-go criteria are in [[Risks & Kill-Criteria]].

Next step is a single pixel. Fabricate it, run the blank-chip and post-functionalization calibration, recalibrate the simulator against the real interface, and fine-tune the basecaller from its existing checkpoint onto real reads rather than retraining from scratch. If the per-event signal survives that move at the fidelity the simulator predicts, the rest is engineering.

---

## Figure inventory

Vault copies of the published figures, prefixed `blog-ecseq-`, live in `attachments/`.

| Figure | Attachment | Section |
|--------|-----------|---------|
| Platform concept — one reader, many chips | **needed** (see `[!todo]` in Lead) | Lead |
| Pipeline overview (cover) | `blog-ecseq-pipeline-overview.png` | Header |
| Pixel cross-section | `blog-ecseq-sensor-stack.png` | The chip |
| Bridge amplification | `blog-ecseq-bridge-amplification.png` | Growing enough signal |
| Raw spectra | `blog-ecseq-raw-spectra.png` | Three axes |
| Baseline-subtracted perturbation | `blog-ecseq-perturbation.png` | Three axes |
| Two-stage basecaller | `blog-ecseq-basecaller.png` | The basecaller |
| Confusion matrix | `blog-ecseq-confusion.png` | Simulated results |
| Coherence decay | `blog-ecseq-coherence.png` | Read length |
| Superseded cover | `blog-ecseq-overview.png` | — (replaced 2026-07-20) |
