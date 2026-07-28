# Throughput & Competitive Landscape

Status: DRAFT — analysis, 2026-07-07. Runtime figures are **derived from simulator kinetics + whitepaper geometry**, not measured (no chip exists — [[Whitepaper|Whitepaper §3]]). Competitor figures are vendor/literature, mid-2026, sourced below. Read with [[Whitepaper]], [[Appendix]], [[Business Plan]].

---

## 0. Summary

1. **Speed per chip.** Sequencing time is set by polymerase kinetics (~**0.12 s/base**, ~8.5 bases/s/cluster): the loop is wash-free and all pixels run in parallel, so wall-clock scales with read length and pixel count, not a per-cycle wash. But pixels read through a **shared multiplexed path**, so useful throughput scales with **readout-channel count**, not raw pixel count (§1.4). The full-spec 960×960 chip is a **demonstrator**; genome-in-under-an-hour needs **panel scale (~10⁸ pixels)** — the flat-panel-economics bet.
2. **Why incumbents cost more / run slower:** they pay for **optics + consumable flow cells + a per-cycle wash**. ECSEQ deletes all three — a real structural advantage. **On accuracy the comparison is inverted:** competitors ship *demonstrated* Q20–Q40 over billions of real bases; ECSEQ-1 has ~88% per-read *in simulation only*. Our accuracy claim is architectural potential, gated on single-pixel hardware validation.

---

## 1. Runtime derivation

### 1.1 Per-base timing
Each incorporation is three polymerase states (`simulator/config/kinetics.yaml`; phi29 IPD × 0.45 Bst 2.0 factor, 65 °C):

| State | Distribution | Mean |
| --- | --- | --- |
| Searching | exponential | ~10 ms |
| Chemistry (EIS window) | gamma, base-dependent | G 116 / C 90 / T 78 / A 66 ms |
| Translocation | exponential | ~20 ms |

Mean chemistry dwell = **87.5 ms**, so $t_{\text{base}} \approx 10 + 87.5 + 20 = \mathbf{117.5\ ms}$ → **~8.5 bases/s/cluster**.

