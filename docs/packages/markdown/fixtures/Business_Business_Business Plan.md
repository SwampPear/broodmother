# Business Plan

## Required Sections

Standard structure for an investor/accelerator-facing plan, checked against what's drafted below. Status: DRAFT.

- [x] Executive Summary — opening thesis paragraph below; still worth tightening into its own standalone section
- [x] Problem — see [[#Problem]]
- [x] Solution / Product — see [[#Solution]]
- [ ] Market Analysis (TAM/SAM/SOM, segmentation) — \$21B figure cited in Problem/Why Now, no formal sizing breakdown yet
- [x] Competitive Landscape — see [[Throughput & Competitive Landscape]]
- [ ] Business Model — pricing, revenue model, unit economics (instrument vs. consumables, 50-100 reuse cycles)
- [ ] Go-to-Market — first customers, channel, land-and-expand path
- [x] Technology / IP — see [[#IP Landscape]], [[ECSEQ/IP & Patents/Patent Landscape & FTO Analysis]]
- [ ] Team — bios, roles, why this team
- [x] Roadmap / Milestones — see [[#Roadmap]]
- [ ] Financials — projections, burn rate, use of funds
- [ ] Funding Ask — amount, instrument, use of proceeds; [[Funding]] covers sourcing options but not yet a specific ask
- [ ] Risks & Mitigations — [[Risks & Kill-Criteria]] exists but isn't cross-referenced from this plan yet
- [ ] Traction / Validation status — single-pixel validation is named as the gate but not written up as a traction section
- [x] Platform / Company Thesis — general-purpose EIS sensing for medicine, sequencing as the wedge; see executive summary and [[#Platform: General-Purpose Sensing for Medicine]]

The latin ***Proprium***, meaning ***one's own, characteristic of, belonging to itself***, embodies our core thesis in that the emergent, evolution-tested behavior intrinsic in biological systems can provide something greater when integrated with modern materials and semiconductor technology.

**What we are building is an instrument, not a single product.** A cheap, passive silicon electrode array sits in contact with a biological sample and measures how that sample perturbs the electrode–electrolyte interface using electrochemical impedance spectroscopy (EIS); a neural network decodes that raw impedance signal into a clinical-grade answer. Because the sensing is electrical rather than optical, the chip carries no on-chip logic — a single benchtop reader (analog multiplexer + off-chip ADC) drives every chip we make. The intelligence lives in the model, so every gain in AI capability upgrades the instrument without touching silicon. The company shape is **one reader, many chips**: the reader is fixed, and each chip format targets a different measurement across medicine and research. This is the platform, and it is the company. Everything below is how we get there, starting from the hardest and largest first application.

Take DNA as an example. DNA is the most information-dense object and one of the most performant natural systems we’ve discovered. Decoding this performance is one of the deepest problems in science and the first step towards progress is revolutionizing how its read. This is the first problem we’re interested in.

Our first product is ECSEQ-1, a wash-free electrochemical sequencer, and its first commercial application is **short-read targeted DNA panels** — reading short, known stretches of DNA (oncology hotspots, pathogen ID, carrier screening) where a fast, cheap, lab-free readout matters more than read length. This is deliberate, not a fallback: the sensing physics bounds reads to tens of bases (a hard interfacial-screening limit, not an engineering gap), so we lead with the application that limit *fits* rather than fights. Sequencing is the **wedge**: base-calling is the harshest test of the platform — a four-way classification from a weak electrochemical signal against billion-dollar incumbents — so proving it on a panel proves the instrument. Whole-genome throughput (the \$100 1-hour genome) is the ceiling this same architecture climbs toward as accuracy and array scale mature, not the first sell. The easier medical sensing problems — presence/absence, concentration, multi-analyte panels — fall out of the same stack once the hard one holds.

# Goals

Our initial pre-funding goal is to validate the physics of our proprietary sequencing-by-kinematics method and learning capability of our base-calling model with a tremendously scaled down series of experiments on a homemade chip made possible with basic DIY semiconductor manufacturing procedures (huge thanks to Sam Zeloof).

Once the physics and model are validated, the first commercial target is a **short-read targeted panel at clinical-grade accuracy**. The binding requirement here is per-base accuracy (Q20), not read length or throughput — a panel reads known short loci, so read length is a non-issue and accuracy is the whole game. Reaching Q20 on real chemistry is what turns the simulator result into a product.

Granted we’re still early, our long-term goal is to climb the same architecture from panels up to whole-genome throughput: a 30x read of the 4.6 Mb *E. coli* genome at competitive cost as the scale-up milestone, and further out an instrument capable of processing on the order of 100,000 genomes per year. That ceiling is gated on Q20 base-calling and array scale — not on the sensing physics, which the short-read panel already exercises in full.

# Problem

The 2026 sequencing market is valued at \~\$21 billion and achieving rapid growth with a projected CAGR of \~22% from 2026-2033 \[0\]. While next-gen sequencing accounts for the overwhelming majority of that revenue \[0\] (sounds like a great time to shake up the sequencing world), the rapid growth of clinical diagnostics and the oncology market indicate \[0\] that not only is there immense economic interest in the issue (as evident by next-gen sequencing market share) but there is also a growing need for efficiency in time-sensitive industries like hospital care and clinical testing. With consumables driving most of the market \[0\], the industry could benefit from consolidation around exactly the use cases where cost and turnaround matter most.

All sequencing methods conventionally work by kickstarting the DNA transcription process and reading sequentially which base gets incorporated when. While current methods are different in their implementations they all possess a fundamental architectural limit in that distinguishing a base requires one process for determining *if* a base has incorporated and a completely separate process for determining *which* base incorporated. These two processes are repeated until a sufficient portion of the DNA has been read.

Current sequencing methods work like this to get around the tricky problem of DNA cluster dephasing dynamics, which is essentially the regularity of base incorporation events. With wash-based methods, it is a safe bet to incorporate one base at a time and read between incorporations. Here we are imposing an unnecessary bound on sequencing throughput by adding a costly procedure to avoid malformed data. The primary thesis of ECSEQ-1 is that malformed data, given a sufficient classification policy, can be transformed into art-level genetic data with incredibly greater throughput.

# Solution

ECSEQ-1 reads incorporation directly off a passive thin-film electrode array — no optics, no flow cell, no per-cycle wash. DNA is anchored to a vertical Pt/Au two-layer stack (thiol-gold bond, ALD Al₂O₃ isolation) and clustered in place by isothermal bridge amplification. All four natural dNTPs are present at once; a swept-frequency AC impedance measurement (EIS, 100 Hz–100 kHz) is acquired *inside* the polymerase's chemistry dwell, yielding a complex spectrum Z(ω) per event. A two-stage neural net (spectral encoder → temporal transformer) classifies the base from its kinetic and molecular signature.

**Physically distinct from the incumbents.** Illumina reads labelled nucleotides optically and washes between cycles; Ion Torrent reads a base-agnostic pH pulse under sequential single-dNTP flooding through an ISFET. ECSEQ reads the intrinsic electrochemical signal in real time — no labels, no optics, no wash, all four bases co-present.

**Validation gates everything.** The single-pixel experiment proves the one claim the company rests on: that real incorporation events produce distinguishable impedance signatures on the Pt/Au stack. Until that holds on hardware, the accuracy case is simulation. It is the first hardware milestone and the gate on IP, funding, and scale.

Cost, speed, and accuracy vs. Illumina, PacBio, Nanopore, Ultima, Element, and Ion Torrent → [[Throughput & Competitive Landscape]].

# Why Now?

- **AI is the instrument.** Every gain in model capability upgrades the sequencer without touching silicon — a lever that did not exist when Ion Torrent, the last semiconductor sequencer, launched.
- **Fab economics have arrived.** Flat-panel-display processes make large, passive, defect-tolerant electrode arrays cheap, and DIY semiconductor fabrication now puts a validation line within a small team's reach.
- **Funding tailwind.** SBIR/STTR was reauthorized in April 2026 with a \$250M restart, including a \$40M instrumentation pilot (NSF 26-511) that rewards new *measurement modalities* — squarely the wash-free electrochemical read. See [[Funding]].
- **Market pull.** A \~\$21B sequencing market growing \~22% CAGR, consumables-driven, with clinical and oncology demand for lower cost and faster turnaround.

# Competitive Landscape

Status: figures for incumbents are vendor/literature, mid-2026, sourced in [[Throughput & Competitive Landscape]]. ECSEQ-1 figures are **thesis/simulation, not measured** — no chip exists yet.

### Mechanism

| Platform | Company | Mechanism | Wash per cycle | Optics required |
| --- | --- | --- | --- | --- |
| NovaSeq X Plus | Illumina | Optical sequencing-by-synthesis, short read | Yes | Yes |
| Revio | PacBio | SMRT real-time optical, long read (HiFi) | No | Yes |
| PromethION | Oxford Nanopore | Nanopore, long read, ionic current | No | No |
| UG 100 | Ultima Genomics | Optical SBS, spinning wafer | Yes | Yes |
| AVITI | Element Biosciences | Avidity SBS, benchtop | Yes | Yes |
| Ion Torrent | Thermo Fisher | pH/proton, semiconductor (ISFET) | Yes (sequential dNTP flooding) | No |
| **ECSEQ-1** | **Proprium** | Electrochemical impedance (EIS), wash-free, all 4 natural dNTPs simultaneous | **No** | **No** |

### Cost, speed, accuracy

| Platform | Instrument cost | Cost / 30× genome | Run time | Demonstrated accuracy |
| --- | --- | --- | --- | --- |
| NovaSeq X Plus | ~\$1.25M | ~\$200 (at scale) | ~24–48 h | >Q30 for ~85% of bases |
| Revio | ~\$779k | ~\$300–345 (20×) | ~24 h | median ≥Q30 HiFi |
| PromethION | P2 low-\$10k's / P48 rack | ~\$345/100Gb | 72 h/flow cell | Q20+ simplex, Q30 duplex |
| UG 100 | ~\$1–1.5M | **~\$80–100** | ~20 h | high SNV; indel-limited |
| AVITI | ~\$289k | ~\$5/Gb (\$200–450) | ~24–48 h | Q40 |
| Ion Torrent | ~\$50–80k | — | ~2–7 h | ~1.7% raw; homopolymer indels |
| **ECSEQ-1** | *thesis: passive array + cheap reader* | *thesis: reagent-floor* | *instrument ~1 min; prep-bound (~1 h)* | **~88% per-read, simulation only** |

**Read carefully, not optimistically.** Cost and speed are a *structural* advantage today — ECSEQ-1 deletes optics, flow cells, and per-cycle wash, which is where incumbent price and runtime actually come from. Accuracy runs the other way: every incumbent above is demonstrated on shipping hardware over billions of real bases; ECSEQ-1's 88% is simulator-only and unvalidated on real chemistry. The single-pixel experiment is what converts that thesis into a measured number — see [[Risks & Kill-Criteria]]. Full derivation, per-platform sourcing, and the readout-channel scaling analysis: [[Throughput & Competitive Landscape]].

# IP Landscape

ECSEQ-1 clears the independent claims of every major electrochemical-sequencing family reviewed — Charge Perturbation Detection (CPD), Genapsys, PacBio/Roche nanoFET, and Ion Torrent ISFET. The primary structural differentiator is the **AC impedance spectroscopy readout** (swept-frequency Z(ω)) versus the voltage-clamp DC current pulse of CPD, the closest family. The open claim axes — AC-EIS readout of incorporation, the vertical Pt/Au stack, wash-free all-four-natural-dNTP operation, and an optional faradaic axis for residual A/G discrimination — form the basis of Provisional Patent No. 1, filed concurrent with single-pixel validation. This is internal analysis, not a legal opinion; a formal FTO from a registered attorney is required before public disclosure or fundraising. See [[ECSEQ/IP & Patents/Patent Landscape & FTO Analysis]].

# Platform: General-Purpose Sensing for Medicine

Sequencing is the first chip, not the last. The same asset — a passive label-free EIS electrode array plus an AI readout, driven by one reader — is a general-purpose molecular-sensing instrument. Each new capability is a **new chip on the same reader**, not a new instrument, so the reader's installed base is the distribution channel for everything that follows. That is where the platform TAM compounds beyond sequencing alone.

The expansion is staged, hardest-and-largest-first, and each stage reuses the reader and the model/simulator/calibration flywheel built by the one before it:

- **Stage 1 — DNA sequencing (ECSEQ-1), entering via short-read targeted panels.** The wedge. Short-read panels (known loci, tens of bases) are the near-term buildable product; whole-genome resequencing is the same chip further up the ladder, gated on accuracy and array scale. Validates the transduction physics and the decoding model against the harshest classification problem and the largest single market (~\$21B, ~22% CAGR).
- **Stage 2 — Point-of-care & home health.** Democratized diagnostics on the same reader: label-free pathogen detection, targeted molecular panels, and continuous multi-analyte biomarker monitoring — measurements that today require a reference lab's optics and fluidics, delivered by a cheap passive chip and a model. This is where the "instrument without a lab" thesis meets clinical demand for cost and turnaround.
- **Stage 3 — Phenotypic modeling.** Genome-to-expression readouts, feeding the population-scale genotype→phenotype data the platform is uniquely positioned to generate cheaply and in parallel.

Adjacent non-clinical chips (bioreactor metabolic monitoring, environmental/soil metabolite sensing) are real markets on the same reader but are not the medical spine; we name them as optionality, not focus.

The defensibility across all of this is not "EIS + ML," which is old, but the specific inventive stack proven by sequencing — AC-EIS readout of an active biological process, the vertical dual-role electrode, wash-free operation, and the accumulated model + simulator + calibration data that each new chip inherits. See [[#IP Landscape]].

# Roadmap

- simulated prototype (Dodgson / physics validation) — done
- whitepaper + provisional patent
- pre-LLC business items (entity status, assignments)
- fab line + physical prototype
- single-pixel validation
- funding (NSF SBIR, then angel / pre-seed)
- finalize team?

# References

- \[0\] [DNA Sequencing Market (2026-2033)](https://www.grandviewresearch.com/industry-analysis/dna-sequencing-market)
