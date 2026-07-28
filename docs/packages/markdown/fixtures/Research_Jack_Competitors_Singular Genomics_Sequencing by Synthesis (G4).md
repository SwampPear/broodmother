# Singular Genomics — G4 (proprietary 4-color SBS)

## Commercial status (read this first)

**Status: SELLING (commercially available), but the company is now privately held.**

- Singular Genomics Systems, Inc. was acquired by an affiliate of Deerfield Management Company for $20.00/share cash; shareholders approved the deal 2025-02-19 and the acquisition closed **2025-02-21**. The company now operates as a private entity (no longer Nasdaq-listed as OMIC). — *Publicly reported*, high confidence. [Singular Genomics investor release, 2025-02-21](https://investor.singulargenomics.com/news-releases/news-release-details/singular-genomics-announces-closing-acquisition-deerfield); [SEC 8-K, Dec 2024](https://www.sec.gov/Archives/edgar/data/1850906/000119312524284273/d853229dex991.htm)
- This was a **whole-company take-private acquisition**, not a sale/discontinuation of the sequencing business. The G4 platform remains commercially sold and supported post-acquisition. — *Publicly reported*, high confidence.
- I (Claude) had a prior medium-confidence recollection that Singular had divested its sequencing business; that recollection was **incorrect** and is superseded by the sourced facts above.
- G4 was originally launched 2021-12-16. [Launch release](https://www.globenewswire.com/news-release/2021/12/16/2353524/0/en/Singular-Genomics-Launches-the-G4-Sequencing-Platform.html)

This note covers the G4 short-read instrument. The company's second, physically distinct platform — G4X, which sequences directly on fixed tissue rather than on a library loaded into a flow cell — is documented separately in [[In Situ Sequencing (G4X)]] because the hair→library→signal pipeline is fundamentally different (no library flow-cell loading step at all).

## Platform profile

| Attribute | Detail |
|---|---|
| Sequencing chemistry | Proprietary in-house 4-color sequencing-by-synthesis (SBS): reversible-terminator fluorescent nucleotides, one unique dye per base, cleaved each cycle |
| Detection | High-speed, high-resolution fluorescence imaging (">1 billion pixels/second" claimed) |
| Amplification | Clonal, on-flow-cell amplification in patterned nanowells (Singular's patents describe "kinetic exclusion amplification of nucleic acid libraries," conceptually analogous to Illumina's ExAmp chemistry) — *publicly reported (patent + technical docs)*, medium confidence on exact mechanism parity to ExAmp |
| Flow cell | Patterned, disposable flow cells with billions of fixed nanowell sites across 4 fluidically independent lanes per flow cell; up to 4 flow cells run simultaneously and independently (different assay/read-length per flow cell in the same run) |
| Cycle time | <3 minutes per SBS cycle — *publicly reported*, high confidence |
| Regulatory/clinical positioning | Research-use-only (RUO) instrument; no FDA-cleared diagnostic claims identified as of 2026-07-17 — *estimated from absence of evidence*, medium confidence |

Sources: [G4 launch release, 2021-12-16](https://www.globenewswire.com/news-release/2021/12/16/2353524/0/en/Singular-Genomics-Launches-the-G4-Sequencing-Platform.html); [Max Read kits / AGBT release](https://investor.singulargenomics.com/news-releases/news-release-details/singular-genomics-launches-max-readtm-kits-single-cell/); [Nava Whiteford, "Singular Genomics Patterned Flowcells?"](https://aseq.substack.com/p/singular-genomics-patterned-flowcells); [Singular Max Read method KB article](https://knowledge.singulargenomics.com/libraryprep-max-read-method.htm)

## Pipeline: hair strand → prepared library → electronic/optical signal

1. **Hair collection.** Pull hair with the root (bulb) attached — the bulb's follicular sheath cells carry nucleated genomic DNA; the visible hair shaft above the scalp is mostly dead, largely anucleate keratin and is a poor DNA source.
2. **Lysis and extraction.** Break open follicle cells (detergent/proteinase K lysis), then purify genomic DNA away from protein, lipid, and salts (silica-column or magnetic-bead binding, wash, elute). End state: purified dsDNA in buffer.
3. **QC.** Quantify (fluorometric, e.g., Qubit-type assay) and check fragment-size integrity (electrophoretic sizing) before committing reagents.
4. **Fragmentation and adapter ligation.** Shear/enzymatically fragment genomic DNA to the target insert size (a few hundred bp for standard WGS), then ligate Singular's proprietary sequencing adapters (functionally analogous to Illumina's P5/P7 but a distinct, proprietary sequence set incompatible with Illumina flow cells) plus sample index barcodes.
5. **Library amplification/cleanup.** PCR to enrich adapted fragments and add full adapter sequence, then bead-based cleanup to remove primers, salts, and enzymes.
6. **Final QC and pooling.** Re-quantify, check size distribution, and pool indexed libraries if multiplexing multiple samples onto shared lanes.
7. **Flow-cell loading.** Denature the pooled library to single strands and flow it across a patterned flow cell surface carrying complementary grafted oligos in nanowells. In standard mode, loading concentration is tuned to seed close to one template molecule per nanowell (as in most patterned-flow-cell platforms); in Max Read mode for single-cell/high-throughput work, Singular *intentionally* over-seeds each nanowell with more than one template, accepting multiple clusters per well because only the clone whose primer-binding site matches the active sequencing primer produces signal in a given read — *publicly reported*, high confidence. [Max Read KB article](https://knowledge.singulargenomics.com/libraryprep-max-read-method.htm)
8. **Clonal amplification.** In-well isothermal/kinetic-exclusion-style amplification clonally copies each seeded template into a cluster of \~1,000s of identical copies anchored in the nanowell, producing enough co-located fluorescent signal per cycle to be resolved as a single imaging pixel-group.
9. **Cyclic SBS sequencing.** Repeated cycles of: (a) polymerase incorporates one fluorescent reversible-terminator base complementary to the template strand across every cluster on the flow cell simultaneously; (b) the flow cell is washed; (c) the imaging system captures all four dye channels (or a reduced/shared-channel scheme) across the whole patterned array; (d) a cleavage step removes the terminator/dye so the next base can be added. Read 1 proceeds until the target read length is reached; the library is then reprimed for Read 2 for paired-end runs, following the same cycle logic on the complementary strand.
10. **Base calling and demultiplexing.** Onboard/attached compute converts per-cluster, per-cycle dye images into base calls and quality (Q) scores, then splits reads by index barcode back to individual samples.
11. **Alignment and analysis.** Reads are mapped to the reference genome (e.g., GRCh38) off-instrument; coverage, variant calls, and QC metrics are generated downstream.

## Instrument-level specifications (G4)

| Parameter | F2 flow cell | F3 flow cell | Max Read kit (single-cell) | Source / confidence |
|---|---|---|---|---|
| Reads per flow cell | ~250M reads (~150–165M read pairs) | up to 450M reads (~300–330M read pairs); up to 1.8B reads reported for specific applications | up to 800M–3.2B reads per run (kit-dependent) | [Singular product updates via GEN/AGBT coverage, 2024–2025](https://www.genengnews.com/topics/omics/fast-and-flexible-singulars-g4-takes-aim-at-illuminas-sequencing-superiority/) — publicly reported, medium confidence (figures have moved across product updates; treat as most-recent reported, not fixed spec) |
| Reads per run (4 flow cells, standard) | up to ~1.6B reads/flow cell × 4 lanes/flow cells = up to 6.4B reads/run (vendor aggregate claim) | — | — | publicly reported, medium confidence — this is a vendor roll-up figure, not independently verified |
| Run time | ~5 hours (short/rapid runs) up to 16–19 hours (e.g., 4 whole human genomes in one run) | same instrument, run-time scales with cycle count | — | [GenomeWeb / Singular support docs](https://support.singulargenomics.com/wp-content/uploads/2023/12/Whole-Genome-Sequencing-with-the-F3-Flow-Cell-_-Singular-Genomics.pdf) — publicly reported, medium confidence |
| Q30 (raw base quality) | 80–90% Q30 at launch spec; more recent runs reported averaging >90% Q30, spec raised to ≥85% Q30 | same | 80–90% Q30 | publicly reported, medium confidence — self-reported by vendor, no independent third-party benchmark located |
| Instrument list price | $295,000 (reduced from $350,000 in Feb 2024) | — | — | publicly reported, medium confidence (list price, pre-Deerfield acquisition; may not reflect current pricing under private ownership) |
| G4X (spatial) list price, for comparison | $495,000 | — | — | publicly reported |
| Reagent cost | reported ~$16–45 per Gb depending on kit/volume; Max Read kits ~$1 per million reads | — | — | publicly reported, low-medium confidence — wide range, source is aggregated vendor/distributor commentary, not a primary price list |

**Calculated cost-per-30× human genome (illustrative, not vendor-published):** a 30× human genome ≈ 90 Gb of usable sequence. At the reported $16–45/Gb reagent range: 90 Gb × $16–45/Gb ≈ **$1,440–$4,050 in reagents alone** (excludes library prep consumables, labor, instrument amortization). *Calculated from reported data*, low confidence given the wide input range and lack of a primary G4 price sheet.

## Application fit and physical basis

- **Strong fit:** short-read WGS/WES, targeted panels, RNA-seq, and — via Max Read over-seeding — high-throughput single-cell sequencing, where the deliberate multi-template-per-well design trades some wasted flow-cell area for very high read counts per run at low cost per read.
- **Why it works this way:** because G4 is fundamentally patterned-flow-cell SBS (same amplification-then-image-then-cleave logic as Illumina), it inherits the same general strengths/limitations class as Illumina SBS: short reads (typically ≤2×150 bp standard, longer read chemistries have been previewed), high per-base raw accuracy from reversible-terminator chemistry, sensitivity to cluster/well occupancy and to phasing/pre-phasing signal decay over long cycle counts, and no direct route to long-read or single-molecule applications (structural variants in repetitive regions, phasing across long distances, native epigenetic marks) without external kit workarounds.
- **Not well suited to:** long-read applications (repeat resolution, haplotype phasing across >1 kb, native methylation detection, ultra-long structural variant spanning) — same class of limitation as any short-read SBS platform.

## Competitive positioning

G4 competes most directly with **Illumina's NextSeq 1000/2000 and MiSeq i100** and with **MGI's DNBSEQ-G400/T7** in the benchtop-to-mid-throughput short-read segment, on the basis of lower list price, faster cycle time, and flexible independent-flow-cell run configuration. Its main switching barrier for customers is the opposite of Illumina's: G4 has a *much smaller* installed base, software/analysis ecosystem, and clinical-validation track record, and, post-2025 privatization, less visible long-term roadmap certainty than Illumina or MGI. See the cross-company comparison in `comparisons/` for quantitative benchmarking against these competitors.

## Sources and confidence summary

All figures above are labeled inline. Where Singular's own marketing/investor-relations materials are the only available source (true for most G4 performance numbers), figures are marked *publicly reported* rather than *independently measured* — no independent third-party benchmarking study of G4 (e.g., a peer-reviewed head-to-head accuracy/throughput comparison) was located as of 2026-07-17. Treat vendor-reported throughput and Q30 figures as directional, not as validated in the way Illumina's specs have been by extensive third-party literature.