The 50-point spectrum (100 Hz–100 kHz, `DEFAULT_FREQS_HZ`) is acquired *inside* the chemistry dwell — concurrent with incorporation, so per-base time is polymerase-limited, not measurement-limited. But the fit is tight: the 100 Hz floor (10 ms period) is set by the shortest (A, ~66 ms) dwell, and one sweep barely fits one incorporation. This caps signal per event (not throughput) — logged as [[Risks & Kill-Criteria|Risks #4]]; derivation [[Appendix|Appendix B.2]].

### 1.2 Wall-clock per run
Clusters extend simultaneously, so sequencing depends only on read length **L**: $t_{\text{seq}} = L \times 0.1175$ s → 100 b ≈ 12 s, 300 b ≈ 35 s, 500 b (design target) ≈ 59 s.

**The real wall-clock floor is setup, shared with everyone:** sample loading, priming, and isothermal [[Definitions|bridge amplification]] to ~1000-copy clusters run once, ~30–45 min (to be measured). "Wash-free" removes the *per-cycle* wash, not one-time prep ([[Whitepaper|Whitepaper §2.4]]). Honest split: **instrument sequencing ≈ 1 min; sample-to-answer ≈ under an hour, prep-dominated.**

### 1.3 Throughput scales with pixel count
2 µm pitch = 4 µm²/pixel. Bases/run = active_pixels × L (L = 600):

| Configuration | Pixels | Active area | Bases/run | 30× human runs | Instr. seq/run |
| --- | --- | --- | --- | --- | --- |
| **Prototype** (4 px, direct-wired) | 4 | ~16 µm² | 2.4 kb | validation only | ~70 s |
| **Lab array** (128×128) | 16,384 | 0.066 mm² | 9.8 Mb | ~9,800 | ~70 s |
| **Full spec** (960×960) | 921,600 | 3.69 mm² | 553 Mb | ~174 | ~70 s |
| **Panel-scale** (~12,650²) | ~160 M | ~640 mm² | 96 Gb | **1** | ~70 s |

Human genome = 3.2 Gb; 30× clinical bar = 96 Gb.

- **The 960×960 chip is not a genome sequencer:** 553 Mb/run → ~174 serial runs (each needs fresh clusters) for 30×. It's a discrimination demonstrator / low-Gb targeted-panel device, as [[Whitepaper|scoped]]. The 50–100-run reuse figure is surface regeneration, not turnaround.
- **"Sub-hour genome" is a panel-scale claim:** 96 Gb/run needs ~160 M pixels (~640 mm², ~25 mm square). Absurd on CMOS; modest on flat-panel fab (passive thin-film, no per-pixel transistors, defect-tolerant — [[Whitepaper|§2.1]]). At ~1 run/hr → ~2.3 Tb/day, a PromethION-48 rack on one panel — *if the per-pixel signal is real.*

Invariant: total sequencing time for base budget **B** = $(B/\text{pixels}) \times 0.1175$ s, independent of read length — time-to-genome is a pure function of **pixel count**, *subject to the §1.4 readout ceiling.*

### 1.4 The readout ceiling (Amdahl)
§1.3 assumes every pixel is read every incorporation; it can't be. The array is a **passive matrix** (no per-pixel transistor — the yield/cost bet, [[Whitepaper|§2.1]]), so all spectra exit via a **shared, multiplexed** path (`mux_on_resistance_ohm`, `simulator/config/noise.yaml`; the prototype's 4 pixels are direct-wired to avoid this). Incorporation is parallel and free; **readout is serial.**

**(a) Prep caps single-run speed.** Serial fraction $s = T_{\text{prep}}/(T_{\text{prep}}+T_{\text{seq}}) \approx 35/36 \approx 0.97$, so Amdahl caps any speedup at $1/s \approx 1.03$. **Pixels buy throughput, never latency** — the sample-to-answer floor is prep, shared with every platform in §2.

**(b) Readout bandwidth caps useful parallelism.** A base must be captured *during* its chemistry window. Shortest = A ~66 ms; one acquisition at the 100 Hz floor ≈ 10 ms. One channel round-robining $m$ pixels revisits each every $m\cdot T_{\text{acq}}$, so $m \le 66/10 \approx 6.6$ pixels/channel. With $N_{\text{read}}$ channels: $P_{\text{active,max}} \approx 6.6\,N_{\text{read}}$ (derate to ~3·$N_{\text{read}}$ for random event phase). Effective throughput is $\min(P,\ 6.6\,N_{\text{read}})$; physical pixels beyond that return deletion-riddled reads. Channels needed to run fully parallel:

| Configuration | Pixels | Channels ($P/6.6$) | On flat-panel drivers? |
| --- | --- | --- | --- |
| Prototype | 4 | 1 | trivially |
| Lab 128×128 | 16,384 | ~2,500 | yes — one driver-IC chain |
| Full spec 960×960 | 921,600 | ~140,000 | yes — dozens of stitched column drivers |
| Panel-scale 12,650² | ~160 M | ~24 M | **no single panel** |

The scaling quantity is **readout-channel count, not pixel count**; §1.3 holds while $N_{\text{read}} \ge P/6.6$. This survives at chip scale because flat-panel *driver* economics match its *pixel* economics — a 4K source-driver chain switches 10³–10⁴ columns and panels stitch dozens, so 10⁵–10⁶ channels (the full-spec chip) is ordinary display hardware. What strains is the genome-in-one-run panel: ~24 M synchronized channels exceeds one panel's budget, so "sub-hour genome" resolves to **many panels** or an accuracy-for-throughput trade (undersample, let 30× consensus absorb the deletions). A soft knob, not a cliff — but the missing term in §1.3.

**Resolution — multiplexed peripheral readout.** The $6.6\,N_{\text{read}}$ ceiling assumes one front-end per pixel. Frequency/code-division multiplexing at the array edge (orthogonal carriers summed onto shared fast ADCs, demuxed digitally) collapses front-end count from ~10⁷ to a few thousand ADCs — pixels stay passive — at the cost of shared per-pixel SNR. Full worked estimate (30 mm² chip → single-run ~36-min 30× genome) in [[Whitepaper|§4.1]].

---

## 2. Competitive landscape

### 2.1 The field

| Platform | Mechanism | Instrument | Cost / 30× genome | Run time | Demonstrated accuracy |
| --- | --- | --- | --- | --- | --- |
| **Illumina NovaSeq X Plus** | optical SBS, short read | ~$1.25 M | ~$200 (at scale) | ~24–48 h | >Q30 for ~85% of bases |
| **PacBio Revio** | SMRT real-time, HiFi | ~$779 k | ~$300–345 (20×) | ~24 h | median ≥Q30 HiFi |
| **Oxford Nanopore PromethION** | nanopore, long read | P2 low-$10⁴s / P48 rack | ~$345 / 100 Gb | 72 h/flow cell | Q20+ simplex, Q30 duplex |
| **Ultima UG 100** | optical SBS, spinning wafer | ~$1–1.5 M | **~$80–100** | ~20 h | high SNV; indel-limited |
| **Element AVITI** | avidity SBS, benchtop | ~$289 k | ~$5/Gb ($200–450) | ~24–48 h | Q40 |
| **Ion Torrent** | pH/proton, semiconductor | ~$50–80 k | — | ~2–7 h | ~1.7% raw; homopolymer indels |
| **ECSEQ-1** | electrochemical impedance, wash-free | *thesis: passive array + cheap reader* | *thesis: reagent-floor* | *instrument ~min; prep-bound* | **~88% per-read, simulation only** |

### 2.2 Why they cost more
Root cause: **optics + a consumable flow cell.** Optical platforms carry lasers, cameras, objectives, temp control, and fluidics — most of the $0.3–1.25 M — then every run burns a consumable (Illumina 25B kit **$11.7k–14.5k**; PacBio/Nanopore similar per-run). The "$200/$100 genome" is the reagent floor at max scale on the largest flow cell, not per-sample price. ECSEQ attacks this: passive thin-film electrode array (no optics, no per-pixel transistors), reusable surface (50–100 runs, thiol-gold anchor), all four natural dNTPs from one pool — recurring cost collapses to buffer + polymerase + natural dNTPs, chip amortizes. *Caveat: projected BOM, not demonstrated price ([[Business Plan]]).*

### 2.3 Why they're slower
Cyclic SBS (Illumina, Element, Ultima) is **wash-limited**: hundreds of incorporate→wash→image→cleave→wash cycles, fluidic exchange + imaging dominating the ~24–48 h run. The wash only clears labelled nucleotides — exactly what ECSEQ removes by reading intrinsic electrochemical signal in real time ([[Whitepaper|§2.4]]). Real-time platforms (PacBio, Nanopore) have no wash but are ZMW/pore-count-bound, still 24–72 h for coverage. ECSEQ: per-base = polymerase kinetics (~0.12 s), parallel across pixels → **instrument sequencing in minutes.** *Caveats:* one-time prep still costs tens of min (the floor); genome-scale speed needs panel-scale arrays (§1.3); incumbents' times are full-genome-today vs. our instrument-time-if-signal-exists.

### 2.4 Accuracy — the claim to handle most carefully
**Today the accuracy comparison runs against us.** Illumina (Q30–Q40), PacBio HiFi (Q30), Element (Q40), Nanopore (Q20+/Q30) are *demonstrated on shipping products over billions of real bases.* ECSEQ-1's ~88% is *simulated, pre-hardware, per-read.* On present evidence it's the least proven. What's *defensible* is where accuracy can go:
- **Coverage collapses the residual.** Per-read error is dominated by per-event within-group confusion (A↔G, C↔T), largely independent across reads → at ~30× the consensus clears Q30 in simulation ([[Whitepaper|§3.1]]). Product metric is consensus, not per-read.
- **The instrument improves without touching the chip** — accuracy is carried by the temporal transformer ([[Whitepaper|§2.5]]); no competitor can upgrade a shipped flow cell's chemistry by software.
- **Natural-base, wash-free read avoids phasing/pre-phasing** dephasing that caps SBS read length.

**The Ion Torrent cautionary tale:** the last semiconductor sequencer to market died on **homopolymer indels** (~1.7% raw) because counting cumulative proton release can't resolve run length. ECSEQ must prove its kinetic+molecular+temporal read doesn't inherit an analogous failure — the A↔G/C↔T confusion ([[Whitepaper|§3.1]]) and proposed faradaic axis ([[Appendix|Appendix C]]) are the cells to watch. The single-pixel experiment ([[Whitepaper|§3.2]]) gates this entire argument. See [[Risks & Kill-Criteria]].

---

## 3. Bottom line

- **Cost & speed:** a *structural* advantage (no optics, flow cell, or per-cycle wash) — incumbents' expense and 24–72 h runtimes are direct consequences of machinery ECSEQ deletes. Sound today, as a thesis.
- **Accuracy:** ECSEQ is currently the *least* proven (simulation only); the case is coverage-plus-AI, contingent on hardware. Overclaiming invites the Ion Torrent comparison.
- **Scaling:** time-to-genome scales with **readout-channel count**, not raw pixel count (§1.4) — ~$6.6\,N_{\text{read}}$ pixels run usefully; the rest is dead weight. Sub-hour genome is real only at panel scale (~10⁸ pixels) *and* panel-scale readout (~10⁷ channels, many stitched panels) — the flat-panel bet the company rests on. And prep is ~97% of a single run's wall-clock: parallelism buys throughput, never a faster run.

---

## Sources

Competitor figures (accessed 2026-07-07):

- Illumina NovaSeq X — [$200 genome / >Q30 spec](https://www.illumina.com/systems/sequencing-platforms/novaseq-x-plus/specifications.html); [25B kit $11.7k–14.5k](https://www.genomeweb.com/sequencing/illuminas-new-novaseq-x-kits-offer-potential-cost-efficiency-benefits-core-labs)
- PacBio Revio — [$300–345/genome, 24 h, ≥Q30 HiFi](https://www.pacb.com/revio/); [~$779k](https://aseq.substack.com/p/why-does-pacbios-new-sequencer-cost)
- Oxford Nanopore PromethION — [Q20/Q30](https://nanoporetech.com/platform/accuracy); [72 h flow cells](https://nanoporetech.com/products/sequence/promethion)
- Ultima UG 100 — [$100 (→$80), ~20 h](https://genomics.umn.edu/service/ug-100-sequencing); [$100-genome / accuracy](https://www.genengnews.com/topics/omics/ultima-genomics-bursts-onto-ngs-scene-targeting-the-100-genome/)
- Element AVITI — [Q40, $5/Gb, 360 Gb/48 h](https://blog.latch.bio/p/a-primer-on-ngs-technologies-and)
- Ion Torrent — [semiconductor sequencing / homopolymer error](https://en.wikipedia.org/wiki/Ion_semiconductor_sequencing); [raw error 1.71%](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5556038/)

ECSEQ-1 figures derived from `dev/dodgson/simulator/config/kinetics.yaml`, `simulator/electrochemical.py` (`DEFAULT_FREQS_HZ`), `simulator/config.py`, and [[Whitepaper]] geometry (2 µm pitch, 960×960).
