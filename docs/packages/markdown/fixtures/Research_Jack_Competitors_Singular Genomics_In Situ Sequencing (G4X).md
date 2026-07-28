# Singular Genomics — G4X (in situ spatial sequencing)

## Commercial status (read this first)

**Status: SELLING — commercially launched in the U.S. as of February 2026**, following an external early-access program. Instrument list price $495,000. — *Publicly reported*, high confidence. [Singular Genomics G4X U.S. launch, Feb 2026](https://www.prnewswire.com/news-releases/singular-genomics-launches-g4x-in-the-us-delivering-industry-leading-throughput-for-in-situ-multiomics-targets-translational-and-clinical-applications-302691045.html); [AGBT 2026 coverage](https://www.prnewswire.com/news-releases/singular-genomics-at-agbt-2026-population-scale-spatial-takes-center-stage-g4x-launch-spot-met-initiative-302696623.html)

G4X was first unveiled 2024-02-05 and reached commercial U.S. launch in February 2026 — roughly a two-year early-access-to-launch cycle. [Unveiling release, 2024-02-05](https://www.globenewswire.com/news-release/2024/02/05/2823675/0/en/Singular-Genomics-Unveils-G4X-Spatial-Sequencer-Transforming-the-Landscape-of-In-Situ-Multiomic-Analysis.html)

This note documents G4X as a **separate, physically distinct technology** from the company's G4 short-read sequencer (see [[Sequencing by Synthesis (G4)]]). The distinction matters because G4X sequences **directly on intact fixed tissue**, with no library extracted, pooled, or loaded onto a flow cell at all — the hair-strand-to-signal pipeline is fundamentally different from every other platform in this report except other in situ / spatial systems.

## Platform profile

| Attribute | Detail |
|---|---|
| Assay type | In situ (on-tissue) targeted multiomics: RNA, protein, and morphology, not whole-genome or general-purpose DNA sequencing |
| Detection chemistry | Padlock-probe hybridization + rolling-circle amplification (RCA), read out by the same 4-color cyclic fluorescence chemistry/imaging system used in G4 |
| Amplification | RCA in place on the tissue section (not PCR, not bridge amplification) — each circularized padlock probe is copied into a long single-stranded concatemer that collapses into a compact, bright "rolling circle product" (RCP), analogous in concept to the DNA nanoballs used by MGI/Complete Genomics but generated in situ on a slide rather than in solution |
| Substrate | FFPE (formalin-fixed paraffin-embedded) or fresh-frozen tissue sections mounted on a slide, not a flow cell |
| Throughput per run | 128 samples and up to 40 cm² of tissue area per run — reported as ~10× the tissue area of other commercial in situ platforms *(publicly reported, vendor claim, medium confidence — no independent third-party comparison located)* |
| Panel content | Up to 500-plex RNA and 18-plex protein plus fluorescent H&E (fH&E) morphology in the same run at commercial launch; a 1,300-gene RNA panel was demonstrated (not yet the shipping standard) at AGBT 2026 | 
| Sample-to-answer time | ~5 days | 
| Cost | "low hundreds of dollars" per sample *(publicly reported, vendor claim, low-medium confidence — no itemized reagent price list located)* |
| Roadmap | "Direct-Seq" — in situ **sequencing** (as opposed to padlock-probe RNA detection) from FFPE tissue, early access planned for H2 2026 as of this writing | 
| Regulatory/clinical positioning | RUO at launch; company explicitly targets "translational and clinical applications" as a future direction, no FDA clearance identified as of 2026-07-17 |

Sources: [G4X U.S. commercial launch, Feb 2026](https://www.prnewswire.com/news-releases/singular-genomics-launches-g4x-in-the-us-delivering-industry-leading-throughput-for-in-situ-multiomics-targets-translational-and-clinical-applications-302691045.html); [G4X platform ecosystem](https://www.singulargenomics.com/g4x-platform-ecosystem); [Sequencing on the G4X Platform](https://www.singulargenomics.com/sequencing); [AGBT 2026 coverage](https://finance.yahoo.com/news/singular-genomics-agbt-2026-population-124500501.html)

## Pipeline: hair strand analogy → fixed tissue → in situ optical signal

Because G4X does not sequence extracted, pooled DNA libraries, the "hair strand" framing used elsewhere in this report doesn't map directly — the input is an intact tissue section, not purified nucleic acid in solution. The closest honest analogy is walked through below using a generic FFPE tissue block (the standard clinical/translational input) rather than a hair follicle:

1. **Tissue fixation and embedding.** A tissue sample is chemically fixed (formalin) to cross-link and preserve cellular structure, then embedded in paraffin wax (FFPE) — or, alternatively, flash-frozen (fresh-frozen) to preserve RNA integrity at the cost of morphology.
2. **Sectioning and mounting.** The block is thin-sectioned (typically ~5 µm) and mounted directly on a slide compatible with the G4X instrument. Unlike every other platform in this report, **nothing is extracted from the sample** — the cells, and their spatial arrangement, stay physically intact and in place.
3. **Deparaffinization/permeabilization and target access.** The section is treated to remove paraffin (for FFPE) and permeabilized so that probes can access intracellular RNA and protein without destroying tissue architecture.
4. **RNA target capture and reverse transcription.** For the RNA channel, mRNA in situ is reverse-transcribed to cDNA directly within the fixed cells.
5. **Padlock-probe hybridization and circularization.** Target-specific padlock probes hybridize to the cDNA (or directly to target sequence, depending on assay design). A probe that finds a perfect complementary match is enzymatically ligated end-to-end into a closed circle, physically tethered to its target location in the tissue; a mismatched probe fails to ligate and is washed away, which is the core specificity mechanism (single-base discrimination via ligation, not just hybridization).
6. **Protein target capture (parallel channel).** Antibodies conjugated to DNA oligo barcodes bind their protein targets in situ; those oligo barcodes are likewise circularized/amplified through the same padlock/RCA logic, enabling RNA and protein readout from the same physical section.
7. **Rolling-circle amplification (RCA).** A polymerase uses each circularized padlock probe as a template, copying around the circle repeatedly to produce a long concatemeric single strand that collapses into a compact, bright, diffraction-limited rolling-circle product (RCP), anchored at the exact point in the tissue where the original hybridization/ligation event occurred. This is the amplification step, and it happens **in place**, with no PCR thermal cycling and no removal of material from the slide.
8. **Cyclic in situ sequencing/decoding.** The instrument cycles fluorescently labeled decoding probes (or, in barcoded assays, sequential rounds of labeled oligos) across the RCPs, imaging after each round with the same 4-color fluorescence imaging system used in G4, then chemically stripping/quenching signal before the next round — directly analogous cycle logic to flow-cell SBS, except the "cluster" is an RCP sitting inside intact tissue rather than a DNA cluster on a flow cell surface, and the imaging field is the whole tissue area rather than a flow-cell lane.
9. **Fluorescent H&E and image registration.** A fluorescence-based analog of traditional hematoxylin & eosin staining is captured on the same section, so morphology, RNA, and protein signals can all be spatially co-registered pixel-for-pixel.
10. **Decoding and spatial reconstruction.** Software decodes each cycle's fluorescence pattern per RCP into a target identity, then reconstructs a spatial map: which transcripts/proteins were detected, at which x/y tissue coordinate, in which cell.
11. **Downstream analysis.** Cell segmentation, spatial statistics, and clustering are performed off-instrument to turn the decoded spatial map into biological interpretation (cell typing, spatial neighborhoods, etc.).

*(The planned "Direct-Seq" roadmap feature would replace step 8's fixed decoding-probe panel with true in situ DNA/RNA sequencing-by-synthesis on the RCPs, extending G4X from a targeted padlock-probe panel toward untargeted in situ sequencing — early access planned H2 2026, not yet shipping as of 2026-07-17.)*

## Application fit and physical basis

- **Strong fit:** spatial transcriptomics/proteomics, tumor microenvironment characterization, tissue-based translational and (eventually) clinical biomarker discovery — anywhere the *spatial location* of RNA/protein within tissue architecture is the primary value, not just aggregate abundance.
- **Why it works this way:** ligation-based padlock-probe specificity gives high target discrimination without needing to remove/homogenize the sample, at the cost of being inherently a **targeted panel technology** (hundreds to low thousands of genes), not an unbiased whole-transcriptome or whole-genome method — every target needs a designed probe. This is the opposite bottleneck from library-based sequencers: G4X's ceiling is panel design and optical decoding cycles per run, not flow-cell cluster density.
- **Not well suited to:** whole-genome/whole-exome sequencing, de novo discovery of un-panel-designed variants, long-read structural-variant or phasing work, or any application requiring extracted, purified nucleic acid at scale (e.g., population biobank WGS) — for those, the same company's G4 (or any of the whole-genome-oriented platforms elsewhere in this report) is the appropriate instrument, not G4X.

## Competitive positioning

G4X competes in the **spatial biology / in situ multiomics** category, most directly against **10x Genomics Xenium**, **NanoString (Bruker) CosMx**, and **Vizgen MERSCOPE** — not against Illumina, MGI, or other whole-genome sequencers, despite sharing a parent company with G4. Singular's stated differentiator at launch is tissue-area throughput per run (128 samples / 40 cm², claimed ~10× competing systems) and combined RNA+protein+fH&E in one instrument run. Because this is a targeted-panel, image-cycling technology rather than a general-purpose sequencer, it is **out of scope for the cross-company short/long-read instrument comparison table** in `comparisons/` and is noted here as a distinct competitive category instead.

## Sources and confidence summary

Nearly all quantitative figures in this note originate from Singular Genomics press releases and conference (AGBT 2026) coverage rather than independent peer-reviewed benchmarking or a public technical/spec manual — no independent third-party performance validation of G4X was located as of 2026-07-17. All such figures are labeled *publicly reported* with medium-to-low confidence above; treat them as vendor-claimed until independent literature (e.g., a peer-reviewed application note or a competing-vendor benchmark) becomes available.
