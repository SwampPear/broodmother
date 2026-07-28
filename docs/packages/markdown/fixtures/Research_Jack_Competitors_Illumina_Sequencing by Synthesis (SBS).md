# Illumina — Sequencing by Synthesis (SBS)

Status: **Currently selling** (dominant incumbent). All figures dated as of 2026-07-17 unless otherwise noted. Confidence and source labels follow the vault convention: *(publicly reported / independently measured / calculated from reported data / estimated / unavailable)*.

## 1. Company & market position

- Illumina is the incumbent leader in short-read sequencing. Market-share figures vary sharply by source and methodology:
  - "≈80% of the DNA-sequencing/NGS market" — commonly repeated in industry press *(publicly reported, low confidence — original methodology not disclosed)*. [Yahoo Finance / Zacks summary](https://finance.yahoo.com/news/illumina-ilmn-leads-market-80-123127888.html)
  - "≈55% of the broader sequencing-instruments market in 2024" — from a market-research vendor report *(publicly reported, low confidence)*. [Grand View Research](https://www.grandviewresearch.com/industry-analysis/sequencing-market-report)
  - The vault's earlier draft claimed "~90% of sequenced DNA / ~70% of sequencing done today" — **no independent source for these exact two figures was found**; they most likely descend from older (2019–2021) estimates that Illumina instruments had produced the large majority of cumulative human sequencing data, back when Illumina had almost no competition in high-throughput short-read. That specific framing is now stale given MGI, Element, and Ultima have captured share since 2022–2023, and it does not distinguish "cumulative historical data" from "current run-rate." **Label: estimated / unavailable — do not treat as current.**
  - Reasoning for the discrepancy: market-share definitions differ by whether they count instrument revenue, consumables revenue, installed base, or bases sequenced; and by whether "sequencing market" includes microarrays, qPCR, and other genomics revenue lines Illumina also sells. The instrument+consumables revenue-share figures (~55–60%) are the most defensible for a technology-competitiveness comparison; the ~80–90% figures likely reflect older or narrower (research-only, or U.S.-only) framings. **Most reliable for this report: treat Illumina as the clear revenue and installed-base leader, in the 55–80% range depending on segment, trending down from a near-monopoly circa 2015–2020 as competitors mature.**
- Chemistry brand: **SBS with fluorescently labeled reversible-terminator nucleotides**, on patterned/unpatterned flow cells. Current generation is **XLEAP-SBS** (introduced with NovaSeq X series, 2022; extended to NextSeq 1000/2000 and MiSeq i100 in 2024).

## 2. Platform profile

| Attribute | Detail |
|---|---|
| Sequencing chemistry | Cyclic reversible termination (CRT): each cycle adds one fluorescently labeled, 3′-blocked nucleotide, images it, then chemically cleaves the dye and the block to expose a free 3′-OH for the next cycle. |
| Detection method | Optical — laser/LED excitation and camera (CMOS/sCMOS) imaging of fluorescence at each cluster, once per base per cycle. |
| Amplification method | Solid-phase **bridge amplification** on a lawn of surface-grafted P5/P7 oligos, producing clonal clusters (older HiSeq/MiSeq/NovaSeq 6000: random unpatterned or exclusion-amplification (ExAmp)-templated clusters; NovaSeq X/NextSeq 1000-2000/MiSeq i100: fully patterned nanowell flow cells with one cluster per well by design). |
| Array architecture | Patterned flow cell: billions of lithographically defined nanowells per lane, glass or silicon substrate, functionalized with P5/P7 primer lawns. 2, 4, or 8 lanes depending on instrument. |
| Typical applications | WGS, WES, RNA-seq, targeted panels, methylation (bisulfite/EM-seq), single-cell (via 10x Genomics et al.), liquid biopsy, population-scale genomics. |
| Major advantages | Highest raw per-base accuracy of any mainstream platform (empirical Q40 bins now reported); highest aggregate installed base and software/analysis ecosystem; broadest clinical validation and regulatory track record (FDA-cleared assays run on Illumina instruments, e.g., MiSeqDx). |
| Major limitations | Short reads only (max 2×300 bp, practically 2×150 bp for most production work) — poor at long repeats, structural variants, and phasing; amplification (bridge PCR) introduces GC bias and duplicate reads; large systems (NovaSeq X) require significant capital and consumables lock-in; cluster-density ceiling bounds throughput per flow cell. |
| Regulatory/clinical positioning | Most extensive clinical footprint of any sequencer vendor: MiSeqDx is FDA-cleared (510(k)/De Novo) as an in vitro diagnostic platform; NovaSeq/NextSeq instruments underlie many LDTs (laboratory-developed tests) and are used in FDA-cleared companion-diagnostics workflows (e.g., via partners like FoundationOne, Praxis). *(publicly reported, high confidence — MiSeqDx clearance is a matter of FDA record.)* |

## 3. Physical pipeline: hair strand → prepared library → optical signal

*(Preserved and refined from the vault's original draft.)*

**A. Sample to purified DNA**
1. Hair is collected — pulled with the root/bulb attached (the bulb's follicular cells carry nuclear DNA; shaft-only hair has little to no nuclear DNA, only mitochondrial DNA in usable quantity).
2. The bulb is lysed (detergent + proteinase K) to break open cells and digest protein.
3. Genomic DNA is purified — typically silica-column or paramagnetic-bead binding, washing away protein, salts, and lipids, then eluting purified dsDNA into buffer or water.
4. DNA is quantified (fluorometric, e.g., Qubit — dsDNA-specific dye, more accurate than UV absorbance) and quality-checked (A260/280 and A260/230 purity ratios; fragment-size distribution via gel or capillary electrophoresis, e.g., TapeStation/Bioanalyzer, to assess degradation).

**B. Library preparation**
5. Genomic DNA is fragmented and tagged in one step — **tagmentation**: a Tn5 transposase, loaded with adapter-bearing double-stranded oligos, simultaneously cuts the genomic DNA and ligates a short adapter fragment onto each cut end. This replaces older methods (mechanical shearing + separate end-repair/A-tailing/ligation) used on first-generation Illumina kits.
6. Limited-cycle PCR extends the short adapter stubs into full P5/P7 adapters and adds sample-specific index (barcode) sequences, so multiple samples' libraries can be pooled and later demultiplexed computationally.
7. Library cleanup — paramagnetic beads (e.g., SPRI-type) remove excess primers, adapter dimers, salts, and enzymes, and perform a size-selection cut.
8. Final QC — library concentration and fragment-size distribution are re-checked before pooling.
9. Libraries from multiple samples are pooled into one tube at balanced molar ratios, denatured to single strands, and diluted to the instrument's target loading concentration.

**C. On-flow-cell cluster generation**
10. The denatured single-stranded library, each molecule bearing a P5 adapter on one end and a P7 adapter (plus index) on the other, is flushed across the patterned flow cell. Each nanowell is functionalized with surface-grafted P5 and P7 complementary oligos. At correct loading concentration, most wells capture close to one molecule each (Poisson loading — some wells get zero or >1 molecule, which are filtered downstream).
11. One adapter end of each library molecule hybridizes to its complementary surface oligo (reversible base-pairing).
12. Polymerase extends the surface oligo, copying the library strand and creating a second, flow-cell-attached copy.
13. The original template strand is denatured and washed away; the surface-attached copy remains.
14. That copy's free adapter end bends over and hybridizes to a nearby complementary oligo of the opposite type, forming a physical "bridge."
15. **Bridge amplification**: polymerase copies the bridged strand; the two strands denature, each remaining attached to the surface by a different oligo type. This repeats for several cycles, exponentially growing a clonal cluster of ~1,000–2,000 identical copies of the original fragment, confined to roughly a sub-micron to ~1 µm well/site. Clonal amplification exists because a single DNA molecule's fluorescence signal is too weak to detect optically — the cluster amplifies signal intensity per site.
16. A linearization step removes one strand type, leaving a clonal population of single-stranded template ready for sequencing (Read 1).

**D. Sequencing by synthesis (Read 1)**
17. Sequencing primer, polymerase, and all four reversible-terminator nucleotides (each dNTP carrying a distinct fluorescent label and a removable 3′ blocking group) are flowed over the flow cell together.
18. Each cluster incorporates exactly one labeled, terminated base, in sync across all clusters (this synchrony is essential — it is also the source of "phasing" error, see §4).
19. Unincorporated nucleotides are washed away.
20. Lasers/LEDs excite the flow cell; a camera captures the emission-wavelength image of every cluster, one color channel per base identity (2-channel chemistry on NovaSeq X/NextSeq/MiSeq i100/iSeq; 4-channel on older HiSeq/MiSeq legacy chemistry).
21. Software converts each cluster's pixel intensity/color into a base call and assigns a Phred-like quality score.
22. A cleavage reagent removes the fluorescent dye and the 3′ block, regenerating a free 3′-OH so the next cycle can proceed. Steps 17–22 repeat once per cycle, up to the programmed read length (commonly 50, 100, 150, or 300 cycles).

**E. Paired-end turnaround and Read 2**
23. After Read 1, the synthesized strand is stripped/washed, the remaining single-stranded template on the surface refolds and hybridizes to the second (opposite-type) surface oligo, and a fresh round of bridge amplification regenerates a double-stranded bridge from that end.
24. The bridge is denatured/chemically treated to remove the original (Read-1-generating) strand, leaving only the complementary strand for Read 2.
25. Steps 17–22 repeat for Read 2, sequencing the fragment from its other end.

**F. Data processing**
26. Base calls are demultiplexed by their index reads into per-sample FASTQ files.
27. Reads are aligned to a reference genome (e.g., GRCh38); overlapping coverage across many reads builds depth, and variant callers identify positions where the sample differs from the reference, ultimately building a consensus genome map/variant call set.

### Flow-cell architecture (as in original draft, verified consistent with Illumina patterned-flow-cell patents/technotes)
- The flow cell is subdivided into parallel fluidic lanes (2, 4, or 8 depending on model); reagents flow inlet→outlet through each lane independently.
- Each lane's inner surface is a lithographically patterned array of billions of nanowells, each a candidate cluster site, spaced to minimize adjacent-cluster optical crosstalk.
- Manufacturing sequence: glass/silicon substrate → nanowell patterning/etch → surface silanization/activation → functional polymer coating → polish (chemical-mechanical polishing removes polymer from inter-well "land" areas, leaving it pooled only in the etched wells — analogous to wiping wax off a flat surface while it remains trapped in pits) → P5/P7 primer grafting onto the in-well polymer → wash → protective hydrogel coat → lamination with spacer walls and lid → cartridge assembly and QC.

## 4. Instrument-level comparison (current, actively sold systems)

All output/read/run-time figures: *publicly reported*, from Illumina spec sheets ([NovaSeq X series spec sheet, accessed 2026-07-17](https://www.illumina.com/content/dam/illumina/gcs/assembled-assets/marketing-literature/novaseq-x-series-spec-sheet-m-us-00197/novaseq-x-series-specification-sheet-m-us-00197.pdf); [NovaSeq X specifications page](https://www.illumina.com/systems/sequencing-platforms/novaseq-x-plus/specifications.html); [NextSeq 1000/2000 specifications](https://www.illumina.com/systems/sequencing-platforms/nextseq-1000-2000/specifications.html); [MiSeq i100 spec sheet](https://www.illumina.com/content/dam/illumina/gcs/assembled-assets/marketing-literature/miseq-i100-specification-sheet-m-gl-02244/miseq-i100-specification-sheet-m-gl-02244.pdf)) unless flagged otherwise.

### NovaSeq X / X Plus (launched 2022; current flagship, list prices announced at launch)
- Instrument price: NovaSeq X **$985,000**; NovaSeq X Plus **$1.25M** *(publicly reported, [GenomeWeb, 2022](https://www.genomeweb.com/sequencing/illumina-strikes-back-new-novaseq-x-series-sequencers-push-boundaries-throughput-cost); confirmed [MedTech Dive, 2022](https://www.medtechdive.com/news/illumina-ushers-in-200-genome-with-the-launch-of-new-sequencers/633133/)). X Plus runs 2 independent flow cells simultaneously; base X model runs 1.
- Max samples/run: up to 8 lanes/flow cell × up to ~64 human genomes per 25B flow cell at 30× (see below), i.e. up to ~128 WGS samples per X Plus dual-25B run.

| Flow cell | Run time (2×150 bp) | Yield (2×150 bp) | Reads (PE, billions) | Q30+ | Typical use |
|---|---|---|---|---|---|
| 1.5B | ~23 hr | ~[not directly reported for 150bp; range 165 Gb (2×50) – 1.4 Tb (2×300)] Gb | ~3.2–4.8B | ≥85% | Small panels, single-genome runs |
| 10B | ~25 hr | ~1–1.3 Tb (up to ~3–4 Tb at 2×300 or dual-lane max) | ~20–26B | ≥85% | Exome/panel batches, mid-size WGS batches |
| 25B | ~48 hr | ~8–10.5 Tb | ~52–70B (dual flow cell, X Plus) | ≥85% (2×150); ≥75% (2×300) | Large-batch population WGS |

- Cost per Gb (25B flow cell, list reagent pricing): $11,700 (100-cycle kit) / $14,500 (200-cycle) / ~$24,951 (300-cycle, per one core-facility list, [TAMU pricing sheet](https://www.txgen.tamu.edu/wp-content/uploads/txgen/TxGen_Prices.pdf)) → **$5.87/Gb (100 cyc), $3.64/Gb (200 cyc), $2.77/Gb (300 cyc)** *(calculated from reported data, medium confidence — core-facility list prices, not confirmed Illumina-direct pricing, and institutional discounts are common)*.
- Cost per human genome (30×, ~90–100 Gb/genome): Illumina's own marketing claims **$200/genome "at list price," assuming ~100 Gb/genome on a fully loaded 25B flow cell** *(publicly reported, [Illumina press materials via MedTech Dive, 2022](https://www.medtechdive.com/news/illumina-ushers-in-200-genome-with-the-launch-of-new-sequencers/633133/))*. Recomputing from the $2.77/Gb list figure above gives **~$277/genome at 100 Gb** *(calculated from reported data)*. **Discrepancy**: the $200 figure appears to assume either a lower list price than the core-facility sheet reflects, a larger bulk/committed-volume discount, or a slightly lower Gb/genome assumption (~90 Gb). Both figures are shown; **the $200 figure should be treated as a best-case/marketing floor (low confidence as a realistic price for a typical customer), and $250–300/genome as the more defensible list-price estimate (medium confidence).**
- Consensus/system accuracy: no separate "consensus" mode (SBS is not a multi-pass single-molecule consensus system); accuracy is the raw per-base Q-score distribution. Latest XLEAP-SBS software bins >90% of bases into an empirical Q40 tier (1 error/10,000 bases) *(publicly reported, [Illumina Q-score article, 2023](https://www.illumina.com/science/genomics-research/articles/data-quality-q-scores.html))*, up from Q37 previously.
- Hands-on prep time: tagmentation-based library prep is typically 4–8 hours hands-on/instrument time depending on batch size and automation; sample-to-answer (prep + run + basic analysis) is roughly 1.5–3 days for a 25B WGS batch, dominated by the ~48 hr run.

### NextSeq 1000 / 2000 (benchtop, patterned flow cell, launched 2021–2022)

| Flow cell | Max output | Max reads (SE) | Notes |
|---|---|---|---|
| P1 | 60 Gb | 100M | NextSeq 1000 & 2000 |
| P2 | 240 Gb | 400M | NextSeq 1000 & 2000 |
| P3 | 360 Gb | 1.2B | NextSeq 1000 & 2000 |
| P4 | 540 Gb | 1.8B | **NextSeq 2000 only** |

*(publicly reported, [Illumina NextSeq 1000/2000 spec page](https://www.illumina.com/systems/sequencing-platforms/nextseq-1000-2000/specifications.html))*. Positioned as a mid-throughput benchtop/production instrument for panels, exomes, transcriptomes, and small WGS batches; XLEAP-SBS chemistry since 2024.

### MiSeq i100 / i100 Plus (benchtop, launched 2024-10-09)
- Launch date: 2024-10-09 *(publicly reported, [Illumina press release](https://www.illumina.com/company/news-center/press-releases/press-release-details.html?newsid=808df13c-52d9-4012-b1b9-17deac6dcd0a))*.
- MiSeq i100: up to 25M single-end reads/run. MiSeq i100 Plus: up to 100M single-end reads/run (5M/25M/50M/100M flow-cell options).
- Output range: 1.5–30 Gb/run.
- Run time: 2×150 bp completes in <8 hr on all flow cells; 2×300 bp in ~15 hr on the 5M/25M/50M flow cells.
- Max read length: 2×300 bp.
- Accuracy: >90% bases above Q30 *(publicly reported, spec sheet)*.
- Positioning: smallest/fastest current benchtop box, targeted at low-plex clinical/microbial/amplicon work and labs replacing the legacy MiSeq.

### iSeq 100 (smallest/cheapest current box)
- Being sunset: order cutoff **2025-09-30**, full support/reagents through **2029-12-31** *(publicly reported, [Illumina Knowledge Base EOL notice](https://knowledge.illumina.com/instrumentation/general/instrumentation-general-reference_material-list/000009536))* — i.e., **entering end-of-life**, effectively being superseded by the MiSeq i100.

### Legacy/discontinued systems (for status clarity)
- **HiSeq family**: discontinued as current products. Per-model reagent/support end dates *(publicly reported, [Illumina HiSeq EOL schedule](https://knowledge.illumina.com/instrumentation/general/instrumentation-general-faq-list/000006963), accessed 2026-07-17)*:
  - HiSeq 1500, HiSeq 2500, HiSeq 3000: support/reagents ended **2023-02-28**.
  - HiSeq 4000, HiSeq X Five, HiSeq X Ten: support/reagents ended **2024-03-31**.
  - (HiSeq 2000's specific EOL date is not listed on Illumina's current EOL page — **unavailable**.)
- **NovaSeq 6000**: still listed/supported as of this research pass, but functionally superseded by NovaSeq X for new high-throughput purchases; being phased toward legacy status *(estimated, medium confidence, based on Illumina's own positioning of NovaSeq X as its replacement)*.
- **MiniSeq and MiSeq (original, non-i100)**: entering EOL alongside iSeq 100 per the same Illumina knowledge-base notice referenced above.

## 5. Application specialization

Illumina's SBS chemistry is fundamentally a **short-read, clonal-amplification, optical** method. This shapes every application tradeoff:

- **Short-read WGS/WES/panels/RNA-seq**: excellent — this is the core design point. High per-base accuracy from redundant clonal signal and reversible-terminator chemistry (single-base-at-a-time incorporation prevents the runaway extension that causes homopolymer errors on Ion Torrent and older 454/nanopore systems).
- **Long-read applications (structural variants, phasing, de novo assembly, repetitive regions)**: poor. Max practical read length (2×150, occasionally 2×300 bp) cannot span most structural variants, long tandem repeats, or segmental duplications; phasing across more than a few hundred bp requires computational inference or orthogonal long-read data.
- **GC bias**: bridge-PCR amplification during cluster generation under- or over-represents extreme-GC regions relative to PCR-free long-read methods — a well-documented SBS limitation.
- **Homopolymer errors**: minimal, because each cycle adds exactly one terminated base regardless of homopolymer length — this is SBS's key advantage over Ion Torrent (pH-based, flow-cycle-limited) and ONT (raw signal proportional to bases-in-pore).
- **Substitution vs. indel error balance**: SBS is substitution-dominated, indels are rare — a direct consequence of the discrete, terminated single-base-addition chemistry (in contrast to nanopore's indel-dominated error profile).
- **Phasing (signal decay, not haplotype phasing)**: as a run progresses, some fraction of strands in a cluster fall behind (incomplete extension, "phasing") or run ahead (dephasing, incomplete terminator removal); this cumulative desynchronization is the dominant cause of Illumina's quality-score decay toward the 3′ end of long reads, and is the main physical reason read length is capped well short of the chemistry's cycle limit.
- **Cluster density / loading efficiency**: too-high loading causes overlapping/merged clusters ("polyclonal" sites) that must be filtered, reducing usable-read percentage; patterned flow cells (fixed nanowell positions) largely solved the density-vs-purity tradeoff that limited older random-cluster flow cells.
- **Direct RNA / native epigenetic marks**: not supported — SBS sequences a synthesized DNA copy (cDNA for RNA-seq), so it cannot directly detect RNA modifications or native DNA methylation without a chemical conversion step (e.g., bisulfite or enzymatic methyl-seq), each of which adds bias/damage of its own.
- **Single-cell/spatial**: Illumina is the read-out engine for most single-cell and spatial platforms (10x Genomics, Visium, etc.) via short-read barcoded libraries — strong ecosystem position even though Illumina itself doesn't do the isolation/barcoding.
- **Rapid/portable sequencing**: poor fit — even the smallest current box (MiSeq i100) requires benchtop infrastructure, multi-hour tagmentation-based prep, and hours-long runs; not a field/point-of-care platform.

## 6. Scalability framework

**Horizontal scaling** (Illumina's dominant scaling lever): add lanes, flow cells, and instruments.
- Usable sequencing sites per run ≈ reads passing filter (each cluster ≈ one PF read per read-arm). For a single 25B flow cell: **~26–35 billion PF single reads** *(publicly reported)*; occupancy/loading efficiency is not separately published per run but patterned flow cells are designed for near-unity one-molecule-per-well occupancy at optimal loading concentration (the actual PF fraction of the nominal 25B site count, ~26–35B out of a nominal "25B" design capacity, implies roughly **~100–140%** of nominal reported as PF single reads depending on read config — Illumina's "25B" naming appears to already refer to expected PF cluster count at 2×50bp, not raw physical well count, so a true "occupancy %" figure is **unavailable** from public specs).
- Instruments needed for 1 Tb/day: one NovaSeq X Plus dual-25B run yields ~16–21 Tb over ~48 hr → **~8–10.5 Tb/day/instrument** at full 25B/2×150 loading → **1 instrument comfortably exceeds 1 Tb/day** *(calculated from reported data, medium confidence, assumes back-to-back runs with no downtime)*.
- Instruments for N human genomes/year (30×, ~100 Gb/genome, using $200-genome assumption of ~100 Gb/genome and the 25B flow cell's ~8–10.5 Tb/2×150bp run in ~48 hr):
  - Genomes/run ≈ 8,000–10,500 Gb ÷ 100 Gb ≈ **80–105 genomes/flow cell**; X Plus runs 2 flow cells → **~160–210 genomes per 48-hr run**.
  - Runs/year/instrument (continuous, no downtime) ≈ 365×24/48 ≈ **~182 runs/yr** → theoretical max **~29,000–38,000 genomes/yr/instrument** *(calculated, low-medium confidence, theoretical ceiling only)*.
  - **100 genomes/yr**: << 1 instrument (a few runs). **1,000 genomes/yr**: well under 1 instrument at full utilization, but realistically ~1 instrument once utilization (<50–70%), sample intake batching, and QC failures are accounted for. **10,000 genomes/yr**: still under 1 instrument in theory, but **1 instrument realistically at typical 40–60% utilization**, consistent with Illumina's own "20,000+ genomes/year" NovaSeq X marketing claim for a single fully utilized system *(publicly reported)*.
- These figures corroborate, not contradict, Illumina's public "20,000 genomes/year" claim for a single NovaSeq X — it implies Illumina's own utilization assumption is roughly 55–70% of the theoretical continuous-run ceiling calculated above, which is a realistic assumption for a production lab (accounting for maintenance, changeover, and QC).

**Vertical scaling** (secondary lever for Illumina, chemistry-bound): faster cycles, higher density, better chemistry.
- Bases per active site per second: run time ÷ cycles gives roughly **1 base/cluster per ~4.5–10 minutes** (2×150 bp run = 300 cycles in ~25–48 hr depending on flow cell → ~5–10 min/cycle including imaging and wash) — imaging and fluidics time per cycle, not chemistry speed, is the rate-limiting step *(calculated from reported data)*.
- Primary physical bottleneck: **imaging throughput and fluidic exchange time per cycle**, not incorporation chemistry itself — this is why higher-density flow cells (more clusters imaged per camera pass) scale throughput more effectively than trying to shorten the chemistry cycle, and why Illumina's generational improvements (patterned flow cells, 2-channel chemistry, XLEAP-SBS faster kinetics/faster imaging optics) have targeted cycle time and cluster density rather than fundamentally new chemistry.
- Net conclusion: **Illumina scales primarily horizontally** — more/bigger flow cells and more instruments — with incremental vertical gains (faster optics, faster chemistry kinetics, higher cluster density per flow-cell generation) rather than fundamental redesigns of the per-cycle process.

## 7. Competitive positioning

Illumina's SBS instruments each face a specific, named competitor targeting the same throughput tier, budget, and workflow — not a generic "Illumina vs. the field" contest. See [[Terminology & Metrics]] for shared metric definitions.

| Illumina instrument | Primary competitor(s) | Why they compete for the same customer |
|---|---|---|
| **NovaSeq X Plus (25B flow cell)** — large population-scale WGS | **MGI DNBSEQ-T7** (list price ≈$1M, up to 7 Tb/day *(publicly reported, [MGI DNBSEQ-T7 product page](https://global-mgitech.com/seqall/dnbseq-t7/), accessed 2026-07-17)*); **Ultima Genomics UG 100** (list price ≈$1.5M at 2024 launch, [STAT News, 2024-01-30](https://www.statnews.com/2024/01/30/ultima-genomics-dna-sequencing-100-dollars/); wafer-based, ~10–12B reads/wafer, marketed toward an "$100 genome" and, with the newer Solaris kit, an "$80 genome" *(publicly reported, [Ultima Solaris press release](https://www.prnewswire.com/news-releases/ultima-genomics-increases-output-by-over-50-and-lowers-sequencing-costs-by-a-further-20-with-the-introduction-of-ug-100-solaris-302382977.html))* | Both target the same large-cohort/biobank WGS budget line NovaSeq X Plus 25B occupies. MGI uses DNBSEQ (rolling-circle amplification + DNA nanoball arrays, not bridge PCR) and undercuts Illumina on list instrument price and $/Gb; Ultima replaces the flow cell entirely with an open semiconductor wafer and undercuts on $/genome, but as of this research pass has less clinical-grade track record and a smaller software/LIMS ecosystem than Illumina. Switching cost for existing NovaSeq X sites: re-validating a new base-calling/variant-calling pipeline, re-training bioinformatics staff, and (for clinical labs) re-doing CLIA/CAP or FDA-pathway validation — a real but not insurmountable barrier given both competitors ship standard FASTQ/BAM-compatible output. |
| **NextSeq 1000/2000 (P2–P4)** — mid-throughput benchtop/production | **MGI DNBSEQ-G400** (list price ≈$360K, up to ~1,080 Gb/run *(publicly reported, [MGI DNBSEQ-G400 product page](https://mgi-tech.eu/sequencing-products/dnbseq-g400), accessed 2026-07-17)*); **Element AVITI** (list price $289K standalone / $249K at 3+ unit bundle pricing, up to ~1B reads/flow cell, >90% Q30 at 2×150 *(publicly reported, [Element AVITI spec sheet](https://www.elementbiosciences.com/products/aviti/specs), accessed 2026-07-17)*) | Both sit in the same $250K–$400K capital band and Gb-per-run range as NextSeq 2000, aimed at core labs and mid-size clinical/production shops. Element's Avidity (sequencing-by-avidity, not bridge-PCR SBS) chemistry claims lower reagent cost per Gb and markets itself explicitly as a NextSeq/MiSeq alternative; MGI's DNBSEQ is the lower-cost option on both instrument and consumable price. Illumina's advantage here is the enormous installed base of validated NextSeq-based clinical/research protocols and direct compatibility with the broader Illumina consumables and analysis-software ecosystem (DRAGEN, BaseSpace). |
| **MiSeq i100 / i100 Plus, iSeq 100** — low-plex/benchtop/rapid | **PacBio Onso** (list price $259,000, Q40+ on >90% of bases, 2×150 bp, 80–150 Gb/run depending on kit *(publicly reported, [PacBio Onso press release](https://www.pacb.com/press_releases/pacbio-announces-onso-the-highly-accurate-short-read-sequencing-platform/), accessed 2026-07-17)*); **Element AVITI** (same instrument as above, also competes at the low end via its lowest-output flow-cell config) | Onso targets accuracy-sensitive niches (rare-variant/liquid-biopsy calling, panel work) where its Sequencing-by-Binding (SBB) chemistry's native-nucleotide, low-"scarring" incorporation claims higher raw accuracy than SBS at a similar or lower instrument price to MiSeq i100 Plus — a direct challenge to Illumina's "highest raw accuracy" positioning (§2) in exactly the read-length regime where SBS is strongest. MiSeq i100's switching-barrier advantage is Illumina's FDA-cleared MiSeqDx clinical pathway (§2) and the depth of amplicon/microbial-ID assay validation already built on MiSeq, which Onso and AVITI both lack as of this research pass. |
| **All Illumina instruments (ecosystem-level)** | MGI, Element, Ultima, PacBio Onso (above), plus Thermo Fisher Ion Torrent (semiconductor/pH-based, different chemistry entirely — not a direct SBS competitor but competes for the same benchtop clinical-panel budget as MiSeq i100/iSeq 100) | Illumina's durable moat is not chemistry superiority alone: (1) **consumables lock-in** — flow cells and reagent kits are instrument-specific and patent-protected (patterned flow cell / ExAmp cluster-generation patents; Illumina has litigated aggressively against competitors, e.g., past ITC/patent actions against BGI/MGI and Cufflink-era ONT disputes); (2) **software ecosystem** — DRAGEN secondary-analysis pipeline, BaseSpace, and the fact that most downstream tools (variant callers, QC pipelines, LIMS integrations) were built and validated against Illumina's specific error profile; (3) **clinical validation depth** — MiSeqDx FDA clearance and the largest base of FDA-cleared/CLIA-validated companion-diagnostic and LDT assays of any platform; (4) **installed-base network effects** — the largest base of trained bioinformatics staff and reference datasets calibrated to Illumina's substitution-dominated error profile. Each competitor above chips at one axis (price, accuracy, or throughput) without yet matching the full stack, which is why competitive share loss (§1) has been gradual rather than a rapid displacement. |

## 8. Sources

1. [NovaSeq X series specification sheet (PDF)](https://www.illumina.com/content/dam/illumina/gcs/assembled-assets/marketing-literature/novaseq-x-series-spec-sheet-m-us-00197/novaseq-x-series-specification-sheet-m-us-00197.pdf) — Illumina, technical manual, accessed 2026-07-17.
2. [NovaSeq X specifications page](https://www.illumina.com/systems/sequencing-platforms/novaseq-x-plus/specifications.html) — Illumina, accessed 2026-07-17.
3. [NextSeq 1000/2000 specifications](https://www.illumina.com/systems/sequencing-platforms/nextseq-1000-2000/specifications.html) — Illumina, accessed 2026-07-17.
4. [MiSeq i100 specification sheet (PDF)](https://www.illumina.com/content/dam/illumina/gcs/assembled-assets/marketing-literature/miseq-i100-specification-sheet-m-gl-02244/miseq-i100-specification-sheet-m-gl-02244.pdf) — Illumina, accessed 2026-07-17.
5. [MiSeq i100 Series launch press release, 2024-10-09](https://www.illumina.com/company/news-center/press-releases/press-release-details.html?newsid=808df13c-52d9-4012-b1b9-17deac6dcd0a) — Illumina.
6. [Illumina EOL notice — MiSeq RUO, MiniSeq, iSeq 100](https://knowledge.illumina.com/instrumentation/general/instrumentation-general-reference_material-list/000009536) — Illumina Knowledge Base.
7. [Illumina HiSeq EOL schedule](https://knowledge.illumina.com/instrumentation/general/instrumentation-general-faq-list/000006963) — Illumina Knowledge Base.
8. [GenomeWeb, "Illumina Strikes Back: New NovaSeq X Series," 2022](https://www.genomeweb.com/sequencing/illumina-strikes-back-new-novaseq-x-series-sequencers-push-boundaries-throughput-cost) — trade press, instrument pricing.
9. [MedTech Dive, "Illumina ushers in $200 genome," 2022](https://www.medtechdive.com/news/illumina-ushers-in-200-genome-with-the-launch-of-new-sequencers/633133/) — trade press.
10. [TAMU TxGen core-facility price list (PDF)](https://www.txgen.tamu.edu/wp-content/uploads/txgen/TxGen_Prices.pdf) — independent core-facility pricing, used for calculated cost/Gb figures.
11. [Illumina, "XLEAP-SBS chemistry enables Q40 and above," 2023](https://www.illumina.com/science/genomics-research/articles/data-quality-q-scores.html) — Illumina technical article.
12. [Grand View Research, sequencing market report](https://www.grandviewresearch.com/industry-analysis/sequencing-market-report) — industry reporting, market-share estimate.
13. [Yahoo Finance/Zacks, Illumina market share summary](https://finance.yahoo.com/news/illumina-ilmn-leads-market-80-123127888.html) — industry reporting, market-share estimate (lower confidence, methodology undisclosed).

**Known gaps flagged for follow-up**: exact per-HiSeq-model discontinuation dates; official Illumina-direct (non-core-facility) reagent list prices; independently measured (vs. vendor-reported) Q-score/error-rate benchmarks from a peer-reviewed source for the current XLEAP-SBS chemistry specifically (the peer-reviewed error-profile paper found, [Stoler & Nekrutenko, NAR Genomics and Bioinformatics 2021](https://academic.oup.com/nargab/article/3/1/lqab019/6193612), predates XLEAP-SBS and covers HiSeq X/NovaSeq 6000 only — useful for historical error-profile context but not current-generation numbers).
