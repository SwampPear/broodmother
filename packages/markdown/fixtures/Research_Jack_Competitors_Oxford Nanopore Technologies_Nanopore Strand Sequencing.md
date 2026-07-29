# Oxford Nanopore Technologies — Nanopore Strand Sequencing

**Status: commercially selling.** Oxford Nanopore Technologies plc (LSE: ONT) is publicly listed. All instruments below (MinION, Flongle, GridION, PromethION family) share one underlying physical read mechanism — a single DNA/RNA strand is electrophoretically driven through a protein nanopore embedded in a membrane, and base identity is read from the ionic current it perturbs. Different instruments only change *how many* pores run in parallel and *how much* compute is bundled in — they are horizontal-scaling variants of one technology, not different technologies, so one note covers the whole product line per the "hair→genome pipeline is disrupted or changed" test. Current chemistry generation: **R10.4.1 pore + Kit 14 chemistry**, with **duplex** (both-strand consensus) basecalling as the high-accuracy mode. For patents covering the pore, motor-protein, and duplex mechanisms described below, and the litigation that has tested them, see [[copyå/Research/Jack Research #2/Competitors/Oxford Nanopore Technologies/Patents]].

---

## 1. Pipeline: hair strand → prepared library → electrical signal

1. Hair is collected with the root bulb (telogen/anagen follicle) attached — the follicle, not the shaft, carries nucleated cells with genomic DNA.
2. The follicle is lysed (detergent + proteinase K) and gDNA is purified (column or bead-based extraction), leaving purified high-molecular-weight (HMW) DNA in buffer. **HMW integrity matters far more here than for short-read platforms** — nanopore read length is fundamentally capped by input fragment length, so DNA is handled gently (wide-bore tips, no vortexing) to avoid shearing.
3. DNA is quantified (Qubit fluorometric, not NanoDrop) and sized (TapeStation/pulsed-field gel or fragment analyzer) to confirm HMW yield, typically targeting fragments from ~8 kb (standard) up to >100 kb (ultra-long prep).
4. **Library preparation (no PCR amplification in the standard/native workflow):**
   - *Ligation-based (Ligation Sequencing Kit V14):* DNA ends are enzymatically repaired and dA-tailed, then sequencing adapters — each pre-loaded with a motor protein — are ligated directly onto both ends of native double-stranded fragments.
   - *Rapid-based (Rapid Sequencing Kit V14):* a transposase simultaneously fragments the DNA and tags fragment ends with adapters in one ~5-minute enzymatic step (functionally analogous to Illumina tagmentation), trading some read length and occasional chimeric artifacts for a much shorter hands-on time.
   - *Barcoding:* sample-specific barcode adapters can be ligated per-sample before pooling for multiplexed runs (Rapid Barcoding Kit 24/96).
   - Because there is no amplification step in the native workflows, **base modifications (5mC, 5hmC, 6mA, etc.) present on the original molecule are preserved** and are directly readable from the raw current trace — this is the platform's core epigenetics advantage.
5. Library cleanup (magnetic beads) removes short fragments, free adapters, and enzymes; final QC re-checks concentration and size distribution.
6. The prepared library is loaded onto a flow cell whose membrane holds an array of individually addressable nanopores (recombinant, engineered CsgG- or related pore proteins embedded in a synthetic lipid bilayer), each pore sitting over its own electrode connected to a CMOS application-specific integrated circuit (ASIC).
7. The motor protein bound to each adapter grabs the loaded DNA strand and — using the existing transmembrane voltage/ionic gradient as its energy source — ratchets the single strand through the pore base-by-base at a controlled, near-constant rate (current chemistry: ~**420 bases/second** per pore).
8. As each nucleotide (and its neighbors, since the current is sensitive to a several-base window inside the pore) passes through the pore's narrowest constriction, it perturbs the ionic current flowing through the pore in a base-context-dependent way.
9. The ASIC samples this per-pore current continuously (thousands of times per second) and streams the raw current trace off the flow cell to the connected compute (integrated GPU in MinION Mk1C/GridION/PromethION, or external GPU workstation for MinION Mk1D/PromethION 2 Solo).
10. A neural-network basecaller (Dorado, ONT's current basecalling software) converts the raw current trace into a base sequence in real time or post-run; higher-accuracy basecalling models trade compute time for accuracy.
11. **Duplex mode:** when the ligation adapter captures both the template strand and its complementary strand consecutively through the *same* pore (aided by a duplex-promoting adapter), the basecaller aligns and jointly calls both traces, cancelling much of the independent per-strand error and reaching ~Q30 consensus accuracy from a single physical molecule pair — this is analogous in spirit to Illumina's Read 1/Read 2 but happens on one native molecule rather than by PCR-copying and re-reading.
12. Reads are demultiplexed by barcode (if used) and mapped to a reference genome; because reads can span 10 kb–>4 Mb, this step directly resolves structural variants, repeats, and phasing information that short reads cannot span.
13. Sequencing is adaptive: ONT's "Readfish"/adaptive sampling can reject a molecule mid-read (reverse the pore voltage to eject it) within seconds if early bases don't match a target region, freeing that pore for the next molecule — a capability unique to real-time electrical, single-molecule read-out.

---

## 2. Platform profile

- **Sequencing chemistry:** enzymatic, real-time, single-molecule strand translocation through a nanopore; no synthesis, no fluorescence, no polymerase-driven signal generation.
- **Detection method:** electrical — ionic current through a nanopore, sampled by a per-pore CMOS ASIC electrode. This is the platform most physically analogous to Proprium's own electrochemical-impedance approach in that both are label-free, electrical, single-molecule-adjacent readouts — the key architectural difference is nanopore current-blockade vs. Proprium's impedance-spectroscopy at a functionalized electrode.
- **Amplification:** none required (PCR-free native-DNA workflows are the default and the platform's main differentiator); PCR-based kits exist for low-input or amplicon applications but are not the primary mode.
- **Array architecture:** disposable flow cell = synthetic lipid bilayer membrane studded with an array of individually addressable protein nanopores, each seated over its own electrode/ASIC channel; MinION/Flongle/GridION share the same 512-channel flow-cell chemistry, PromethION uses a larger, denser flow cell.
- **Typical applications:** long-read and ultra-long-read WGS, structural variation, de novo assembly, native epigenetics (methylation without bisulfite conversion), direct RNA sequencing, metagenomics, real-time/field pathogen surveillance, adaptive-sampling targeted sequencing.
- **Major advantages:** only major platform offering true native (unamplified) long reads with direct base-modification detection; read length is limited by input DNA length, not chemistry (reads to multi-megabase have been demonstrated); real-time data streaming and adaptive sampling; fully portable low end (MinION, ~$1,000 entry) up to production-scale high end (PromethION 48).
- **Major limitations:** raw single-pass (simplex) accuracy is the lowest of the major platforms (~99–99.6% modal, i.e. Q20–Q24), so high-confidence variant calling generally requires either duplex mode (throughput cost) or higher coverage; systematic errors cluster in homopolymers and some k-mer contexts because several bases influence the current simultaneously (the "k-mer model" problem) rather than being purely random; pores degrade over a run (irreversible fouling/loss of individual pores lowers active-pore count over time — "pore lifetime" is a real yield-limiting factor), so realized yield is well below the theoretical 100%-occupancy maximum; per-pore throughput (bases/sec) is fixed by the biophysics of strand ratcheting and cannot be scaled arbitrarily without chemistry changes.
- **Regulatory/clinical positioning:** predominantly a research-use-only (RUO) platform; ONT's clinical arm (Oxford Nanopore Diagnostics / former "Nanopore Dx") is pursuing IVD-regulated products, and PromethION-based assays have started to appear in CE-IVD and LDT clinical workflows (infectious disease, rapid ICU genomic diagnosis), but ONT has materially less clinical/regulatory validation depth than Illumina in oncology/reproductive-health markets as of mid-2025. *(Confidence: medium — regulatory landscape changes quickly; verify current IVD status before clinical claims.)*

---

## 3. Instrument-level comparison

| Instrument | Flow cell(s) | Physical channels / active channels | Max run time | Yield per flow cell | Max device yield | List price (device) | Flow cell price |
|---|---|---|---|---|---|---|---|
| **Flongle** (adapter, not standalone) | Flongle flow cell | 126 physical channels, ~60+ usable pores at QC pass | ~24 h | ~1 Gb typical, up to 2.6–2.8 Gb best-case | n/a (single flow cell) | n/a (adapter, ~$750 historically) | ~$90/flow cell |
| **MinION Mk1D** | MinION/GridION flow cell (FLO-MIN114) | 512 channels (2048 physical pores, 4× MUX) | 72 h | ~30–50 Gb (R10.4.1/Kit14) | single flow cell | $3,150 (device); $5,150 (device+flow-cell pack) | $840/flow cell |
| **GridION Mk1** | up to 5× MinION/GridION flow cells | 5 × 512 channels = 2,560 concurrent channels | 72 h | ~30–50 Gb per flow cell | up to 150 Gb (5 flow cells) | Price on request | $840/flow cell |
| **PromethION 2 Solo (P2 Solo)** | up to 2× PromethION flow cells (FLO-PRO114M) | 2 × up to 3,000 active channels (2,675 typical QC-pass) | 72 h | up to 290 Gb theoretical; 100–200 Gb practical gDNA | ~580 Gb theoretical (2 cells) | Price on request (entry PromethION, portable) | $4,160 per 4-pack (~$1,040/cell) |
| **PromethION 24** | up to 24× PromethION flow cells | 24 × up to 3,000 channels | 72 h | up to 290 Gb/cell | up to 7 Tb theoretical | Price on request | ~$1,040/cell |
| **PromethION 48** | up to 48× PromethION flow cells | 48 × up to 3,000 channels | 72 h | up to 290 Gb/cell | up to 14 Tb theoretical | Price on request | ~$1,040/cell |

**Sources:** ONT store price list (accessed 2026-07-17, publicly reported) [store.nanoporetech.com/priceList.html](https://store.nanoporetech.com/priceList.html); PromethION technical specs [nanoporetech.com/document/promethion](https://nanoporetech.com/document/promethion); PromethION 2 Solo spec [nanoporetech.com/document/requirements/promethion-2s-spec](https://nanoporetech.com/document/requirements/promethion-2s-spec); GridION Mk1 spec [nanoporetech.com/document/requirements/gridion-mk1-spec](https://nanoporetech.com/document/requirements/gridion-mk1-spec); Flongle specs (independent aggregation, medium confidence) [genohub.com](https://genohub.com/ngs-sequencer/27/oxford-nanopore-flongle/).

GridION, PromethION 24/48, and PromethION 2 Solo device prices are not publicly listed ("price on request") — industry reporting places the PromethION range at roughly **$150K–$1M** capital cost depending on configuration (estimated, low-medium confidence, no primary citation located).

**Read length:** typical N50 8–30 kb (standard library), routinely >100 kb and up to multi-megabase with ultra-long library prep (Circulomics/Nanobind-style extraction) — read length is a library-prep/input-DNA property, not a chemistry ceiling, which is architecturally unique among the platforms in this report.

**Accuracy (R10.4.1 + Kit 14, publicly reported by ONT, 2023–2025):**
- Simplex (single-pass) modal raw-read accuracy: 99.6% (accuracy mode) / 99.2% (default) / 99.0% (fast mode) — i.e., roughly **Q20–Q24**.
- Duplex (paired complementary-strand consensus) accuracy: ~**Q30 (99.9%)** modal, up to 99.92–99.95% in accuracy-optimized runs.
- Source: [nanoporetech.com/platform/accuracy](https://nanoporetech.com/platform/accuracy) (publicly reported, dated content 2023–2024; treat as vendor-reported until cross-checked against an independent benchmark such as Nurk et al. or GIAB nanopore truth-set papers).

**Cost per 30× human genome:** ONT has publicly targeted **<$345 per 30× genome** with the newly announced PromethION Plus flow cell (limited release Q4 2025, broad availability 2026) — this is a forward-looking vendor target, not an audited realized cost (confidence: low-medium, publicly reported but aspirational). Independent multiplexing work has reported achieving **<$300/genome** on existing PromethION hardware (source: GIM Open conference abstract, 2024, medium confidence — single study). *(Compare against reagent-only math below.)* Reagent-only estimate: at ~$1,040/flow cell and ~150 Gb practical yield, and needing ~100–120 Gb of raw output for a robust mapped 30× genome (93 Gb is the raw theoretical minimum at 3.1 Gb × 30, but real-world read/alignment loss pushes the practical requirement higher), a single flow cell yields ~1–1.5 genomes worth of raw data, i.e. **~$700–1,040 in flow-cell reagent cost per genome** before library-prep consumables, compute, and labor — calculated from reported data, medium confidence, and notably higher than ONT's forward-looking $345 target, which presumably assumes the not-yet-broadly-shipped PromethION Plus chemistry and volume discounting.

### Prep time, per-run economics, and annual output

- **Hands-on library prep time:** Rapid Sequencing Kit V14 (transposase-based, no ligation) — as little as **~10 minutes** hands-on for a single sample; Rapid Barcoding Kit V14 (up to 96-plex, SQK-RBK114) — **~60 minutes** total hands-on for a full multiplexed batch. Ligation Sequencing Kit V14 (higher-yield, non-rapid) is longer, typically 1–2 hours hands-on including end-repair/dA-tailing and bead cleanups (publicly reported, [ONT library-prep product pages](https://nanoporetech.com/products/prepare) and [Rapid Barcoding Kit protocol SQK-RBK114](https://nanoporetech.com/document/rapid-sequencing-gdna-barcoding-sqk-rbk114), accessed 2026-07-17). This is markedly shorter than Illumina's ~4–8 hr tagmentation-based hands-on prep (see [[Sequencing by Synthesis (SBS)]]), a direct consequence of skipping clonal amplification entirely.
- **Sample-to-answer time:** for a rapid-kit MinION run, first bases are typically called within minutes of loading (real-time streaming basecalling), and a clinically actionable result (e.g., pathogen ID, rapid outbreak genotyping) can be reported in **as little as 1–8 hours** total including prep, publicly reported in ONT's outbreak-surveillance and rapid-ID literature (medium confidence, application-dependent); a full high-yield WGS run intended to run to completion is dominated by the up-to-72 h run time itself, so practical sample-to-answer for a complete human WGS dataset is **~1–4 days** including prep, run, and basecalling (estimated, medium confidence).
- **Reads/run (calculated, not directly vendor-tabulated):** ONT publishes yield in Gb, not read counts, so reads/run is back-calculated from yield ÷ typical N50 read length (~20 kb assumed for a standard gDNA library) — *calculated from reported data, medium confidence, highly sensitive to the N50 assumption actually achieved*:

| Instrument | Reads/run (calculated @ ~20 kb N50) | Reagent cost/Gb (flow-cell price ÷ practical yield) | Reagent cost/run (flow cell(s) only) | Reagent cost/million reads (calculated) |
|---|---|---|---|
| Flongle | ~0.05–0.13M | ~$35–90/Gb | ~$90 | ~$700–1,800 |
| MinION/GridION (1 flow cell) | ~1.5–2.5M | ~$17–28/Gb | ~$840 | ~$336–560 |
| GridION (5 flow cells, max) | ~7.5–12.5M | ~$17–28/Gb | ~$4,200 | ~$336–560 |
| PromethION 2 Solo (2 flow cells, practical) | ~5–10M | ~$5–10/Gb | ~$2,080 | ~$208–416 |
| PromethION 24 (24 flow cells, theoretical max) | up to ~350M | ~$3.60/Gb (theoretical) | ~$24,960 | ~$71 (theoretical) |
| PromethION 48 (48 flow cells, theoretical max) | up to ~700M | ~$3.60/Gb (theoretical) | ~$49,920 | ~$71 (theoretical) |

- **Annual theoretical max vs. realistic output:** assuming zero changeover downtime, a 72 h run cycle allows ~121.7 runs/year (365×24÷72) — a purely theoretical ceiling ONT itself does not claim is achievable, since flow cells require washing/reloading or replacement between runs and pore occupancy decays within a run:

| Instrument | Annual theoretical max (continuous 72 h cycles, zero downtime) | Realistic annual output (single weekly run, ~50 runs/yr, practical yield) |
|---|---|---|
| MinION/GridION (1 flow cell) | ~3.7–6.1 Tb/yr | ~1.5–2.5 Tb/yr |
| GridION (5 flow cells) | ~18.3–30.4 Tb/yr | ~7.5–12.5 Tb/yr |
| PromethION 2 Solo | ~12.2–24.3 Tb/yr (practical-yield basis) / ~70.6 Tb/yr (theoretical-yield basis) | ~5–10 Tb/yr |
| PromethION 24 | ~852 Tb/yr (theoretical) | order ~250–425 Tb/yr at ~50–70% realistic duty cycle |
| PromethION 48 | ~1.7 Pb/yr (theoretical) | order ~500–850 Tb/yr at ~50–70% realistic duty cycle |

*(All figures in this subsection: calculated from reported per-run yield/pricing data with stated assumptions, medium confidence — the "realistic annual output" column assumes a single lab running one batch per week rather than a dedicated production facility running continuously; a high-utilization production PromethION deployment would sit meaningfully above the weekly-cadence estimate and below the zero-downtime theoretical ceiling.)*

---

## 4. Application specialization

| Application | Fit | Why |
|---|---|---|
| Short-read WGS/exome (routine clinical) | **Poor** | Simplex accuracy (Q20–24) is below the Q30+ bar clinical short-variant calling typically wants without extra coverage/duplex overhead; per-Gb cost is currently higher than Illumina/MGI for equivalent short-variant confidence. |
| Long-read/ultra-long-read WGS | **Best-in-class** | Read length is set by input DNA length, not chemistry — only platform routinely producing N50 >100 kb and multi-Mb reads from standard prep. |
| Structural-variant detection & phasing | **Best-in-class** | Long native reads span most repeats and structural breakpoints in a single read; no assembly-based inference needed. |
| De novo genome assembly | **Best-in-class (paired with HiFi)** | Ultra-long reads resolve repeat-rich regions (centromeres, segmental duplications) that defeat short reads; frequently combined with PacBio HiFi for T2T-quality assemblies. |
| Methylation/epigenetics | **Best-in-class** | Native DNA is sequenced directly — modified bases alter the current trace and are called without bisulfite conversion, preserving strand and haplotype information that bisulfite short-read methods destroy. |
| Direct RNA sequencing | **Unique capability** | ONT is the only platform in this report that sequences native RNA molecules directly (no cDNA conversion, preserving native RNA modifications and full-length isoforms) — direct RNA kits exist for exactly this purpose. |
| Repetitive genomic regions | **Best-in-class** | Same long-read argument as structural variants; the 2022 T2T-CHM13 telomere-to-telomere assembly relied heavily on ONT ultra-long reads. |
| Metagenomics | **Strong** | Long reads improve species/strain resolution and can span whole small genomes in one read; real-time output enables rapid pathogen ID. |
| Rapid/portable/field sequencing | **Best-in-class** | MinION/Flongle are genuinely field-portable (USB-powered, no imaging optics, no bulky fluidics) — used in Ebola/Zika outbreak genomic surveillance and ISS spaceflight sequencing. |
| Single-cell / spatial | **Weak** | No native single-cell or spatial product; some long-read single-cell RNA workflows exist (via 10x cDNA + ONT long-read sequencing) but ONT is not a primary player here. |
| High-volume clinical panels / pharmacogenomics | **Weak-moderate** | Cost-per-sample and per-base accuracy at low coverage are less competitive than targeted-panel short-read or Ion Torrent workflows for simple SNP/indel panels. |

Physical basis for the error profile: because the sensed current at any instant depends on a multi-base window of DNA sitting inside the pore's narrow constriction (not one base at a time), the basecaller has to disambiguate overlapping k-mer signal contributions — this produces context-dependent systematic errors, disproportionately in homopolymer runs (where the current barely changes as identical bases pass through) and in some GC-extreme contexts, rather than platform-wide random substitution noise. Duplex reads suppress this because independent errors on the two complementary passes rarely coincide at the same position.

---

## 5. Scalability — quantitative framework

**Vertical scaling (per-pore throughput) — fixed by chemistry, not economics:**
- Translocation/read rate: **420 bases/second/pore** (current Kit 14 chemistry; earlier chemistries ran 250–450 b/s across generations — *calculated from reported theoretical yield: 290 Gb ÷ 72 h ÷ 3,600 s ÷ 2,675 active channels ≈ 420 bases/s/channel*, which reproduces ONT's own stated 420 b/s figure, cross-validating the "2,675 active channels" figure against the "3,000 physical channels" figure — high confidence, calculated from reported data).
- This is the platform's primary **physical bottleneck**: unlike optical platforms (where you can shrink pixels or speed cameras) throughput per site is capped by how fast a motor protein can ratchet DNA through a nanometer-scale pore without losing base-calling fidelity — pushing translocation faster degrades the signal-to-noise available per base.
- Vertical improvement path for ONT has therefore come mostly from (a) new pore proteins/chemistry generations raising per-base signal quality (enabling faster safe translocation and better basecalling models), and (b) reducing "dead" pore-hours via chemistry that resists fouling (e.g., PromethION Plus's "no wash needed" claim) rather than from raw speed increases.

**Horizontal scaling (adding pores/flow cells/instruments):**

| Metric | Flongle | MinION/GridION flow cell | PromethION flow cell |
|---|---|---|---|
| Physical pores | 126 | 2,048 (4× MUX) | ~12,000 (4× MUX) |
| Addressable/active channels (ASIC) | ~60–126 | 512 | up to 3,000 (~2,675 typical) |
| Bases/sec/channel | 420 | 420 | 420 |
| Theoretical Gb/hour (100% occupancy, all channels) | ~0.0002 Gb/hr | ~0.774 Gb/hr | ~4.04 Gb/hr |
| Theoretical Gb/72h run | ~1–2.6 Gb (reported) | ~55.7 Gb (calculated) / ~30–50 Gb reported practical | ~290 Gb (reported) |

*(All "theoretical Gb/hour" figures are calculated from reported data: active channels × 420 bases/s × 3,600 s, high confidence given they reproduce ONT's own published maxima.)*

- **Instruments to reach 1 Tb/day:** one PromethION 48 alone has a theoretical maximum of 14 Tb per 72-hour run ≈ **4.67 Tb/day sustained** (idealized, zero changeover downtime) — so a single P48 theoretically exceeds a 1 Tb/day requirement roughly 4.7×; at realistic ~50–70% of theoretical yield (accounting for occupancy decay and flow-cell changeover time), **1–2 PromethION 48 units** comfortably deliver 1 Tb/day in practice (estimated, medium confidence).
- **Instruments for 100 / 1,000 / 10,000 human genomes/year:** using a practical ~100–120 Gb/flow-cell requirement for a robust mapped 30× genome and ~290 Gb theoretical/~150–200 Gb practical yield per flow cell per 72 h run (~1.5–2 flow-cell-runs per genome at the low end, more conservatively ~1 genome/flow-cell-run):
  - 100 genomes/year ≈ 100 flow-cell runs/year ≈ ~1.4 runs/week → comfortably run on a single **PromethION 2 Solo or GridION**.
  - 1,000 genomes/year ≈ ~14 runs/week ≈ needs roughly **2–3 flow cells running continuously**, i.e. a single **PromethION 24** run in rolling batches.
  - 10,000 genomes/year ≈ ~140 runs/week ≈ needs on the order of **20–30 flow cells running continuously**, i.e. **one PromethION 48** run continuously back-to-back, or **2 PromethION 24s**.
  - *(All figures calculated from reported yield data with stated assumptions; label: estimated, medium confidence — real deployments run below theoretical continuous utilization due to flow-cell washing/replacement, library queueing, and QC-failed runs.)*

**Primary bottleneck:** per-pore translocation speed (fixed by chemistry/motor-protein biophysics) and **pore lifetime/occupancy decay within a run** (pores foul or die over the 72-hour run, so realized yield is well under the 100%-occupancy theoretical maximum — this is why "up to 290 Gb" theoretical routinely nets 100–200 Gb practical). ONT scales primarily **horizontally** (more channels per flow cell across generations, more flow cells per box) and via **utilization/duty-cycle chemistry improvements** (PromethION Plus's wash-free claim directly targets pore-lifetime loss), rather than by raising per-pore bases/second, which has been comparatively static for several chemistry generations.

---

## 6. Competitive positioning (see master comparison note for full cross-platform analysis)

- **Direct competitor for ultra-long-read/structural-variant/de novo assembly work:** PacBio Revio (HiFi) — ONT wins on raw read length and native epigenetics/direct RNA; PacBio wins on raw accuracy per read. Many genome centers run both (ONT ultra-long + PacBio HiFi) for T2T-quality assemblies.
- **Direct competitor for portable/field sequencing:** none at true feature parity — Ion Torrent's smallest configurations and some PCR-based rapid diagnostics compete on portability but not on long native reads; ONT MinION/Flongle occupy this niche essentially alone.
- **Indirect competitor for high-throughput WGS budget:** Illumina NovaSeq X and MGI DNBSEQ-T7 compete for the same genome-center capital budget on cost-per-genome and turnaround for short-variant-focused WGS, even though the underlying technology and error profile are entirely different.
- **Consumables lock-in:** flow cells and kits are single-source/proprietary (like all platforms in this report); ONT's real lock-in differentiator is the **Dorado/Guppy basecalling model ecosystem** and community bioinformatics tooling built around raw squiggle data — switching platforms means re-tooling long-read-specific analysis pipelines, not just consumables.

---

## 7. Sources and confidence summary

| Claim | Label | Confidence |
|---|---|---|
| Flow-cell channel counts, theoretical Gb yields, device pricing | Publicly reported (ONT technical specs / store, accessed 2026-07-17) | High |
| Bases/sec translocation rate | Calculated from reported data (cross-validated against ONT's own 290 Gb / 72 h claim) | High |
| Accuracy figures (simplex/duplex Q-scores) | Publicly reported (vendor, nanoporetech.com/platform/accuracy) | Medium — vendor-reported, not independently re-benchmarked in this note |
| Cost per 30× genome (<$345 target) | Publicly reported (vendor forward-looking target, Oct 2025) | Low-medium — aspirational, tied to not-yet-broadly-shipped PromethION Plus chemistry |
| GridION/PromethION device list prices | Unavailable (vendor "price on request"); market estimate $150K–$1M | Low |
| Genomes/year instrument-count estimates | Calculated/estimated from reported yield data with stated assumptions | Medium |
| FY2025 revenue (£223.9M, +24.2% CC) and segment growth | Publicly reported (ONT FY2025 annual results, reported 2026-03-02) | High |

Key primary sources: [nanoporetech.com/document/promethion](https://nanoporetech.com/document/promethion) · [nanoporetech.com/document/requirements/promethion-2s-spec](https://nanoporetech.com/document/requirements/promethion-2s-spec) · [nanoporetech.com/document/requirements/gridion-mk1-spec](https://nanoporetech.com/document/requirements/gridion-mk1-spec) · [store.nanoporetech.com/priceList.html](https://store.nanoporetech.com/priceList.html) · [nanoporetech.com/platform/accuracy](https://nanoporetech.com/platform/accuracy) · [nanoporetech.com/news/oxford-nanopore-announces-promethion-plus-flow-cell-and-other-human-genetics-updates-at-ashg-2025](https://nanoporetech.com/news/oxford-nanopore-announces-promethion-plus-flow-cell-and-other-human-genetics-updates-at-ashg-2025) (2025-10-15) · ONT FY2025 annual results via [ipgroupplc.com](https://www.ipgroupplc.com/news-and-events/portfolio-news/2026/2026-03-02) (2026-03-02) · Flongle specs via [genohub.com](https://genohub.com/ngs-sequencer/27/oxford-nanopore-flongle/) (independent aggregator, medium confidence, not primary ONT documentation — flag for verification against current ONT spec sheet).

*Note: several figures above (device capital prices for GridION/PromethION, some Flongle yield stats) rely on third-party aggregator pages rather than primary ONT documentation because ONT's own pricing pages return "price on request" for capital equipment. Treat those figures as directional, not contractual.*
