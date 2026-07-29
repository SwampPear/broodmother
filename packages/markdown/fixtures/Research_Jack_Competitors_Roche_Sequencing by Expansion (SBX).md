# Roche — Sequencing by Expansion (SBX)

Status: **Currently selling** — AXELIOS 1 launched commercially 2026-06-29 *(publicly reported, high confidence — Roche press release)*. **Research-use-only (RUO); explicitly not for diagnostic use** as of this launch. Researched/compiled 2026-07-19. Confidence and source labels follow the vault convention: *(publicly reported / independently measured / calculated from reported data / estimated / unavailable)*.

Note on an earlier naming error in this vault's research process: SBX instruments were initially guessed to be named "Vega" and "Aria." That guess was wrong — "Vega" turned out to be an unrelated PacBio benchtop product (coincidental name collision). Roche's real product, confirmed directly from roche.com and diagnostics.roche.com, is **AXELIOS 1**, comprising a **Synthesis Instrument** and a **Sequencing Instrument**.

## 1. Company & market position

- Roche Sequencing Solutions (part of Roche Diagnostics) has cycled through three fundamentally different sequencing technologies:
  1. **454 pyrosequencing** (2007–2016) — acquired, then discontinued (see §8).
  2. **Genia nanopore program** (2014 acquisition) — semiconductor/nanopore technology, integrated into the Roche Sequencing Unit; ultimate fate unclear (see §8).
  3. **Sequencing by Expansion (SBX)** — Roche's current, internally developed platform. First technically unveiled 2025-02-19/20 with a companion bioRxiv preprint *(publicly reported, high confidence — Roche press release; bioRxiv preprint 10.1101/2025.02.19.639056 exists but returned HTTP 403 on direct fetch this pass and could not be independently read — its existence is confirmed via Roche's own citation of it, contents described here come from Roche's own technical explainer, not the preprint itself)*. Commercially launched as the AXELIOS 1 instrument 2026-06-29.
- Positioned by Roche explicitly against high-throughput short-read incumbents: launch messaging emphasizes "record-breaking speed," same-day whole-genome turnaround, and cost efficiency — the same value proposition Illumina's NovaSeq X and MGI's DNBSEQ-T7 compete on. *(publicly reported, medium confidence — marketing framing, not independently benchmarked)*

## 2. Platform profile

| Attribute | Detail |
|---|---|
| Sequencing chemistry | **Sequencing by Expansion (SBX):** a polymerase-mediated process using "expandable nucleotide triphosphates" (X-NTPs) — each carrying a reporter code corresponding to the original base, a translocation-control element, synthesis enhancers, and an acid-cleavable bond — to enzymatically copy a DNA template into a much longer surrogate molecule called an **Xpandomer**, reported by Roche as ~50× the length of the original molecule. |
| Detection method | **Electrical, single-molecule nanopore** — not optical. A reusable CMOS-based sensor array (>8 million microwells, each housing one nanopore) reads the Xpandomer as voltage pulses drive it through the pore **one reporter code at a time**, in a massively parallel but individually controlled manner. |
| Amplification method | **None (single-molecule).** Each library molecule is enzymatically converted 1:1 into one Xpandomer copy — this is not PCR/clonal amplification, placing SBX in the same amplification-free category as ONT nanopore and PacBio SMRT, not the clonal-cluster category of Illumina/MGI/Element/Ultima. |
| Array architecture | Two-instrument system: a **Synthesis Instrument** (converts library → Xpandomer, up to 4 library pools in parallel, ~4 hr) feeding a **Sequencing Instrument** (CMOS nanopore sensor array, >8M wells, reusable across 20 runs, up to 4 Xpandomer pools queued sequentially). |
| Typical applications | Germline/somatic whole-genome sequencing; single-cell RNA-seq explicitly named as a supported workflow. |
| Major advantages | Non-optical detection removes the imaging/camera bottleneck entirely; the expansion step gives a nanopore-based system deliberately slow, discretized, voltage-controlled translocation instead of native DNA's fast continuous threading — directly addressing the base-calling ambiguity that raw nanopore sequencing struggles with (see §4); very high per-run yield (≥1.8 Tb per 4-hour run) and per-day genome throughput (up to 64 human genomes/day) for a research-scale system; near-real-time analysis ("complete reads... generated on the order of seconds"); reusable sensor module amortizes consumable cost differently than single-use flow cells. |
| Major limitations | RUO only — no diagnostic/clinical positioning yet; no independent (non-Roche) benchmarking exists this early; very large, heavy, power-hungry two-instrument footprint (Sequencing Instrument alone: 1,380×1,644×760 mm, 438 kg, dual 200–240V/30–32A supply) — a core-lab system, not benchtop; duplex (highest-accuracy) mode's mean insert length is only ~230–260 bp even though the underlying Xpandomer chemistry supports reads to ~1,500 bp in simplex mode, so the accuracy/length tradeoff in practice favors short-to-medium fragments, not true long-read applications; no pricing publicly disclosed as of this research (a "$150 genome" figure appears in trade-press headlines, e.g. GenomeWeb, but the source article could not be independently accessed this pass — HTTP 403 — so this number is *unavailable/unverified*, not confirmed, and should not be treated as established). |
| Regulatory/clinical positioning | Explicitly "for research use only. Not for use in diagnostic procedures" at launch. No FDA/IVD clearance found. *(publicly reported, high confidence — stated directly in the launch release)* |

