# YC Application — Draft

Status: **DRAFT**. Framing decision: the whitepaper is being reframed around the EIS passive array plus AI as a general-purpose biological-sensing instrument (sequencing as the first application, not the whole story); **this application and the whitepaper now tell the same platform story**. The first commercial application is short-read targeted DNA panels — the wedge, not the ceiling. See [[Business Plan#Platform: General-Purpose Sensing for Medicine]], [[Funding#YC]].

> **Target: F26, closes July 27, 2026, 8pm PT — ~4 days out.** This is a sprint. The "how far along" answer states the honest current state (pre-hardware, single-pixel validation pending); F26 funds on acceptance, so the bet YC is making is on narrative + team + thesis, which is the right frame for a pre-hardware deep-tech company.

---

## The one-sentence pitch (company URL line)

**Proprium builds a general-purpose molecular-sensing instrument: a passive silicon electrode array reads biology electrochemically, and an AI model turns that raw signal into an answer. Our first chip sequences DNA with no optics, no flow cell, and no wash.**

---

## What is your company going to make?

We make an instrument where the intelligence lives in the model, not the hardware. A cheap, passive silicon array of electrodes sits in contact with a biological sample and measures how the sample perturbs the electrode–electrolyte interface using electrochemical impedance spectroscopy (EIS). That raw impedance signal is messy and, until recently, not worth much — the bet is that a neural network can decode it into a real measurement. Because the sensing is electrical rather than optical, the chip is a passive array with no on-chip logic; a single benchtop reader (analog multiplexer + off-chip ADC) drives it.

The strategic shape is one reader, many chips — like a razor-and-handle, or a glucometer that reads many strip types. The reader is fixed; each chip format targets a different measurement. Our first chip, **ECSEQ-1**, sequences DNA: DNA is anchored to the array, all four bases are present at once, and the model calls each base from the impedance signature of the incorporation event as the polymerase works — no fluorescent labels, no flow cell, no per-cycle wash. That deletes the three things that make current sequencers expensive and slow.

Its first commercial application is **short-read targeted DNA panels** — reading short, known DNA loci (oncology hotspots, pathogen ID, carrier screening) where speed, cost, and a lab-free instrument matter more than read length. The sensing physics bounds reads to tens of bases, so we lead with the application that limit fits; whole-genome throughput is the same architecture further up the ladder, gated on accuracy and array scale.

The general instrument is the company. Sequencing is the wedge because it is a ~$21B market with a sharp, obvious pain point and a claim we can validate cheaply. The same passive-array-plus-AI stack extends to label-free pathogen detection, continuous multi-analyte monitoring in bioreactors, and oncology/point-of-care panels — each a different chip on the same reader.

## Why did you pick this idea? Domain expertise? How do you know people need it?

Every gain in AI capability now upgrades a physical instrument without touching the silicon. That inversion — the model is the instrument, the hardware just gives it something to read — did not exist when the last semiconductor sequencer (Ion Torrent) shipped. It means a small team can build a cheap, dumb sensor and let model progress do the work that used to require precision optics and fluidics.

Sequencing proves the thesis under the harshest conditions we could pick: a four-way classification from a weak, noisy electrochemical signal, against billion-dollar incumbents, on a market that already pays for the measurement. If EIS + AI can call DNA bases, the easier sensing problems (binary presence/absence, concentration) fall out.

The need is not speculative. Sequencing is a ~$21B market growing ~22% CAGR, consumables-driven, and gated less by the cost of one genome than by turnaround and instrument complexity — a clinician deciding treatment for a critically ill newborn needs hours, not days, and a doctor's-office diagnostic needs an instrument without a reference lab's fluidics. The incumbents' costs come from exactly what we delete: optics, flow cells, and per-cycle wash.

Domain: [PLACEHOLDER — founder background, why this team. The whitepaper credits Michael Vaden with the full stack: sensor architecture, surface chemistry, physics simulator, basecaller, readout/throughput analysis, and the FTO survey. State that concretely and honestly.]

## What's new about what you're making? Why now?

- **The signal itself carries base identity.** We show the incorporation signal separates into three frequency-distinct axes (a kinetic axis from polymerase dwell, a molecular axis from nucleotide dielectric coupling, a faradaic axis from base-dependent oxidation), which is what lets all four bases be co-present and the wash disappear. Incumbent electronic sequencing (Ion Torrent) reads a base-agnostic proton pulse and must feed one base at a time with a wash between — we don't.
- **AI is the instrument.** Every improvement in the model improves the sequencer with no change to the chip. Our accuracy is a software curve, not a hardware respin — the same trajectory that carried nanopore basecalling from ~65% to >99% on an unchanged physical signal.
- **Fab economics arrived.** Flat-panel-display-class processes make large, passive, defect-tolerant electrode arrays cheap, and DIY semiconductor fabrication now puts a validation line within a small team's reach.

## How far along are you?

Pre-hardware, by design. We have: a physics simulator of the sensor stack; a two-stage basecaller (spectral encoder → temporal transformer) trained end-to-end on simulated reads; a whitepaper documenting the sensor architecture, the physical origin of the signal, and a throughput/read-length analysis with explicit kill-criteria; and an internal freedom-to-operate survey backing a provisional patent.

The single gate is **single-pixel validation**: fabricating one pixel and confirming that a real incorporation event produces a base-discriminating impedance signature on the Pt/Au stack. Everything upstream is simulation; that experiment converts the thesis into a measured number. We are explicit about this rather than hiding it — the honest version of the pitch is stronger, and it is exactly the risk YC money is best spent buying down.

[PLACEHOLDER — time worked, full-time vs part-time, per founder.]

## Who writes code, or does other technical work on your product? Was any of it done by a non-founder?

All technical work is done by the three founders. None of it has been done by a non-founder.

Michael Vaden (CEO) writes the majority of the code and owns the vertical stack: the ECSEQ-1 sensor architecture and layer stack, the physics simulator that generates our synthetic EIS datasets, the two-stage basecaller (spectral CNN encoder into a temporal transformer), the throughput and read-length analysis, and the freedom-to-operate survey behind our provisional patent.

Evan Goldstein (Chief Engineering Officer) owns the data and readout path: dataset generation and the off-chip readout design, meaning the analog multiplexer, ADC, and peripheral board that drives the passive array.

Jack Ready (Chief Science Officer) owns the biology. His work so far is research rather than bench work, since we are pre-hardware: the DNA interface itself, how polymerase behaves on a tethered template at a charged electrode, surface chemistry and primer anchoring, and the amplification scheme. That research is what constrains the simulator's physics and defines the wet-lab protocol for single-pixel validation, which is the first experiment he runs once we have a pixel.

We use AI heavily, for code, simulation, and literature work, and we think that is the point rather than a caveat. Our thesis is that the model is the instrument: the chip is a cheap passive array, and every gain in model capability upgrades the product without touching the silicon. A company built on that thesis should be run the same way internally, which is how three people cover semiconductor design, electrochemistry, ML, and molecular biology at once. The founders own every architectural decision and review every line.

## Who are your competitors? Who do you fear most?

Sequencing incumbents: Illumina (optical SBS, the volume leader), PacBio and Oxford Nanopore (long read), Ultima and Element (cost/throughput plays), and Thermo Fisher's Ion Torrent — the one direct precedent for label-free semiconductor sequencing, which validates the *category* while making the opposite molecular trade (base-agnostic proton pulse, sequential flooding, wash between flows).

Who we fear most is not a sequencing company — it's whoever else realizes that a passive electrode array plus a decoding model is a general sensing platform and moves faster across chip formats. The defensibility is the specific inventive stack (AC-EIS readout of active synthesis, the vertical Pt/Au dual-role electrode, wash-free all-four-natural-dNTP operation, the faradaic discrimination axis, and active high-frequency sensing-depth extension), not the abstract idea of "EIS + ML," which is old. Our moat is the accumulated model + simulator + calibration flywheel across many chips, plus the patent family around the transduction mechanism.

## How do or will you make money? How much could you make?

Razor-and-handle: sell the reader once, sell chips repeatedly. The sequencing chip's surface is reusable for 50–100 runs, so the consumable cost floor is dramatically below single-use flow cells — the cost advantage is structural (delete optics/flow cell/wash), while accuracy is the risk we are closing. Land with sequencing into the ~$21B, ~22%-CAGR sequencing market; expand by shipping new chip formats (pathogen, bioreactor monitoring, oncology/point-of-care) on the same installed reader base, which is where the platform TAM compounds beyond sequencing alone.

[PLACEHOLDER — order-of-magnitude revenue math: reader ASP × installed base + chips/run × runs/year. Keep it a defensible back-of-envelope, not a hockey stick.]

## Equity / formation / investment

- Legal entity: [PLACEHOLDER — status; Business Plan roadmap lists "pre-LLC business items (entity status, assignments)" as pending.]
- Investment taken: [PLACEHOLDER — none / details.]
- Currently fundraising: [PLACEHOLDER — NSF SBIR (NSF 26-511 instrumentation pilot, Nov 4 2026 target) is the non-dilutive track; angel/pre-seed gates on single-pixel validation. See [[Funding]].]

## Team

We are [N] co-founders. [PLACEHOLDER — for each: name, role, background, and the one credential that makes them the right person for that slot. YC reads this section hardest of all; make each bio a reason-to-believe, not a résumé line. Map founders to the three pillars this company needs to cover: (1) the electrochemical sensor + fab stack, (2) the ML/basecaller, (3) the biology/surface chemistry + go-to-market. Name explicitly who owns which. If one founder currently owns most of the technical stack per the whitepaper, still frame the division of labor going forward.]

Why this team wins: [PLACEHOLDER — one or two sentences on what you've built together, how long you've worked together, and why you specifically are the ones who see that EIS + AI is a general instrument and not just a sequencer.]

---

## Open items to finish this (F26, ~4 days)

Decided: **F26 batch**, **co-founder team**. Remaining:

1. **Co-founder bios** — names, roles, backgrounds, and who owns which of the three pillars (sensor/fab, ML, biology/GTM). Biggest remaining gap; YC reads this hardest.
2. **Founder video** — YC requires a ~1-min video of the founders together. Non-negotiable for submission; plan to record it in the next 1–2 days.
3. **Entity + investment status** for the equity section.
4. **Revenue math** — say the word and I'll draft the back-of-envelope (reader ASP × installed base + chips/run × runs/year).
5. **Product URL / demo** — whitepaper link, site, or the Dodgson basecaller results to point at.
