# Sequencing by Binding (Onso) — PacBio

Status: **currently selling** — Onso is a short-read benchtop system, commercially launched by PacBio following its 2021 acquisition of Omniome (the company that originated Sequencing by Binding, SBB, chemistry). Customer shipments began 2023-08-02. Researched/compiled 2026-07-18. This is a physically and chemically distinct pipeline from PacBio's own SMRT sequencing (see [[SMRT Sequencing (Revio, HiFi)]]) — it is short-read, uses clonal amplification, and does not use zero-mode waveguides — grouped under the same company folder only because PacBio now owns and sells both.

## Pipeline: hair strand → prepared library → optical signal (binding-based)

1. Hair is collected with the root bulb attached; cells are lysed and genomic DNA is purified (silica-column or bead-based), quantified, and QC'd — standard steps shared with every short-read platform in this vault.
2. Genomic DNA is fragmented to a short-read-appropriate insert size (consistent with 2×150 bp paired-end sequencing) and adapters are ligated, following a standard short-read library-prep workflow (fragmentation/end-repair/A-tailing/ligation, or an enzymatic tagmentation-style approach) — PacBio's public materials describe Onso library prep as compatible with standard short-read prep kits, but the exact proprietary amplification/clustering step used to generate clonal template populations on the Onso flow cell was **not independently confirmed from a primary specification document in this research pass**. Based on Omniome's patent literature (which describes examination of "a plurality of" identical template copies at a surface-bound interrogation position) it is reasonable to infer a clonal, surface-amplified array analogous in concept to a bridge-PCR or exclusion-amplification cluster, but this is an **inference, not a confirmed vendor-documented fact — label: estimated, medium confidence.**
3. The clonally amplified templates are arrayed on the Onso flow cell surface.
4. This is where SBB physically diverges from every reversible-terminator SBS platform in this vault (Illumina, MGI, Element, Ultima all incorporate a labeled nucleotide and detect it as part of the same chemical step that extends the strand). SBB instead **splits base identification from base incorporation into two separate steps**:
   - **Examination step**: a polymerase and a candidate nucleotide are allowed to bind the primed template at the current position *without* being allowed to catalyze the covalent bond that would incorporate it. This forms a detectable, stable, non-covalent "ternary" or "binding" complex — the correct nucleotide binds more stably and is held longer/more consistently than incorrect ones, which is what the optical system reads out. No chemistry (bond formation) has happened yet at this point.
   - Some SBB implementations increase signal robustness using **avidity**: multiple polymerase–nucleotide binding events are linked to a common multivalent scaffold molecule, so that one correct-base binding event is reinforced by several simultaneous weak interactions rather than relying on a single molecular event for detection — conceptually similar in spirit (though a distinct, separately patented implementation) to the "avidite" multivalent binding used in Element Biosciences' Avidity chemistry (see [[Avidity Sequencing]]).
