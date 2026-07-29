# Element Biosciences — Avidity Sequencing

**Status: commercially selling.** Element Biosciences is privately held (no 10-K/annual report; funding/valuation figures below are labeled accordingly). AVITI shipped commercially from 2022; AVITI24 launched 2024; VITARI was announced 2026-02-19 and is in **pre-order**, shipping 2H 2026 — treat VITARI numbers as company-published targets, not yet independently verified in the field.

## 1. What makes this technology different

Avidity sequencing is a sequencing-by-binding/synthesis hybrid: it separates the chemistry of *stepping* the polymerase along the template from the chemistry of *identifying* the incorporated base. Two things distinguish it from Illumina SBS at the mechanism level:
1. **Amplification**: clonal amplicons ("polonies") are made by **rolling-circle amplification (RCA)** of a circularized library molecule, not PCR-based bridge amplification. RCA is isothermal and doesn't propagate PCR errors or generate the chimeric molecules that cause index hopping. (Publicly reported — Element technology pages; Nature Biotechnology 2023.)
2. **Base identification**: a fluorescent **"avidite"** — a dye-labeled polymer core carrying multiple copies of one nucleotide — binds a polony simultaneously through several polymerase-nucleotide contacts. This multivalency lowers the effective dissociation constant ~100-fold vs. a single labeled nucleotide, so imaging can be done at nanomolar reagent concentration with long signal dwell time before the avidite is washed off and the base is (in a separate step) covalently incorporated and unblocked. (Chen et al., *Nature Biotechnology* 2023, PMID 37231263.)

## 2. Pipeline: hair strand → prepared library → optical signal