## 3. Physical pipeline: hair strand → prepared library → electrical signal

**A. Sample to purified DNA** *(this stage is essentially platform-agnostic; same core steps as other companies in this vault)*
1. Hair is collected with the root/bulb attached — the bulb's follicular cells carry nuclear DNA.
2. The bulb is lysed (detergent + proteinase K).
3. Genomic DNA is purified (silica-column or paramagnetic-bead binding) and eluted into buffer.
4. DNA is quantified and quality-checked (purity ratios, fragment-size distribution).

**B. Library preparation**
5. Genomic DNA is fragmented and adapters are ligated, producing a standard NGS-style library (fragment sizes consistent with SBX's reported duplex insert range of roughly 200 bp to several hundred bp, with simplex mode able to use inserts up to ~1,500 bp — exact library-prep kit specifications *unavailable* in sources found this pass).
6. Libraries are pooled into up to four independent "library pools" that the Synthesis Instrument can process in parallel.

**C. Xpandomer synthesis (Synthesis Instrument, ~4 hr)**
7. Each single library molecule is used as a template for a polymerase reaction that incorporates X-NTPs instead of ordinary dNTPs — one X-NTP per original base, each carrying a distinct reporter code plus structural elements for controlled pore transit.
8. This enzymatic copying — not PCR — produces one Xpandomer per original template molecule, roughly 50× longer than the source DNA, encoding the original sequence in the corresponding string of reporter codes.
9. An acid-cleavable bond in the X-NTP backbone allows post-replication "expansion" (release/unfolding) of the Xpandomer into its extended, readable form.

**D. Loading onto the Sequencing Instrument**
10. Xpandomer pools are transferred to the Sequencing Instrument's CMOS sensor array — a reusable module (rated for 20 runs) containing more than 8 million microwells, each with one nanopore.
11. Up to four Xpandomer pools can be queued and sequenced sequentially on one sensor module.

**E. Electrical signal generation and read-out**
12. Voltage pulses drive each Xpandomer through its nanopore, advancing it **one reporter code at a time** — a deliberately controlled, discretized translocation rather than the fast, continuous threading of native double-stranded DNA used in unmodified nanopore sequencing.
13. Each reporter code produces a distinguishable electrical signal as it transits the pore; the CMOS sensor beneath each well digitizes this signal in a massively parallel readout across all active wells simultaneously.
14. Software translates the reporter-code signal stream back into the original DNA base sequence in near-real-time ("reads... generated on the order of seconds" once translocation completes).

**F. Duplex consensus (SBX-Duplex mode)**
15. For double-stranded input molecules, both the original and complementary strands are independently converted to Xpandomers and sequenced; software reconciles the two independent reads of the same original molecule into a duplex consensus call, reaching the platform's headline ~Q38 average accuracy.

**G. Downstream**
16. Reads are demultiplexed by sample, aligned to a reference genome, and variants/coverage are built up as in any short/medium-read workflow.

## 4. Instrument-level comparison

Only one instrument generation exists (AXELIOS 1, launched 2026-06-29), with two read modes functioning as the "configuration" axis:

| Attribute | SBX-Duplex (SBX-D) | SBX-Simplex |
|---|---|---|
| Input molecule | Double-stranded DNA, both strands independently converted and reconciled | Single-stranded DNA/RNA, one strand read |
| Mean/typical read (insert) length | ~230–260 bp (post-consensus, adapter-trimmed) *(publicly reported, high confidence — Roche product page)* | Range from <200 bp up to ~1,500 bp "under appropriate sample and library prep conditions" *(publicly reported, medium confidence — range given without a stated typical/median)* |
| Raw-read accuracy | Not separately disclosed *(unavailable)* | Not disclosed *(unavailable)* |
| Consensus (duplex) accuracy | ~Q38 average concordant duplex base accuracy, validated against Genome in a Bottle (GIAB) reference samples *(publicly reported, high confidence — Roche product page states this explicitly with GIAB as validation basis)* | Not applicable (no duplex reconciliation in simplex mode) |
| Primary use case | High-accuracy 30× human WGS (germline/somatic) | Applications tolerant of lower/unstated accuracy needing longer molecules |

**Aggregate throughput (both modes draw from the same instrument):**

| Metric | Value | Label |
|---|---|---|
| Yield per 4-hour sequencing run (SBX-D) | ≥1.8 Tb | publicly reported, high confidence |
| Human genomes per 4-hour run (30× duplex-consensus coverage) | ~16 | publicly reported, high confidence |
| Single run time (incl. setup/cleanup) | ~5.5 hr | publicly reported |
| Four queued runs, total time | ~22 hr | publicly reported |
| Sequencing-only duration range | ~15 min to 4 hr, configuration-dependent | publicly reported |
| Synthesis Instrument cycle time | ~4 hr max | publicly reported |
| Max genomes/day (scaled) | up to 64 | publicly reported — consistent with ~16 genomes × 4 queued runs in ~22 hr |
| Sensor array size | >8,000,000 wells (nanopores), reusable across 20 runs | publicly reported |
| Parallel library pools (synthesis) | up to 4 | publicly reported |

**Instrument physical/capital specs:**

| | Synthesis Instrument | Sequencing Instrument |
|---|---|---|
| Dimensions (W×H×D) | 780×810×675 mm | 1,380×1,644×760 mm |
| Weight | 108 kg | 438 kg |
| Power | 100–120V or 220–240V, 50/60 Hz | 2× 200–240V AC, 30–32A |
| Network | — | 2× 10 Gbps, dedicated connection recommended |

*(all publicly reported, high confidence — Roche product specification page)*

**Cost figures — reagent cost, cost/run, cost/Gb, cost/million reads, cost per 30× genome, instrument list price:** all **unavailable**. No pricing has been publicly disclosed by Roche as of 2026-07-19. A "$150 genome" figure appears in a GenomeWeb headline found via search, but the underlying article returned an HTTP 403 error on direct fetch and could not be independently verified in this research pass — it is flagged here only as an unverified claim reported to exist in trade press, not as a confirmed number, and is explicitly excluded from any calculated figures below.

**Hands-on prep time / sample-to-answer time:** Roche markets "end-to-end, same-day whole-genome sequencing... with accurate results within hours," implying a sample-to-answer time on the order of a single working day, but a precise hands-on-minutes figure is *unavailable*.

## 5. Application specialization

| Application | Fit | Why (physical mechanism) |
|---|---|---|
| Short-read-equivalent WGS (30×) | **Strong** | SBX-Duplex's ~230–260 bp consensus reads and Q38 accuracy target exactly the use case Illumina/MGI serve; Roche is explicitly positioning against that market. |
| Long-read structural variant / phasing / assembly work | **Weak** | Even simplex mode's ~1,500 bp maximum is an order of magnitude short of true long-read platforms (ONT: tens of kb to Mb; PacBio HiFi: ~15–20 kb). SBX is best understood as "extended short/medium-read," not a long-read replacement. |
| Rapid/same-day sequencing | **Strong** | Native design goal; near-real-time base-calling plus a ~5.5 hr single-run cycle supports same-day turnaround claims. |
| Single-cell RNA-seq | **Supported** (explicitly named by Roche) | Mechanism-specific advantage/limitation not detailed in sources found this pass — *unavailable*. |
| Clinical diagnostics | **Not currently applicable** | RUO-only at launch; no regulatory clearance. |
| Homopolymer/indel-error resistance | **Likely favorable, but unconfirmed independently** | The core design principle — converting each original base into a discrete, individually-coded, voltage-paced reporter unit transiting the pore "one reporter code at a time" — is structurally analogous to how cyclic, one-base-at-a-time chemistries (Illumina SBS, Ion Torrent flows) avoid the ambiguous multi-base current signal that raw/native-DNA nanopore sequencing must deconvolve from overlapping k-mers in the pore's sensing region. If this holds up under independent testing, SBX should have fewer homopolymer-driven indel errors than native ONT nanopore sequencing — but no independent accuracy-by-error-type study was found this pass, so this is *reasoned from the described mechanism, not an independently measured result*. Confidence: low-medium. |
| Metagenomics, targeted panels, methylation, pharmacogenomics, spatial biology | *Unavailable* | Not addressed in sources found this pass; too new a platform to have established literature. |

## 6. Quantitative scalability framework

**Horizontal scaling:**
- Total physical sensing sites: >8,000,000 nanopores per sensor module *(publicly reported)*.
- Active/usable sites, occupancy rate, % producing passing reads: *unavailable* — Roche has not published per-well yield statistics.
- Simultaneous molecules being sequenced: up to 8,000,000 (one Xpandomer per active, loaded nanopore), assuming full occupancy — *estimated*, since real occupancy is unknown.
- The sensor module's reusability (rated 20 runs) is a horizontal-scaling-economics difference from single-use flow cells/chips used by every other platform in this vault: the "consumable" unit is amortized across 20 runs rather than one, which changes the cost-per-run curve in a way that can't be captured by a simple per-flow-cell cost/Gb figure without pricing data (unavailable).

**Vertical scaling — calculated estimate, stated assumptions:**
- Bases per active site per second ≈ (1.8×10¹² bases) ÷ (8×10⁶ sites) ÷ (4 hr × 3,600 s/hr) ≈ 225,000 bases/site ÷ 14,400 s ≈ **~15.6 bases/site/second**. *(Calculated from reported data. Assumption: all 8M sites are active and productive for the full 4-hour run — almost certainly an overestimate of true occupancy, so this is a floor/conservative per-site rate, not a true measured value. Confidence: low.)*
- Instruments required for 1 Tb/day: at up to ~64 genomes/day × ~90–100 Gb/genome (30×) ≈ 5.8–6.4 Tb/day theoretical max per instrument, **well under 1 instrument** is needed for 1 Tb/day. *(Calculated from reported data, high confidence in the arithmetic, medium confidence in the underlying 64-genomes/day figure holding at full utilization.)*
- Instruments needed for 100 / 1,000 / 10,000 genomes/year, assuming ~75% realistic utilization of the 64-genomes/day theoretical max (≈48 genomes/day, ≈17,520 genomes/year per instrument): **100 genomes/year → a small fraction of one instrument; 1,000 genomes/year → still well under one instrument; 10,000 genomes/year → ~0.6 instruments, i.e. one instrument comfortably covers it.** *(Calculated from reported data; 75% utilization is an assumed, not vendor-stated, figure.)*
- Primary physical bottleneck: not sensor count (8M sites is very large) but the **two-stage instrument architecture and queueing** — the Synthesis Instrument's ~4 hr cycle and the Sequencing Instrument's ability to queue only 4 pools sequentially caps daily genome count regardless of sensor count, meaning SBX scales more naturally today by **running more instrument-pairs in parallel (horizontal, at the whole-instrument level)** than by increasing per-run yield on a single sensor module, since the sensor module itself already appears to be running near its architecturally-stated ceiling (>8M sites, 4 queued pools).

## 7. Competitive positioning

AXELIOS 1 competes most directly with the **same-day, high-throughput, core-lab WGS market** currently anchored by:
- **Illumina NovaSeq X / X Plus** — the incumbent this launch is explicitly framed against (speed, cost-efficiency claims).
- **MGI DNBSEQ-T7 / T7+** — the other high-daily-genome-count incumbent in the same research-core customer segment.
- **PacBio Revio** (duplex/consensus accuracy ambitions) and **Oxford Nanopore PromethION** (shares the nanopore-detection lineage, but SBX's expansion mechanism is a genuinely different physical approach, not a variant of ONT's chemistry) are adjacent competitors on the accuracy and nanopore-technology axes respectively, though neither targets the same short-insert, 30×-genome-per-day production niche as directly as Illumina/MGI do.

Principal customer group at launch: large-scale research genome-production labs (population genomics, biobanks, pharma R&D) — not clinical labs (RUO-only) and not point-of-care/portable users (438 kg, industrial three-phase-class power requirement rules that out entirely). Switching barriers, consumables lock-in, and IP-constraint specifics are *unavailable* this early in the product's commercial life — no independent market-share or adoption data exists yet for a platform three weeks old as of this research date.

## 8. Discontinued predecessor platforms

### Roche 454 (pyrosequencing) — discontinued
- Roche acquired 454 Life Sciences in 2007 for **$154.9 million** cash and stock *(publicly reported, high confidence)*.
- Mechanism: emulsion-PCR bead-based clonal amplification followed by **pyrosequencing** — light-based (luciferase chemiluminescence) detection of pyrophosphate released upon each nucleotide incorporation. This is a fundamentally different pipeline from SBX (optical/chemiluminescent vs. electrical/nanopore) and from Illumina SBS (fluorescence imaging vs. chemiluminescence), and is well known for severe homopolymer-length miscalling due to its light-intensity-proportional-to-run-length readout.
- Roche announced the shutdown of 454 in 2013, citing the technology becoming noncompetitive on cost/throughput versus Illumina short-read sequencing; production continued until it was fully discontinued **mid-2016**. *(publicly reported, high confidence — corroborated by Wikipedia, EMBL-EBI, and GenomeWeb historical reporting)*

### Genia Technologies (nanopore program) — outcome unclear
- Roche acquired Genia Technologies in 2014 for **$125 million cash plus up to $225 million in milestone payments** (total potential value $350 million) *(publicly reported, high confidence)*.
- Genia's technology: a single-molecule, semiconductor-based nanopore platform using proprietary "NanoTag" chemistry — tagged nucleotides producing distinguishable signals — rather than reading unmodified DNA current directly, a conceptual precursor in spirit (tag-based signal enhancement for nanopore reading) to SBX's later reporter-code approach, though no source found in this research pass confirms a direct technical lineage between Genia and SBX. Genia was integrated into the Roche Sequencing Unit.
- **What ultimately happened to the Genia program is unavailable** in sources found this pass — no discontinuation announcement, product launch, or explicit program closure was located. Any connection between Genia's technology and SBX's later development is *speculative and unconfirmed*, not stated in this note as fact.

## Sources

- Roche, "Roche announces the launch of AXELIOS 1, a transformative next-generation sequencing platform," press release, roche.com/media/releases/med-cor-2026-06-29, 2026-06-29. Publicly reported, high confidence.
- Roche Diagnostics, AXELIOS 1 product/specification page, diagnostics.roche.com/global/en/products/systems/axelios-1-sys-597.html, accessed 2026-07-19. Publicly reported, high confidence (primary vendor spec sheet).
- Roche, "Roche unveils a new class of next-generation sequencing with its novel SBX technology," press release, roche.com/media/releases/med-cor-2025-02-20, 2025-02-20. Publicly reported, high confidence.
- Roche Diagnostics, "SBX technology: Sequencing by expansion," LabLeaders technical explainer (quoting M. Kokoris), diagnostics.roche.com/global/en/lab-leaders/article/sbx-sequencing-by-expansion-technology.html, accessed 2026-07-19. Publicly reported, high confidence (primary vendor technical description).
- bioRxiv preprint 10.1101/2025.02.19.639056v1, "Sequencing by Expansion (SBX) — a novel, high-throughput single-molecule sequencing technology," referenced by Roche's own materials; direct fetch returned HTTP 403 in this research pass and contents were not independently verified — cited here as an existing but unread primary source. Confidence: existence high, content unverified.
- GenomeWeb, "Promising $150 Genome, Roche Reveals More Details of Axelios Sequencer" (AGBT coverage), genomeweb.com — direct fetch returned HTTP 403; only the headline/snippet was visible via search, full content not independently verified. The "$150 genome" figure is explicitly flagged as unverified/unavailable and excluded from all calculated figures in this note.
- Wikipedia, "454 Life Sciences" — acquisition and discontinuation timeline. Publicly reported, cross-corroborated with EMBL-EBI and GenomeWeb reporting, medium-high confidence.
- GenomeWeb historical reporting on the 2014 Genia Technologies acquisition (accessed via search snippet, primary GenomeWeb article not directly fetched). Publicly reported, medium confidence.

## Confidence summary

| Claim category | Confidence |
|---|---|
| AXELIOS 1 exists, launched 2026-06-29, RUO status | High |
| SBX mechanism (Xpandomer, X-NTPs, electrical nanopore detection) | High (from Roche's own primary technical materials) |
| Throughput/yield/genomes-per-run/instrument physical specs | High (primary vendor spec sheet) |
| Duplex accuracy (~Q38) | High (vendor-stated, GIAB-validated, but not independently reproduced) |
| Pricing, cost per run/Gb/genome | Unavailable — not disclosed |
| "$150 genome" trade-press figure | Unverified — explicitly not treated as confirmed |
| Genia program's ultimate fate | Unavailable |
| Homopolymer/indel error-resistance advantage over native nanopore | Low-medium (reasoned from mechanism, not independently measured) |