5. A camera images the array while the binding complex is held, calling the base from which channel/signal is detected at each position.
6. **Incorporation step**: only after the base has already been identified does a separate chemical step allow the polymerase to catalyze actual incorporation of the (now-confirmed) correct nucleotide into the growing strand, and the cycle advances to the next position.
7. Because base identity is read out *before* the strand-extending chemistry happens, SBB's designers argue this reduces the coupling between "identification errors" and "chemistry errors" that can compound in single-step SBS chemistries — PacBio and Omniome's own literature attributes Onso's high claimed raw accuracy (Q40+, i.e. an advertised ~99.99% per-base call accuracy) to this decoupling. **Label: publicly reported (vendor/inventor claim), plausible given the underlying biophysics described in the patent literature, but not independently benchmarked against a third-party accuracy-calibration study in this research pass — confidence medium.**
8. The cycle (examine → image → incorporate) repeats for the programmed read length (2×150 bp paired-end is the platform's primary supported mode).
9. Reads are demultiplexed by sample index and aligned to a reference genome or used directly for variant calling — same downstream bioinformatics as any other short-read platform.

## Platform profile

| Attribute | Detail |
|---|---|
| Sequencing chemistry | Sequencing by Binding (SBB): decoupled two-step cycle — polymerase-nucleotide *binding*-complex detection (no incorporation) followed by a separate incorporation step, repeated per cycle. Not a reversible-terminator SBS chemistry. |
| Detection method | Optical — camera imaging of the polymerase–nucleotide binding complex at each array position per cycle. |
| Amplification method | Clonal, surface-bound amplification generating a population of identical template copies per array feature — exact proprietary method not independently confirmed this pass (see pipeline step 2); **not** the ZMW/no-amplification approach of PacBio's own SMRT platform. |
| Array architecture | Flow-cell-based array (not ZMW-based); exact physical site count/density not independently found in this research pass — **label: unavailable.** |
| Typical applications | High-accuracy short-read applications where per-base call confidence matters most: metagenomic species/strain-level classification, microsatellite-instability (MSI) detection in cancer, homopolymer/repeat-rich variant calling, other applications sensitive to systematic substitution error. |
| Major advantages | High claimed raw single-pass accuracy relative to typical SBS raw-read accuracy; PacBio/Omniome literature and a PacBio-published blog post report improved resolution of homopolymer and short tandem repeat regions relative to Illumina-based SBS in head-to-head comparisons. |
| Major limitations | Short-read only (2×150 bp), so it does not address structural-variant, phasing, or long-repeat-resolution needs; smaller installed base and less mature software/analysis ecosystem than Illumina/MGI; benchtop-scale throughput (400–500 million reads per 48 h run) is modest relative to high-throughput short-read flagship systems (e.g., NovaSeq X, DNBSEQ-T7); detailed cost-per-Gb and cost-per-genome figures are not published by PacBio in a form independently verifiable in this research pass. |
| Regulatory/clinical positioning | Positioned and marketed primarily for research use (metagenomics, oncology biomarker research, e.g. MSI). No FDA clearance was identified in this research pass — **label: unavailable/not found**, consistent with Onso's short commercial history (shipments began 2023-08). |

## Instrument-level comparison

| Instrument | Launch/shipping | Reads/run | Read length | Run time | Yield/run (calculated) | Raw-read accuracy | List price |
|---|---|---|---|---|---|---|---|
| **Onso** | Announced 2023-04; customer shipments began 2023-08-02 | 400–500 million reads (2×150 bp paired-end mode) | 2×150 bp | 48 h | ≈120–150 Gb — **calculated from reported data**: 450M reads (midpoint) × 300 bases (2×150 bp) ≈ 135 Gb | Q40+ claimed (≈99.99%) | $259,000 (US list price, publicly reported) |

Reagent/consumable cost per run, cost/Gb, cost/genome, active-site counts, and occupancy/loading-efficiency figures were **not found in a primary, independently verifiable source in this research pass** and are labeled **unavailable** rather than estimated, since no defensible baseline (e.g., a published flow-cell reagent price) was located to calculate from.

## Application specialization and physical basis

- **Metagenomics / taxonomic classification**: PacBio's own published comparison against an Illumina NextSeq 2000 reported Onso identifying more taxa at each taxonomic level on the same samples — plausibly explained by the SBB mechanism's reduced susceptibility to systematic substitution error at ambiguous/repetitive positions, which would otherwise cause reads to misalign or be discarded during taxonomic classification. **Label: publicly reported (vendor-published comparison), not independently replicated in this research pass — confidence medium.**
- **Homopolymer and microsatellite/short-tandem-repeat regions**: because base identification happens in a distinct, un-rushed binding-detection step rather than being conflated with the incorporation chemistry itself, PacBio's marketing and a company blog post argue SBB does not accumulate the register-shifting errors that both bridge-PCR/cyclic SBS optical dephasing (Illumina/MGI) and pH-integration ambiguity (Ion Torrent) exhibit in homopolymer runs — directly relevant to microsatellite-instability (MSI) calling in oncology, where accurate homopolymer-length measurement is the diagnostic signal itself.
- **Substitution vs. indel error profile**: not independently characterized against a standard benchmark (e.g., Genome in a Bottle) in this research pass — **label: unavailable** for a rigorously sourced indel:substitution ratio; only vendor-reported comparative claims were found.
- **Poor/limited fit**: any application requiring read lengths beyond 2×150 bp (structural variants, phasing, repetitive-region assembly, long isoform sequencing) — Onso shares none of SMRT's long-read advantages despite being sold by the same company; any application where Onso's relatively modest per-run read count (400–500M) makes cost/Gb or cost/sample uncompetitive against higher-throughput short-read flagships is also a weak fit, though exact comparative costs could not be calculated here due to the pricing data gap noted above.

## Standardized scalability analysis

Given the significant data gaps in publicly available site-count, occupancy, and cost figures for Onso, this section is necessarily more limited than the SMRT/Revio analysis above.

**Horizontal scaling**: Onso is a single-flow-cell benchtop instrument; PacBio's public materials found in this pass did not describe a multi-flow-cell or multi-instrument-per-run scaling path analogous to Revio's 4-SMRT-Cell parallelism or Illumina/MGI's multi-lane flow cells — **label: unavailable**, may reflect a genuine product-design choice (benchtop simplicity) rather than a search gap, but should be verified against current PacBio product materials before being treated as definitive.

- **Instruments needed for 1 Tb/day**: at ≈135 Gb per 48 h run (≈67.5 Gb/day average), reaching 1 Tb/day would require on the order of **~15 instruments** running continuously — **calculated from reported data**, low-medium confidence given the underlying yield figure is itself a calculated midpoint, not a directly reported number.
- **Instruments needed for 100 / 1,000 / 10,000 human genomes/year**: assuming a 30× human genome requires ~90–100 Gb and one Onso run (≈135 Gb every 48 h) could in principle cover roughly 1.3–1.5 genomes per run, that implies ≈10–11 genomes/instrument/month, or **≈120–135 genomes/instrument/year** at continuous (theoretical-maximum) utilization. At a more realistic ~75% utilization (accounting for setup, QC, and non-continuous lab operation), **≈90–100 genomes/instrument/year**. On that basis: **~1 instrument for 100 genomes/year, ~10–11 instruments for 1,000/year, ~100–110 instruments for 10,000/year.** **Calculated from reported data**, low-medium confidence — Onso is not primarily marketed as a high-throughput WGS platform, so this calculation is illustrative of the underlying physical throughput rather than reflective of how the instrument is actually deployed in practice (its real-world use cases skew toward metagenomics and targeted panels, not population-scale 30× WGS).

**Vertical scaling**: the core lever available to PacBio for improving Onso's per-run output would be increasing physical array site density and/or shortening the binding-examination step's required dwell time — neither was found to be publicly quantified in this research pass.

- **Primary physical bottleneck**: **unavailable** — without a confirmed array site count or per-site duty-cycle figure, this analysis cannot identify a specific, sourced physical bottleneck; qualitatively, the two-step examine-then-incorporate cycle inherently takes longer per base than a single-step SBS incorporation-and-image cycle, which is a plausible structural reason for Onso's relatively long 48 h run time at a comparatively modest per-run read count, but this is an **inference, not a vendor-confirmed cause — label: estimated, low confidence.**

## Competitive positioning

Onso competes directly with other high-accuracy short-read benchtop systems for accuracy-sensitive research applications — most directly Element Biosciences' AVITI (see [[Avidity Sequencing]]), which makes a similar "higher raw accuracy than mainstream SBS" claim via a mechanistically related (multivalent/avidity-based signal amplification) but distinct chemistry, and to a lesser extent MGI's CoolMPS-equipped PCR-free DNBSEQ instruments, which target the same "reduce scarring/systematic-error sources for cleaner variant calls" value proposition via a different mechanism (antibody-based label, not binding-complex examination). Onso does **not** compete on throughput or cost/Gb with high-volume flagships (Illumina NovaSeq X, MGI DNBSEQ-T7/T7+, Element AVITI24) — its addressable customers are research groups and clinical-research labs specifically prioritizing per-base accuracy in homopolymer/repeat-rich or low-frequency-variant contexts (e.g., MSI, metagenomic strain typing) over raw throughput or cost per sample. Full cross-company competitive-landscape tables are consolidated in [[Instrument & Market Comparison]].

## Sources

- PacBio / PacBio Investor Relations, "PacBio Announces Onso, the Highly Accurate Short-Read Sequencing Platform," press release, 2023-04.
- PacBio / PR Newswire, "PacBio Begins Commercialization of the Onso Short-Read Sequencing System," 2023-08-02 — shipment start date.
- Genohub, PacBio Onso instrument listing — reads/run, read length, run time, list price ($259,000).
- PacBio blog, "Going beyond the 'needle in a haystack' with Onso short-read sequencing" — metagenomics/taxa-resolution comparison vs. Illumina NextSeq 2000.
- PacBio blog, "Highly accurate sequencing enables the detection of microsatellite instability associated with cancer" — MSI/homopolymer application framing.
- Omniome, Inc. (PacBio) patent literature: US Patent Applications/Grants describing sequencing-by-binding two-step examination/incorporation mechanism and avidity-complex signal amplification (freepatentsonline.com, USPTO image-ppubs records) — used to characterize the underlying mechanism where vendor technical documentation was not directly available.

## Confidence summary

| Claim | Confidence |
|---|---|
| Two-step examine-then-incorporate SBB mechanism | High — consistent across Omniome/PacBio patent literature and PacBio's own public description |
| Q40+/99.99% claimed raw accuracy | Medium — vendor claim, physically plausible given the mechanism, not independently benchmarked in this pass |
| Reads/run, read length, run time, list price | Medium-high — consistent across a vendor press release and a third-party instrument-listing aggregator |
| Clonal amplification method used for Onso arrays | Low — inferred from patent literature, not confirmed in a primary Onso-specific spec document |
| Array site count, occupancy, reagent cost/Gb, cost/genome | Unavailable — no defensible primary source located in this research pass |
| Metagenomics/MSI comparative performance claims | Medium — vendor-published comparisons, not independently replicated |