1. Pull hair with root bulb (anagen-phase follicle) attached; the bulb, not the shaft, contains nucleated cells with genomic DNA.
2. Lyse follicle cells, digest protein (proteinase K), purify gDNA (column or bead-based).
3. Quantify (fluorometric, e.g. Qubit) and QC for fragment-size distribution (e.g. TapeStation/Fragment Analyzer).
4. **Elevate Workflow library prep** (Element's native kit): enzymatic fragmentation and adapter attachment, followed by PCR to add the full adapter + one of 96 unique dual indexes chosen for color balance. AVITI is also compatible with standard Illumina-adapter libraries (P5/P7-based kits) via an adapter-conversion step, since many labs already have Illumina-compatible workflows. (Publicly reported — Element Elevate Workflow product page.)
5. Library cleanup (magnetic beads) and final QC/quantification.
6. **Circularization**: the double-stranded library is denatured and the single strands are circularized (splint-ligation, same general logic as MGI's DNB chemistry) so each molecule becomes a closed single-stranded circle carrying the adapter/primer-binding sequence.
7. Circles are loaded onto the flow cell and hybridized to a primer at a capture site.
8. **Polony generation by RCA**: Phi29-type polymerase rolls around the circle repeatedly in place, producing a long concatemeric single strand of tandem copies, which collapses into a compact, spatially fixed cluster (polony) bound at its origin site — analogous in *purpose* to an Illumina cluster or an MGI DNA nanoball, but generated isothermally rather than by thermal-cycled bridge PCR.
9. **Sequencing cycle** ("Cloudbreak" chemistry on current instruments):
   - Sequencing polymerase and one of four dye-coded, multivalent **avidite** reagents are flowed over the flow cell.
   - The avidite binds a matching polony through multiple simultaneous polymerase contacts (avidity effect), giving a strong, long-lived fluorescent signal even at low reagent concentration.
   - The flow cell is imaged; software calls the base from the color/position.
   - A cleavage step removes the avidite complex and unblocks the 3′ end, and the polymerase covalently incorporates one nucleotide, resetting the polony for the next cycle.
   - Wash, repeat for cycle 2 (2 × 75 bp or 2 × 150 bp are current shipping configurations; 2 × 300 bp is offered on select kits).
10. Paired-end turnaround (second-read prep) mirrors Illumina's fold-over/re-prime logic at the chemistry level; exact reagent sequence is proprietary.
11. On-instrument software demultiplexes by index, trims adapters, and outputs FASTQ; reads are then aligned to a reference genome downstream (not on-instrument).

*On AVITI24 only*: an alternate, non-sequencing "in situ" imaging mode (**Teton Cytoprofiling / ABC Sequencing**) images RNA, protein and morphology directly on fixed tissue/cells with no library prep — a materially different pipeline for that specific spatial-biology application, layered onto the same optical/fluidics hardware as standard avidity DNA sequencing. It is noted here as a platform capability, not treated as a separate DNA-sequencing technology note, since the WGS/WES/panel pipeline above is unchanged. (Publicly reported — Element AVITI24 product pages, 2025–2026.)

## 3. Platform profile

| Attribute | Detail |
|---|---|
| Chemistry | Avidity sequencing (avidite multivalent binding + separate covalent incorporation) |
| Detection | 4-channel(ish) fluorescence imaging, CMOS/optical camera scan of flow cell |
| Amplification | Rolling-circle amplification (isothermal), not PCR bridge amplification |
| Substrate | Flow-cell-bound capture sites for circularized library molecules ("polonies"); Element does not publicly disclose exact site pitch or density — **unavailable** |
| Major advantages | Low reagent-driven GC bias (RCA doesn't have PCR's GC-dependent duplication bias); no index hopping (no bridge-PCR cross-talk between adjacent clusters); stable error rate downstream of homopolymers/tandem repeats vs. some Illumina instruments in head-to-head studies; open, Illumina-adapter-compatible library ecosystem; throughput-based pricing model |
| Major limitations | Newer ecosystem/software maturity and installed base vs. Illumina; elevated error rate specifically *within* long GC-rich homopolymers in at least one independent benchmark; max validated read length shorter than PacBio/ONT (not a long-read platform); VITARI unproven in the field as of report date |
| Regulatory/clinical positioning | Research-use-only (RUO) instruments; no FDA-cleared IVD instrument as of 2026-07-17 (unlike, e.g., Illumina's MiSeqDx). Used as an underlying sequencer in LDTs by some clinical labs. |

## 4. Instrument-level comparison

| | **AVITI** | **AVITI24** | **VITARI** (pre-order, ships 2H 2026) |
|---|---|---|---|
| List price | ~$289,900 (2022 launch price) — *estimated/dated, current price likely different* | Not publicly listed — **unavailable** | $689,000 (publicly reported, Element press release 2026-02-19) |
| Flow cells / run | 2 | 2 (dual-sided) | 2, independently/staggered-runnable, 6 addressable lanes each |
| Max reads/run | ≥1B read pairs per flow cell (≈2B read pairs / 4B reads total, High Output) | Up to 1.5B reads per flow cell (Cloudbreak chemistry) | 10B reads/run (5B reads per flow cell) |
| Yield, High-Output 2×150 | 300 Gb / 38 h | Comparable per-flow-cell yield to AVITI, plus imaging modality — exact Gb spec **unavailable** in public spec sheet as of search date | 3 TB / 36 h |
| Yield, 2×300 | 180 Gb / 60 h | **unavailable** | Not at launch (roadmap item) |
| Read length | 2×75 to 2×300 bp (kit-dependent) | 2×75–2×150 bp (typical) | 2×75 and 2×150 bp at launch; 2×300 bp on roadmap |
| Raw/consensus accuracy | >90% Q30 (High Output); UltraQ kit: >90% Q40, >70% Q50 (Element spec sheet, 2025) | Same core chemistry — same class of accuracy claimed | Same chemistry, same claimed ≥90% Q30 (company target, unverified) |
| Hands-on prep | Elevate Workflow library prep, separate from run; <1 h hands-on for AVITI24 in situ mode specifically | <1 h hands-on (in situ mode) | Not yet independently reported |
| Estimated cost/genome (30×) | ~$200/genome at high-volume throughput-based pricing (requires operating 3–5 instruments at >2,760 genomes/yr); ~$72/genome from instrument amortization alone at moderate single-instrument usage (GenEngNews/Element, 2024–2025) — **medium confidence**, promotional context | Not separately published | $100/genome target at $1/Gb (company target, **low-medium confidence**, unverified) |
| Cost per Gb | ~$2/Gb (high-volume throughput pricing) | **unavailable** | ~$1/Gb (company target) |

**Sources**: Element AVITI/AVITI24/VITARI spec sheets and product pages (elementbiosciences.com, accessed 2026-07-17); Element "$200 Genome" and VITARI launch press materials (2024–2026, publicly reported, promotional — treat cost figures as vendor-claimed upper-bound-favorable scenarios); GenomeWeb and BusinessWire coverage of VITARI launch (2026-02-19/25).

## 5. Application specialization

- **Strong fit**: high-throughput WGS/WES, large population-genomics and clinical-research cohorts, RNA-seq, single-cell (via compatible kits), targeted panels — anywhere short-read Illumina-class accuracy is needed with an alternate reagent supply chain. AVITI24 specifically targets spatial/multiomic profiling (RNA + protein + morphology + NGS) via its in-situ imaging mode.
- **Physical reasons**: RCA-based polony generation avoids PCR duplication/GC bias and index hopping, which independent benchmarking (Xu et al., *NAR Genomics and Bioinformatics* 2026; PMC12291380, 2025) found gives AVITI comparable-to-better variant-calling accuracy vs. NovaSeq X Plus in the 20–30× coverage range, and lower error rates downstream of long homopolymers/tandem repeats than NovaSeq X Plus/NextSeq 2000 in at least one study — useful for repetitive-region and de novo mutation calling (1.7× more discoverable de novo mutations reported in trio sequencing, same study).
- **Weak fit**: long-read applications (structural variants spanning >1 read, phasing across long repeats, full-length isoform sequencing) — avidity sequencing is still a short-read, cyclic-array method bounded by phasing/signal decay over many cycles, same physical ceiling class as SBS. Also weaker specifically within long GC-rich homopolymers, where the same NAR Genomics study found AVITI's error rate *exceeding* NovaSeq X Plus's.
- Not positioned (yet) for regulated clinical diagnostics requiring an FDA-cleared instrument.

## 6. Scalability — quantitative framework

**Horizontal scaling** (more flow cells / lanes / instruments):
- AVITI: 2 flow cells/run → ~2B active polonies/run (High Output, from ≥1B read pairs/flow cell). Total *physical* site count and occupancy % are not publicly disclosed (**unavailable**); usable-read fraction is implicitly captured in the ≥1B "read pairs" figure, which is Element's post-filter number.
- VITARI: 2 flow cells × 6 independently addressable lanes = 12 lanes/run, 5B reads/flow cell (10B reads/run) — Element's most horizontally scaled configuration to date.

**Vertical scaling** (faster/better per site):
- Bases/instrument/hour, calculated from reported data:
  - AVITI High-Output 2×150: 300 Gb ÷ 38 h ≈ **7.9 Gb/hour** (≈2.19 Mb/second) — *calculated*.
  - VITARI 2×150: 3,000 Gb ÷ 36 h ≈ **83.3 Gb/hour** (≈23.1 Mb/second) — *calculated*, ~10.5× AVITI's per-instrument rate, driven mainly by more lanes/reads per run (horizontal) rather than a faster cycle.
- **Primary bottleneck**: imaging/cycle time and fluidic exchange across a shared optical system, same general bottleneck class as any camera-based SBS/avidity platform — throughput gains to date (AVITI → AVITI24 → VITARI) have come predominantly from **adding lanes/flow-cell area and reads per run (horizontal)**, not from cutting cycle time, based on the ~10× yield jump to VITARI without a shorter run time (36 h vs. 38 h for comparable read length).

**Instruments needed for 1 Tb/day** (calculated, assumes back-to-back runs, no idle time — theoretical maximum):
- AVITI: 300 Gb per 38 h run → ~189.5 Gb/day/instrument → **~6 instruments** theoretical minimum; at ~70% realistic utilization, **~8 instruments**.
- VITARI: 3,000 Gb per 36 h run → ~2,000 Gb/day/instrument → **<1 instrument** theoretical; **~1–2 instruments** at realistic utilization.

**Instruments needed per year for 100 / 1,000 / 10,000 human genomes at 30×** (assumption: ~100 Gb raw sequence needed per 30× genome including duplicate/QC overhead — *stated assumption*, calculated from reported data):
- AVITI: ~657 genomes/instrument/year theoretical (300 Gb/run × ~219 runs/yr ÷ 100 Gb); ~460/yr at 70% utilization → **1 instrument for 100 genomes/yr; ~3 for 1,000; ~22 for 10,000** (realistic).
- VITARI: ~6,900 genomes/instrument/year theoretical; ~4,830/yr realistic → **1 instrument covers 100 and 1,000 genomes/yr; ~3 instruments for 10,000/yr** (realistic).

All figures in this section are **calculated from reported data**, confidence **medium** (depends on Element's own published yield/run-time specs, which are company-reported, not independently re-measured for this report).

## 7. Competitive positioning

- Directly competes with **Illumina NovaSeq X/X Plus** and **MGI DNBSEQ-T7/G400** for high-throughput WGS/WES/panel workloads on cost-per-Gb and turnaround; VITARI is explicitly positioned against NovaSeq X Plus-class throughput.
- Competes with **Illumina NextSeq 1000/2000** and **MGI DNBSEQ-G400/G99** at the AVITI/AVITI24 benchtop tier.
- AVITI24's in-situ multiomics mode competes with spatial-biology platforms (10x Genomics Xenium, Vizgen, NanoString CosMx) rather than with other sequencers directly.
- Primary purchasing criteria for switching from Illumina: cost/Gb, freedom from Illumina reagent lock-in, and Illumina-adapter-library compatibility (lowers switching cost since existing library preps largely carry over).
- Switching barrier: bioinformatics pipelines tuned to Illumina base-call/error profiles may need re-validation; smaller installed base means less field-proven long-term reliability data than Illumina.

## 8. Sources

- Chen et al., "Sequencing by avidity enables high accuracy with low reagent consumption," *Nature Biotechnology* (2023), PMID 37231263 — peer-reviewed, mechanism + early accuracy data. **High confidence.**
- Xu et al., "Whole-genome sequencing with AVITI and NovaSeq X Plus reveals comparable performance with contextual biases," *NAR Genomics and Bioinformatics* (2026), PMC13202175 — peer-reviewed benchmark. **High confidence.**
- "Accurate human genome analysis with element avidity sequencing," PMC12291380 (2025) — peer-reviewed. **High confidence.**
- Element Biosciences AVITI/AVITI24/VITARI product and specification pages, elementbiosciences.com (accessed 2026-07-17) — vendor technical documentation. **Medium-high confidence** for technical specs, **lower confidence** for cost/pricing claims (promotional context, per report guidance to discount marketing claims lacking independent context).
- Element Biosciences VITARI launch press release, BusinessWire/GenomeWeb (2026-02-19/25) — reputable industry reporting on an unreleased product; **medium confidence**, unverified in independent hands as of report date.
- GenomeWeb, "Benchmarking Study Highlights Accuracy of Element Biosciences Sequencer but Leaves Out Other Metrics" — industry reporting flagging limitations of vendor-adjacent benchmark studies. **Medium confidence, useful caveat.**

Numbers not independently re-measured for this report; all yield/accuracy/cost figures above are **publicly reported** (vendor or peer-reviewed literature) unless explicitly marked *calculated* or *estimated*.
