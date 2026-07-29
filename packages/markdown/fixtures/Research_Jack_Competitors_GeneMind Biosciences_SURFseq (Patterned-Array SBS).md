# GeneMind Biosciences — SURFseq (patterned-array sequencing by synthesis)

**Status: currently selling instruments.** Shenzhen-based, China-market-focused NGS manufacturer; sells internationally through distributors (e.g. Gulf Scientific, Lifomics). Not publicly traded as of this writing; no SEC/annual-report filings available, so financial and installed-base figures below are largely **unavailable** — confidence on commercial-scale claims is **low** unless otherwise marked. [GeneMind corporate site](https://en.genemind.com/) (accessed 2026-07-17).

## Why it's included

GeneMind is not a chemically distinct sequencing method — it is architecturally a close analog of Illumina's bridge-amplification SBS on a patterned flow cell (see [[Sequencing by Synthesis (SBS)]] in the Illumina folder for the reference mechanism). It's included here because it is a commercially real, currently-shipping alternative supply chain for short-read SBS instruments, mainly relevant in China and other markets pursuing Illumina-independent sequencing capacity — a genuine channel/geopolitical competitive factor even though the underlying chemistry is not majorly different from Illumina's.

## Platform profile

- **Sequencing chemistry:** SURFseq ("Surface-Restricted Fluorescence sequencing") — sequencing-by-synthesis (SBS) with reversible-terminator fluorescent nucleotides, cycle-by-cycle imaging, identical in concept to Illumina SBS.
- **Amplification method:** Bridge (surface cluster) amplification performed directly on a patterned flow cell — GeneMind markets this as "HyEND" advanced surface-amplification chemistry, claiming >80% well/site utilization and 2× cluster density versus earlier (non-patterned) flow cells. *(Publicly reported, GeneMind marketing material — independent verification of the utilization figure not found; confidence: low.)* [GeneMind SURFSeq Q product page](https://en.genemind.com/product/surfseq-q) (accessed 2026-07-17).
- **Detection method:** 4-channel or 2-channel fluorescence imaging, camera-based, same physical principle as Illumina.
- **Flow-cell architecture:** Patterned nanowell array flow cells in two lane counts per instrument line (e.g. FCM = 4 lanes, FCH = 8 lanes on SURFSeq Q).
- **Regulatory/clinical positioning:** Primarily research-use-only (RUO) instruments; GeneMind markets IVD-registered kits in China for specific applications (e.g. NIPT-adjacent panels) but the sequencers themselves are not FDA-cleared. Low confidence on the current breadth of China NMPA registrations without a primary regulatory filing.

## Hair strand → prepared library → optical signal pipeline

1. Extract and purify genomic DNA from the hair root/follicle (standard silica-column or magnetic-bead gDNA extraction).
2. Quantify and QC the DNA (concentration, A260/280 purity, degradation check via gel or Bioanalyzer/TapeStation).
3. Fragment genomic DNA to library-appropriate insert sizes (typically ~200–500 bp for WGS), most commonly via enzymatic fragmentation or transposase-based tagmentation, since GeneMind explicitly markets compatibility with "mainstream NGS libraries" — i.e., standard Illumina-style library-prep kits rather than a proprietary chemistry. *(Publicly reported)* [GenoLab M brochure](https://en.genemind.com/product/genolab-m) (accessed 2026-07-17).
4. Ligate adapters (with sample indexes) onto fragment ends; PCR-amplify the adapter-tagged library.
5. Library cleanup (magnetic bead-based) and final QC/quantification.
6. Denature the double-stranded library to single strands and load onto the patterned flow cell.
7. Each single-stranded fragment's adapter hybridizes to a complementary surface-bound oligo at a patterned nanowell site (one fragment per site is the intended loading outcome — analogous to ExAmp/patterned loading on Illumina NovaSeq).
8. Bridge (cluster) amplification proceeds in place at each patterned site, producing a clonal cluster of ~hundreds to low-thousands of identical copies — this is the "surface-restricted" step that gives SURFseq its name.
9. Sequencing-by-synthesis cycles: fluorescently labeled reversible-terminator nucleotide added → imaged across all lanes → terminator/dye cleaved chemically → repeat, cycle by cycle, for the programmed read length (SE50/75/100 or PE50/75/100/150).
10. Base calls are generated per cycle per cluster from the imaged color; reads are demultiplexed by index, trimmed, and aligned to a reference genome (e.g., GRCh38) for the final genome map.

## Instrument-level comparison

| Instrument | Positioning | Flow cell options | Reads/run | Read length options | Yield/run | Run time | Q30 | Samples/run |
|---|---|---|---|---|---|---|---|---|
| **FASTASeq 300 (V3.0)** | Compact benchtop, targeted/low-pass WGS | FCP up to 500M-reads flow cell (V3.0) | Up to ~500M *(publicly reported)* | SE50/SE75/PE150 | Not fully disclosed in accessible sources — **unavailable** | Accelerated vs. V2.0: −27% (SE50), −36% (SE75), −38% (PE150) *(publicly reported, relative only — absolute hours unavailable)* | Not disclosed in accessible sources | Not disclosed |
| **GenoLab M** | Mid-throughput benchtop | FCM (250M reads) / FCH (500M reads), 1 or 2 flow cells simultaneously | 250M–1,000M (dual FCH) | SE75; PE75; PE150 | 18–150 Gb per single-flow-cell run (up to ~300Gb dual-FCH) | ~13 h (FCM SE75) to ~50 h (FCH PE150) | >85% | Scales with multiplexing; not fixed |
| **SURFSeq Q** | Flagship ultra-high-throughput ("NovaSeq X-class") | FCM (4 lanes) / FCH (8 lanes) | FCM: 11.7B; FCH: 23.3B | SE50/SE100; PE50/PE100/PE150 | FCM PE150 ≈ 3.5 Tb/run; FCH PE150 ≈ 7.0 Tb/run *(calculated: reads × 300 bp per PE150 pair — source brochure text itself is ambiguously formatted as "0.6Tb×2"–"7Tb×2"; treat as medium confidence)* | FCM: 10–24 h; FCH: 17–36 h | ≥90% (≥90% of bases also reach Q40, per source) | WGS: 24–96 samples per flow-cell combination (example figure) |

Sources: [GenoLab M brochure](https://en.genemind.com/wp-content/uploads/2024/09/GenoLab-M-brochure-20240923.pdf), [GenoLab M product page](https://en.genemind.com/product/genolab-m), [FASTASeq 300 V3.0 announcement](https://en.genemind.com/news/9889.html), [SURFSeq Q product page](https://en.genemind.com/product/surfseq-q) — all accessed 2026-07-17. **Instrument purchase price, per-run reagent cost, and cost per Gb are not published and were not found in any accessible source — unavailable.** GeneMind directs pricing inquiries to direct sales contact. [GeneMind pricing page](https://en.genemind.com/dna-sequencing-price) (accessed 2026-07-17, no figures listed).

## Quantitative scalability estimate (SURFSeq Q, FCH, PE150 — worked example)

- Active sensing sites ≈ reads per run (each cluster yields one paired-end read pair) → **23.3 billion active sites per run** *(calculated from reported reads/run, assuming ~1:1 cluster-to-read-pair yield, medium confidence — actual raw cluster count is typically somewhat higher than passing-filter read count; this is a lower bound)*.
- Bases per instrument-hour at the top-end config: 7.0 Tb ÷ 36 h ≈ **194 Gb/hour** *(calculated)*.
- Bases per instrument-day (continuous back-to-back runs, no idle time): ≈ **4.7 Tb/day** *(calculated, theoretical maximum, ignores load/unload/maintenance downtime)*.
- Instruments needed for 1 Tb/day: **1** SURFSeq Q at theoretical max utilization; realistically (~70% uptime accounting for maintenance, staggered starts, QC) **~1–2** instruments. *(Estimated, low-medium confidence — no independent utilization benchmarking exists for this platform.)*
- Primary bottleneck: identical in kind to Illumina's — run time is imaging-cycle-bound (camera scan time × number of cycles × number of lanes), and the FCH's 8-lane geometry trades run time for reads/run rather than escaping the fundamental cycle-time bottleneck.

## Application specialization

Because the physical chemistry mirrors Illumina SBS, GeneMind inherits the same strengths and weaknesses category-for-category: strong for short-read WGS, WES, targeted panels, and transcriptomics; weak for long-range structural variants, phasing, and repetitive-region resolution (same amplification-bias, GC-bias, and short-read-length limitations as any bridge-amplification SBS platform — see the Illumina note and the shared [[Terminology & Metrics]] glossary for the underlying mechanisms). GeneMind additionally markets NIPT- and liquid-biopsy-oriented low-pass WGS kits (FASTASeq 300) as a specific China clinical-market niche.

## Competitive positioning

GeneMind competes directly with **MGI Tech/Complete Genomics** and, to a lesser extent, Illumina's benchtop/mid-throughput tier (NextSeq 1000/2000), for customers who want an Illumina-architecture-equivalent but from a non-Illumina, China-domestic or China-adjacent supply chain — this matters commercially where Illumina export/licensing restrictions, patent litigation (Illumina has sued several Chinese SBS entrants over patterned-flow-cell and reversible-terminator IP in various jurisdictions), or geopolitical sourcing preferences make an alternative vendor valuable. Its addressable customer base is smaller and more regionally concentrated than MGI's. IP risk is a real switching consideration: unlike MGI's DNBSEQ (a chemically distinct nanoball/cPAS method), GeneMind's bridge-amplification SBS is architecturally closer to Illumina's patented approach, which is a plausible source of future IP disputes — **estimated risk factor, not a confirmed legal finding**; no active GeneMind-specific Illumina litigation was found in this search (confidence: low, absence of evidence is not evidence of absence).

## Confidence summary

| Claim | Label | Confidence |
|---|---|---|
| Chemistry = bridge-amplification SBS on patterned flow cell | Publicly reported | High |
| GenoLab M / SURFSeq Q read counts, yields, run times | Publicly reported (vendor brochure) | Medium |
| SURFSeq Q per-run Tb figures | Calculated from reported data (source phrasing ambiguous) | Medium |
| Instrument/consumable pricing | Unavailable | — |
| Installed base / market share | Unavailable | — |
| IP/litigation exposure | Estimated | Low |
