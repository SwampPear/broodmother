# Instrument & Market Comparison

Status: master cross-company synthesis. Compiled 2026-07-19 from the individual technology notes in this folder (each linked below) — this note does not introduce new primary research; it re-derives comparable units from numbers already sourced, dated, and confidence-labeled in those notes. See [[Terminology & Metrics]] for every term/unit used here and for which metrics are and are not directly comparable across technologies. Every "unavailable" cell below reflects a genuine gap already flagged in the source note, not an oversight — this report does not invent missing numbers.

**Confidence/source labels used throughout:** *(publicly reported / independently measured / calculated from reported data / estimated / unavailable)*, per the vault convention.

## 0. Which instruments are compared, and why these

Eighteen current, commercially-selling instrument configurations are compared, drawn from ten company folders. Two platforms are explicitly **excluded** from the core instrument tables because they are not general-purpose DNA sequencers and are not substitutable for the others on any of the requested metrics:
- **Singular Genomics G4X** ([[In Situ Sequencing (G4X)]]) — in-situ spatial multiomics on fixed tissue, not library-based whole-genome/targeted sequencing. Competes with 10x Genomics Xenium, not with any row below.
- **Applied Biosystems SeqStudio** ([[Sanger (Capillary Electrophoresis) Sequencing]]) — single-locus Sanger sequencing; no meaningful Gb/genome/reads-per-run figures exist because it isn't used at that scale.

**Genapsys** ([[Electronic Non-Optical Sequencing (eNGS)]]) is discontinued (2022) and included only in a historical footnote table (§9) — it is not a current purchasing option.

Two tiers are used consistently across every table: **high-throughput/production** (built for maximum Gb or genomes per day) and **benchtop/mid-throughput** (built for flexibility, turnaround, or lower capital cost). Where a company sells multiple configurations of the same chemistry (e.g., Illumina's four current instruments), one flagship row per tier is used here; full per-configuration detail lives in the linked company note.

| # | Instrument | Company | Tier | Technology note |
|---|---|---|---|---|
| 1 | NovaSeq X Plus (25B×2, 2×150) | Illumina | High-throughput | [[Sequencing by Synthesis (SBS)]] |
| 2 | DNBSEQ-T7 (4 flow cells) | MGI Tech / Complete Genomics | High-throughput | [[Research/Jack Research/Competitors/MGI Tech/DNBSEQ (cPAS)]] |
| 3 | Revio (SPRQ-Nx, 4 SMRT Cells) | PacBio | High-throughput, long-read | [[SMRT Sequencing (Revio, HiFi)]] |
| 4 | PromethION 48 | Oxford Nanopore | High-throughput, ultra-long-read | [[Nanopore Strand Sequencing]] |
| 5 | VITARI | Element Biosciences | High-throughput (pre-order, 2H 2026) | [[Avidity Sequencing]] |
| 6 | UG 100 (Solaris chemistry) | Ultima Genomics | High-throughput | [[Wafer-Scale Sequencing (UG 100)]] |
| 7 | AXELIOS 1 (SBX-Duplex) | Roche | High-throughput (RUO) | [[Sequencing by Expansion (SBX)]] |
| 8 | SURFSeq Q (FCH, PE150) | GeneMind Biosciences | High-throughput | [[SURFseq (Patterned-Array SBS)]] |
| 9 | NextSeq 2000 (P4) | Illumina | Benchtop | [[Sequencing by Synthesis (SBS)]] |
| 10 | MiSeq i100 Plus | Illumina | Benchtop, low-plex | [[Sequencing by Synthesis (SBS)]] |
| 11 | DNBSEQ-G400 (FCH) | MGI Tech / Complete Genomics | Benchtop | [[Research/Jack Research/Competitors/MGI Tech/DNBSEQ (cPAS)]] |
| 12 | Ion GeneStudio S5 Prime (dual 550) | Thermo Fisher / Ion Torrent | Benchtop, targeted panels | [[Ion Semiconductor Sequencing]] |
| 13 | Genexus (GX7) | Thermo Fisher / Ion Torrent | Benchtop, rapid sample-to-answer | [[Ion Semiconductor Sequencing]] |
| 14 | PromethION 2 Solo | Oxford Nanopore | Benchtop, long-read | [[Nanopore Strand Sequencing]] |
| 15 | MinION Mk1D | Oxford Nanopore | Portable, long-read | [[Nanopore Strand Sequencing]] |
| 16 | Onso | PacBio | Benchtop, high-accuracy short-read | [[Sequencing by Binding (Onso)]] |
| 17 | AVITI | Element Biosciences | Benchtop | [[Avidity Sequencing]] |
| 18 | G4 (F3 flow cell) | Singular Genomics | Benchtop | [[Sequencing by Synthesis (G4)]] |

## 1. Instrument purchase price (list capital price, USD)

| Instrument | List price | Label / confidence |
|---|---|---|
| NovaSeq X Plus | $1,250,000 | Publicly reported, high |
| DNBSEQ-T7 | ~$1,000,000 (2019 launch); later reports cite $600K–800K | Publicly reported, **low** — conflicting figures, current street price uncertain |
| Revio | $779,000 (2022 launch; SPRQ-Nx is same hardware) | Publicly reported, high |
| PromethION 48 | Price on request; market estimate $150K–$1M | **Low** — no primary figure |
| VITARI | $689,000 | Publicly reported, medium (pre-order pricing) |
| UG 100 | Unavailable | No primary source found |
| AXELIOS 1 | Unavailable | Not disclosed (3 weeks post-launch as of this report) |
| SURFSeq Q | Unavailable | Not published; GeneMind directs to direct sales |
| NextSeq 2000 | ~$335,000 | Publicly reported (industry blog), low-medium |
| MiSeq i100 Plus | Unavailable | Not found |
| DNBSEQ-G400 | ~$360,000 | Publicly reported, medium |
| Ion GeneStudio S5 Prime | ~$65,000 | Publicly reported (industry blog), low-medium |
| Genexus (GX7) | Unavailable; used-equipment proxy ~$60,000 | Estimated, low |
| PromethION 2 Solo | Price on request | Unavailable |
| MinION Mk1D | $3,150 (device); $5,150 (device + flow-cell pack) | Publicly reported, high |
| Onso | $259,000 | Publicly reported, high |
| AVITI | ~$289,900 (2022 launch — likely dated) | Publicly reported, medium |
| G4 | $295,000 (reduced from $350,000 Feb 2024) | Publicly reported, medium |

**Read this chart alongside §9 (TCO), not alone** — instrument price without consumables/lifetime context is explicitly called out in [[Terminology & Metrics]] §5 as one of the least reliable standalone comparisons.

## 2. Cost per run, cost per gigabase, cost per 30× human genome

Units: cost per run = reagent/consumable list cost for one full run as defined per instrument (noted per row); cost/Gb = USD per 10⁹ bases; cost/genome = USD for ~90–100 Gb of usable sequence (the vault's 30× human-genome convention). All figures are reagent/consumable cost only, excluding instrument depreciation, library prep, and labor, unless stated otherwise.

| Instrument | Cost/run | Cost/Gb | Cost/30× genome | Label |
|---|---|---|---|---|
| NovaSeq X Plus (dual, 2×150 kit) | $29,000 (calc.) | $3.64 | $250–300 (calc.); vendor "$200" floor | Calculated from reported list pricing, medium |
| DNBSEQ-T7 | Unavailable | ~$1.50 | ~$135–150 | Publicly reported (vendor), low-medium |
| Revio (SPRQ-Nx) | $6,400 (calc., 4 cells) | $4.44 | $400–445 (calc.); vendor beta $250–345 | Calculated / vendor promotional, medium |
| PromethION 48 (48 cells) | $49,920 (calc.) | $3.60 (theoretical) | $700–1,040 (calc.); vendor forward target <$345 | Calculated, medium |
| VITARI | $3,000 (calc.) | $1.00 (company target) | $100 (company target) | Publicly reported (pre-shipment target), low-medium |
| UG 100 (Solaris) | ~$2,400/wafer (calc.) | $0.80 | ~$72–80 | Publicly reported (vendor pricing) + calculated, medium-high |
| AXELIOS 1 | Unavailable | Unavailable | Unavailable ("$150 genome" trade-press figure unverified, excluded) | Unavailable |
| SURFSeq Q | Unavailable | Unavailable | Unavailable | Unavailable |
| NextSeq 2000 | Unavailable | Unavailable | Unavailable | Unavailable |
| MiSeq i100 Plus | Unavailable | Unavailable | Not applicable (not a WGS-scale instrument) | — |
| DNBSEQ-G400 | Unavailable | Unavailable | Unavailable | Unavailable |
| Ion GeneStudio S5 Prime | Unavailable | Unavailable | Unavailable / not applicable (not marketed for 30× WGS) | Unavailable |
| Genexus (GX7) | Unavailable | Unavailable | Unavailable / not applicable | Unavailable |
| PromethION 2 Solo | $2,080 (calc.) | $5–10 (calc.) | $700–1,040 (calc., same basis as PromethION 48) | Calculated, medium |
| MinION Mk1D | $840 | $17–28 (calc.) | $700–1,040 (calc., same basis) | Calculated, medium |
| Onso | Unavailable | Unavailable | Unavailable | Unavailable |
| AVITI | ~$600 (calc.) | $2.00 (high-volume pricing) | $200 (high-volume) or $72 (instrument-amortization-only framing) | Publicly reported + calculated, medium |
| G4 | $6,080–$17,100 (calc., wide range) | $16–45 | $1,440–$4,050 (calc.) | Calculated from a wide vendor-cited reagent range, **low** |

See `attachments/cost-per-gb-comparison.svg` and `attachments/cost-per-30x-genome-comparison.svg` (embedded below).

![[cost-per-gb-comparison.svg]]

![[cost-per-30x-genome-comparison.svg]]

**Reading these two charts together, and why the ranking flips depending on which one you use:** Ultima UG 100 and Element VITARI lead on cost/Gb, but that ranking holds on cost/genome too — because both are short-read, fixed-length platforms where cost/Gb scales linearly into cost/genome with no accuracy or read-length penalty. That linearity breaks down the moment you cross into long-read platforms (PacBio, ONT): their higher cost/Gb buys structural, phasing, and native-modification information no amount of cheap short-read Gb can substitute for — see [[Terminology & Metrics]] §5 for why cost/Gb is not a fair single-axis ranking across read-length classes.

## 3. Throughput per hour and per day

Units: Gb/hour and Gb/day, nameplate/theoretical maximum (100% utilization, back-to-back runs) unless marked "practical."

| Instrument | Gb/hour | Gb/day | Label |
|---|---|---|---|
| NovaSeq X Plus | 333–437 | 8,000–10,500 | Calculated / publicly reported, medium |
| DNBSEQ-T7 | 250–292 (calc.) | 6,000–7,000 | Publicly reported, high |
| Revio (SPRQ-Nx) | 58.3 (calc.) | ~1,400 | Calculated, medium |
| PromethION 48 | 194.4 (calc., theoretical) | ~4,667 (theoretical); ~2,300–3,270 (50–70% practical) | Calculated, medium |
| VITARI | 83.3 (calc.) | ~2,000 | Calculated, medium |
| UG 100 (Solaris) | Unavailable (per-hour basis not published) | ~8,600 (calc., full utilization) | Calculated, medium |
| AXELIOS 1 | 450 (calc., sequencing-only time) | ~5,800–6,400 (calc., 64 genomes/day) | Calculated, high arithmetic / medium underlying figure |
| SURFSeq Q | 194 (calc.) | ~4,700 (theoretical) | Calculated, medium |
| NextSeq 2000 | Unavailable (no run-time published for P4) | Unavailable | Unavailable |
| MiSeq i100 Plus | 3.75 (calc.) | ~90 (calc., theoretical 3 runs/day) | Calculated, low-medium |
| DNBSEQ-G400 | 38.9 (calc.) | ~935 | Calculated, medium |
| Ion GeneStudio S5 Prime | 4.35 (calc., single run) | ~50–100 (calc., 1–2 cycles/day) | Calculated, medium |
| Genexus (GX7) | 0.7–0.8 (calc.) | ~16–20 | Calculated, medium — optimized for turnaround, not Gb/day |
| PromethION 2 Solo | 1.4–2.8 (calc., practical) | ~33–67 (practical); up to ~193 (theoretical) | Calculated, medium |
| MinION Mk1D | 0.42–0.69 (calc.) | ~10–16.7 | Calculated, medium |
| Onso | 2.8 (calc.) | ~67.5 | Calculated, medium |
| AVITI | 7.9 (calc.) | ~189.5 | Calculated, medium |
| G4 | ~20.6 (calc., rough) | ~475–500 (calc., theoretical) | Calculated, **low** — inputs themselves are vendor roll-up figures |

![[throughput-per-day-comparison.svg]]

## 4. Reads per run and read length

Units: reads/run in the platform's own reporting convention (paired reads counted as stated in each source note — see [[Terminology & Metrics]] §1 on why a "read" isn't a fixed unit across platforms); read length in bases, either a fixed cycle length (short-read) or an N50/mean of a broad distribution (long-read).

| Instrument | Reads/run | Typical read length | Max read length |
|---|---|---|---|
| NovaSeq X Plus | 52–70 billion (dual, PE) | 2×150 bp | 2×300 bp |
| DNBSEQ-T7 | up to 20 billion (4 flow cells) | PE100/150 | PE150 |
| Revio (SPRQ-Nx) | Unavailable (exact HiFi read count not published; ~100M ZMWs total, productive fraction unconfirmed) | 15–20 kb mean (HiFi) | Reads to >20 kb with size-selected libraries |
| PromethION 48 | up to ~700M (calc. @ 20 kb N50, theoretical) | N50 8–30 kb | >100 kb, multi-Mb demonstrated (ultra-long prep) |
| VITARI | 10 billion (5B/flow cell × 2) | 2×150 bp | 2×300 bp (roadmap) |
| UG 100 (Solaris) | 10–12 billion/wafer | ~2×150 bp (assumed for reconciliation calc.) | Not separately disclosed |
| AXELIOS 1 | Unavailable (yield reported in Tb, not read count) | ~230–260 bp (duplex) | ~1,500 bp (simplex) |
| SURFSeq Q (FCH) | 23.3 billion | PE150 | PE150 |
| NextSeq 2000 (P4) | 1.8 billion (SE) | ~2×150 bp (platform-typical) | 2×150 bp |
| MiSeq i100 Plus | up to 100 million (SE) | 2×150 bp | 2×300 bp |
| DNBSEQ-G400 (FCH) | 550M–1,800M | PE100/150/200/300 | SE400 |
| Ion GeneStudio S5 Prime | 200–260M (dual 550 chip) | 200 bp | up to 400–600 bp (application-dependent) |
| Genexus (GX7) | 80–100M | 200 bp | 200 bp |
| PromethION 2 Solo | ~5–10M (calc. @ 20 kb N50) | N50 8–30 kb | >100 kb possible |
| MinION Mk1D | ~1.5–2.5M (calc. @ 20 kb N50) | N50 8–30 kb | >100 kb, multi-Mb demonstrated |
| Onso | 400–500 million | 2×150 bp | 2×150 bp |
| AVITI (High Output) | ≥1B read pairs/flow cell × 2 (≈4B reads total) | 2×150 bp (kit-dependent, 2×75–2×300) | 2×300 bp |
| G4 (F3, 4 flow cells) | up to ~6.4 billion (vendor aggregate) | ≤2×150 bp | 2×150 bp typical; longer chemistries previewed |

![[read-length-comparison.svg]]

## 5. Raw-read accuracy and consensus accuracy

**Read [[Terminology & Metrics]] §2 before using this table** — several vendor "accuracy" figures conflate variant-calling/consensus accuracy with raw single-read accuracy; each row below states explicitly which one is reported, and flags the conflation where the source note identified one.

| Instrument | Raw-read accuracy | Consensus accuracy | Note |
|---|---|---|---|
| NovaSeq X Plus | >90% of bases ≥Q40 (XLEAP-SBS) | Not applicable — no multi-pass consensus mode | No independent current-generation benchmark located |
| DNBSEQ-T7 | 30× mismatch rate 0.34% (≈Q24.7-equivalent) reported vs. competitors | Not applicable | Source: vendor-published, referencing an uncorroborated Google-collaboration study — low-medium confidence |
| Revio (HiFi) | Not separately disclosed for SPRQ-Nx subreads; historical single-pass ~87–92% (older SMRT literature) | ~99.9%+ (Q30+), SPRQ-Nx: ~99.95% (Q33) | Consensus accuracy is the headline HiFi metric; raw subread accuracy is not marketed |
| PromethION 48 | 99.0–99.6% (Q20–Q24), simplex | ~99.9% (Q30), up to 99.92–99.95%, duplex | Vendor-reported (nanoporetech.com/platform/accuracy), not independently re-benchmarked in this pass |
| VITARI | ≥90% Q30 claimed (company target, unverified — not yet shipped) | Not applicable | Pre-shipment target |
| UG 100 | Unavailable — no Q-score/accuracy figure disclosed; uses a substitution-focused "SNVQ" score, not a standard Phred equivalent | Not applicable | Not directly comparable to Phred-based figures elsewhere in this table |
| AXELIOS 1 | Unavailable | ~Q38 average, duplex mode, GIAB-validated | Vendor-stated, GIAB reference basis lends more credibility than an unvalidated claim, but not yet independently reproduced |
| SURFSeq Q | ≥90% Q30; ≥90% of bases also reach Q40 | Not applicable | Vendor brochure, not independently verified |
| NextSeq 2000 | Platform-typical >90% ≥Q40 (XLEAP-SBS, same claim as NovaSeq X) | Not applicable | Not instrument-specific in sources found |
| MiSeq i100 Plus | >90% Q30 | Not applicable | Vendor spec sheet |
| DNBSEQ-G400 | Not separately given; platform-wide DNBSEQ 0.34% mismatch figure applies broadly | Not applicable | See DNBSEQ-T7 caveat |
| Ion GeneStudio S5 Prime | Unavailable — vendor's "99.99% accuracy" is variant-calling accuracy at coverage depth, not raw single-read accuracy (explicitly flagged in source note) | Not applicable in the PacBio/ONT consensus sense | Independent 2013-era PGM study found homopolymer errors = 96–97% of total errors, mean indel rate 1.68–4.84% — historical, not current-chemistry |
| Genexus (GX7) | Same caveat as S5 above | Not applicable | — |
| PromethION 2 Solo | 99.0–99.6% (Q20–Q24), simplex | ~99.9% (Q30), duplex | Same basis as PromethION 48 |
| MinION Mk1D | 99.0–99.6% (Q20–Q24), simplex | ~99.9% (Q30), duplex | Same basis as PromethION 48 |
| Onso | Q40+ claimed (~99.99%) | Not applicable — not a multi-pass consensus platform | Vendor/inventor claim, physically plausible given the examine-then-incorporate mechanism, not independently benchmarked |
| AVITI | >90% Q30 (High Output); UltraQ kit >90% Q40, >70% Q50 | Not applicable | Independent peer-reviewed benchmark (Xu et al. 2026, NAR Genomics and Bioinformatics) found AVITI comparable-to-better than NovaSeq X Plus at 20–30× coverage, but *worse* specifically within long GC-rich homopolymers — a genuine, sourced tradeoff, not uniformly better or worse |
| G4 | 80–90% Q30 at launch spec; recent runs >90% Q30, spec raised to ≥85% Q30 | Not applicable | Self-reported by vendor; no independent third-party benchmark located |

## 6. Active sensing sites

Units: the platform-specific count of independently addressable sequencing sites (clusters, DNBs, ZMWs, nanopores, wells) actually contributing to the reported yield — see [[Terminology & Metrics]] §4 for why these counts are not directly comparable to each other without normalizing for bases produced per site.

| Instrument | Active sensing sites | Basis |
|---|---|---|
| NovaSeq X Plus | ~52–70 billion PF clusters (dual 25B flow cell) | Publicly reported (PF read count used as proxy) |
| DNBSEQ-T7 | Unavailable (only post-filter reads/flow cell known, not raw DNB/occupancy count) | Unavailable |
| Revio | 100,000,000 ZMWs (4 × 25M); productive fraction ~60% assumed (unverified) ≈ 60M productive | Vendor spec (ZMW count) + estimated occupancy, low-medium |
| PromethION 48 | 144,000 channels physical max (48 × 3,000) | Publicly reported |
| VITARI | ~10 billion (read proxy, 2 flow cells × 6 lanes) | Publicly reported |
| UG 100 | Unavailable — no site-density/count published | Unavailable |
| AXELIOS 1 | >8,000,000 nanopores (physical); active/occupancy unavailable | Publicly reported (physical count only) |
| SURFSeq Q | ~23.3 billion (read-pair proxy, lower bound) | Calculated |
| NextSeq 2000 (P4) | ~1.8 billion (read proxy) | Publicly reported |
| MiSeq i100 Plus | ~100 million (read proxy) | Publicly reported |
| DNBSEQ-G400 | Unavailable | Unavailable |
| Ion GeneStudio S5 Prime | Unavailable (only the historical 2011 Ion 314 chip's 1.2M wells is independently sourced) | Unavailable |
| Genexus (GX7) | Unavailable | Unavailable |
| PromethION 2 Solo | 6,000 channels max (2 × 3,000) | Publicly reported |
| MinION Mk1D | 512 channels (2,048 physical pores, 4× MUX) | Publicly reported |
| Onso | Unavailable | Unavailable |
| AVITI | ~2 billion (read-pair proxy) | Publicly reported |
| G4 | Unavailable (reads/run used as proxy: up to 6.4 billion) | Publicly reported (proxy only) |

## 7. Annual theoretical and practical capacity

Units: human genomes/year at ~30× coverage (~90–100 Gb/genome), unless the platform isn't marketed for population-scale WGS (noted "not applicable"). "Theoretical" = continuous back-to-back runs, zero downtime. "Practical" = a stated, explicit utilization assumption (varies by row — see each figure's source note for the exact assumption).

| Instrument | Annual theoretical max | Annual practical (stated utilization) |
|---|---|---|
| NovaSeq X Plus | ~29,000–38,000 genomes/yr | ~20,000 genomes/yr (vendor claim, implies ~55–70% utilization) |
| DNBSEQ-T7 | ~21,900 genomes/yr (60/day × 365) | ~21,900 genomes/yr (vendor's own daily figure already reflects real-world claim) |
| Revio | ~2,500 genomes/yr | ~2,250 genomes/yr (90% uptime, calc.) |
| PromethION 48 | ~1.7 Pb/yr | ~500–850 Tb/yr (50–70% duty cycle) |
| VITARI | ~6,900 genomes/yr | ~4,830 genomes/yr (70% utilization) |
| UG 100 | >30,000 genomes/yr (vendor claim) | Same figure treated as already reflecting real customer throughput (medium confidence, per UMN reconciliation in source note) |
| AXELIOS 1 | ~23,360 genomes/yr (64/day × 365) | ~17,520 genomes/yr (75% utilization assumed) |
| SURFSeq Q | ~1,716 Tb/yr | ~1,200 Tb/yr (~70% uptime, calc.) |
| NextSeq 2000 | Unavailable (no run-time basis) | Unavailable |
| MiSeq i100 Plus | Not applicable (low-plex instrument, not genome-count use case) | Not applicable |
| DNBSEQ-G400 | Unavailable | Unavailable |
| Ion GeneStudio S5 Prime | ~18.25 Tb/yr theoretical | Not applicable (not marketed/used for population WGS) |
| Genexus | Not applicable (optimized for turnaround, not aggregate throughput) | Not applicable |
| PromethION 2 Solo | ~70.6 Tb/yr (theoretical-yield basis) | ~5–10 Tb/yr |
| MinION Mk1D | ~3.7–6.1 Tb/yr | ~1.5–2.5 Tb/yr (single weekly-run cadence assumption) |
| Onso | ~120–135 genomes/yr | ~90–100 genomes/yr (75% utilization) |
| AVITI | ~657 genomes/yr | ~460 genomes/yr (70% utilization) |
| G4 | Unavailable — reagent-cost range too wide to support a defensible genomes/year figure without compounding uncertainty | Unavailable |

### Instruments required to reach 1 Tb/day, and to sequence 100 / 1,000 / 10,000 human genomes/year

Pulled directly from each company note's own scalability calculation (all "calculated from reported data," confidence varies — see each source note):

| Instrument | Instruments for 1 Tb/day | Instruments for 100 genomes/yr | 1,000 genomes/yr | 10,000 genomes/yr |
|---|---|---|---|---|
| NovaSeq X Plus | <1 (single instrument does ~8–10.5×) | <<1 | <1 (realistically ~1 with batching/QC overhead) | ~1 (at ~55–70% utilization) |
| DNBSEQ-T7 | <1 | <<1 | <1 | ~1 |
| Revio | <1 (SPRQ-Nx); ~2.1 (launch chemistry) | 1 | 1 | ~5 |
| PromethION 48 | 1–2 (realistic) | <1 (P2 Solo/GridION sufficient) | ~1 P24 running rolling batches | ~1 P48, or 2 P24s |
| VITARI | <1–2 (realistic) | <1 | 1 | ~3 |
| UG 100 | <1 | <1 | <1 | <1 (one system covers all three tiers) |
| AXELIOS 1 | <1 | <1 | <1 | ~0.6 (one instrument covers it) |
| SURFSeq Q | 1–2 (realistic) | Not separately calculated | Not separately calculated | Not separately calculated |
| Ion GeneStudio S5 Prime | ~20 | Not applicable | Not applicable | Not applicable |
| PromethION 2 Solo | Not separately calculated (see PromethION 48) | ~1 | ~1 | Not applicable at this tier |
| MinION Mk1D | Not applicable at this tier | ~1 | Not applicable at this tier | Not applicable at this tier |
| Onso | ~15 | ~1 | ~10–11 | ~100–110 |
| AVITI | ~6 (theoretical); ~8 (70% realistic) | 1 | ~3 | ~22 |
| G4 | Not calculated (insufficient defensible cost/throughput basis) | Not calculated | Not calculated | Not calculated |

**The starkest pattern in this table**: for population-scale genome programs (1,000–10,000 genomes/year), a single high-throughput instrument from *any* of Illumina, MGI, PacBio (with caveats on cost), ONT, Element, Ultima, or Roche is sufficient at realistic utilization — the differentiator between these platforms at that scale is essentially never "how many machines do I need," it's cost/genome, accuracy class, and read-length/application fit. Benchtop and long-read-at-scale platforms (Onso, AVITI at the low end, PromethION at high genome counts) are the exceptions where instrument count actually becomes a real planning constraint.

## 8. Instrument footprint

Almost no vendor publishes footprint dimensions for their flagship systems in the sources located across all ten company notes — this is a genuine, near-universal data gap, not a search failure specific to one company.

| Instrument | Footprint | Label |
|---|---|---|
| AXELIOS 1 (Sequencing Instrument) | 1,380×1,644×760 mm, 438 kg, dual 200–240V/30–32A | Publicly reported, high — the only instrument in this comparison with fully disclosed dimensions |
| AXELIOS 1 (Synthesis Instrument) | 780×810×675 mm, 108 kg | Publicly reported, high |
| MinION Mk1D | Pocket-sized, USB-powered (no formal dimensions published, but qualitatively the smallest/most portable in this comparison) | Publicly reported, qualitative |
| PromethION 2 Solo | Described as "portable" entry-tier PromethION; no dimensions published | Estimated, qualitative |
| DNBSEQ-T20×2 | Reported combined weight >2 tons across two physical units (not tabulated as a main row above, but notable) | Publicly reported (independent customer account) |
| Ultima UG 100 | Two physical instrument units, combined weight >2 tons | Publicly reported (independent customer account) |
| All others (NovaSeq X Plus, DNBSEQ-T7/G400, Revio, PromethION 48, VITARI, SURFSeq Q, NextSeq 2000, MiSeq i100 Plus, S5 Prime, Genexus, Onso, AVITI, G4) | Unavailable | No dimensions found in any source note |

## 9. Estimated 5-year total cost of ownership (TCO)

**Method (stated explicitly per [[Terminology & Metrics]] §5's warning against comparing list price alone):** 5-year TCO = instrument list price + (5 × annual reagent/consumable spend at the *realistic/practical* annual output from §7, using the cost/genome or cost/Gb figure from §2). This excludes labor, facility, service contracts, and bioinformatics compute — a genuine, stated limitation, not an oversight. Only calculated where both a capital price and a defensible consumable-cost basis exist; all other rows are honestly "unavailable" rather than forced.

| Instrument | 5-yr TCO (calculated) | Assumption basis | Confidence |
|---|---|---|---|
| NovaSeq X Plus | ~$28.75M | ~20,000 genomes/yr × ~$275/genome | Medium-low — illustrative, full-production-scale usage assumed |
| DNBSEQ-T7 | ~$16.3M | ~21,900 genomes/yr × ~$140/genome | Medium-low |
| Revio | ~$5.5M | ~2,250 genomes/yr × ~$420/genome | Medium-low |
| VITARI | ~$3.1M | ~4,830 genomes/yr × $100/genome (company target) | **Low** — pre-shipment product, target pricing not yet field-validated |
| AVITI | ~$749,900 | ~460 genomes/yr × $200/genome | Medium-low |
| MinION Mk1D | ~$221,550 | ~52 flow-cell runs/yr × $840/run (weekly-cadence usage pattern, not continuous production) | Medium-low — assumes a specific, modest usage pattern |
| PromethION 48 | Unavailable | Instrument price unavailable | — |
| PromethION 2 Solo | Unavailable | Instrument price unavailable | — |
| UG 100 | Unavailable | Instrument price unavailable | — |
| AXELIOS 1 | Unavailable | No pricing disclosed at all | — |
| SURFSeq Q | Unavailable | Instrument price unavailable | — |
| NextSeq 2000 | Unavailable | No consumable-cost basis | — |
| MiSeq i100 Plus | Unavailable | No consumable-cost basis | — |
| DNBSEQ-G400 | Unavailable | No consumable-cost basis | — |
| Ion GeneStudio S5 Prime | Unavailable | No consumable-cost basis (platform not marketed for WGS-scale genome counting) | — |
| Genexus | Unavailable | No consumable-cost or capital-price basis | — |
| Onso | Unavailable | No consumable-cost basis | — |
| G4 | Unavailable | Reagent-cost range too wide (§7) to support a defensible annual-spend figure | — |

**Why so many TCO cells are "unavailable" rather than estimated:** compounding an already-wide reagent-cost range (e.g., G4's $16–45/Gb) with an assumed utilization rate would produce a number with no real epistemic grounding — exactly the "false precision" the original brief asked this report not to manufacture. The six instruments with a calculated TCO above are the ones where every input in the chain (price → realistic annual output → cost basis) was independently sourced, not stacked estimates on estimates.

## 10. Competitive landscape by market segment

For each segment: market leader (company **and specific product**), strongest direct challenger, emerging competitors, technological substitutes, principal customers, primary purchasing criteria, switching barriers, consumables lock-in, software-ecosystem edge, clinical-validation edge, and IP constraints. Percent-of-segment figures are **estimated, low-medium confidence** — no independent market-research source in any company note gave a clean, methodologically transparent segment breakdown; these are reasoned ranges built from the revenue-share and competitive-positioning evidence gathered across all ten notes, not a market-research citation.

### High-throughput short-read WGS
- **Market leader: Illumina NovaSeq X Plus.** Estimated 50–70% of segment revenue (down from a near-monopoly circa 2015–2020).
- **Strongest direct challenger: MGI DNBSEQ-T7/T7+** — chemically distinct (rolling-circle/DNB, no bridge PCR), materially undercuts Illumina on list price and $/Gb, but is structurally capped in the US market by BIOSECURE Act/1260H exposure (see [[Research/Jack Research/Competitors/MGI Tech/DNBSEQ (cPAS)]] §Regulatory). Estimated 10–20% of segment revenue globally, lower in the US specifically.
- **Emerging: Ultima Genomics UG 100** (lowest $/Gb of any shipping platform, thinnest independent validation), **Element VITARI** (just entering the same throughput tier). Combined estimated <10% today, but the fastest-growing slice of this segment.
- **Technological substitutes**: none within short-read chemistry family; the closest cross-technology substitute is Roche AXELIOS 1, whose SBX-Duplex ~230–260 bp reads target the same 30×-genome-per-day production niche via a completely different (electrical, single-molecule) mechanism.
- **Principal customers**: genome centers, population-genomics/biobank programs, pharma R&D, large reference labs.
- **Primary purchasing criteria**: cost/genome, cost/Gb, turnaround at scale, validated bioinformatics pipeline compatibility.
- **Switching barriers**: revalidating variant-calling pipelines against a new platform's specific error profile; re-training bioinformatics staff; CLIA/CAP/FDA-pathway re-validation for clinical-adjacent programs.
- **Consumables lock-in**: high across all players — flow cells/wafers/cells are single-source, patent-protected, instrument-specific.
- **Software ecosystem**: Illumina's DRAGEN/BaseSpace is the deepest and most widely integrated; every challenger ships standard FASTQ/BAM/VCF-compatible output to lower this specific barrier, but downstream tool tuning (variant callers optimized for one platform's substitution-dominated error profile) still favors the incumbent.
- **Clinical validation**: Illumina (MiSeqDx FDA clearance, largest LDT/CDx base) is far ahead of every other player in this segment; none of MGI, Ultima, Element, or Roche has an FDA-cleared instrument as of this report.
- **IP constraints**: Illumina has litigated patterned-flow-cell/ExAmp-adjacent IP against Chinese SBS entrants; MGI's DNBSEQ chemistry is patent-distinct (RCA/DNB, not bridge PCR), a genuine IP moat other Illumina-architecture challengers (GeneMind) lack.

### Benchtop short-read
- **Market leader: Illumina NextSeq 1000/2000.**
- **Strongest direct challenger: Element AVITI** (avidity chemistry, Illumina-adapter-compatible to lower switching cost) and **MGI DNBSEQ-G400** (lowest list price in this tier among named competitors).
- **Emerging: GeneMind SURFSeq Q/GenoLab M** (China-market alternative supply chain, architecturally SBS-equivalent), **Singular Genomics G4** (fastest cycle time, <3 min/cycle, but smallest installed base of any player in this segment).
- **Technological substitutes**: Thermo Fisher Ion GeneStudio S5 — different chemistry entirely (electrochemical, not optical), competing for the same core-lab budget line without being a chemistry substitute in the strict sense.
- **Principal customers**: core sequencing facilities, mid-size clinical/research labs, academic sequencing cores.
- **Purchasing criteria**: cost/Gb, run flexibility (small-batch turnaround), footprint, capital cost.
- **Switching barriers**: lower than the high-throughput tier — most challengers explicitly support Illumina-adapter-compatible libraries specifically to reduce this barrier.
- **Software ecosystem / clinical validation**: Illumina still leads both axes in this tier, though the gap is narrower than at the high-throughput tier since fewer benchtop instruments carry FDA clearance regardless of vendor.
- **IP**: GeneMind's bridge-amplification SBS is architecturally closer to Illumina's patented approach than MGI's chemically-distinct DNBSEQ — a real, if currently unrealized (no active litigation found), IP exposure specific to GeneMind.

### Targeted clinical sequencing / panels
- **Market leader: Thermo Fisher Ion Torrent** (Genexus Dx + Oncomine Dx Target/Express — the deepest, most current FDA companion-diagnostic footprint of any platform in this comparison, including approvals dated 2025-07-02 and 2025-11-20) for oncology CDx specifically; **Illumina MiSeqDx** for the broader FDA-cleared targeted-NGS-instrument category.
- **Strongest direct challenger**: Illumina MiSeq i100/NextSeq-based LDTs (e.g., FoundationOne CDx runs on Illumina hardware).
- **Emerging**: none of the newer entrants (Element, Ultima, Roche, Singular) have any clinical/IVD positioning yet in this segment.
- **Technological substitutes**: Applied Biosystems SeqStudio (Sanger) remains the required orthogonal confirmatory method for NGS-called variants in many accredited clinical labs — not a competitor, a mandatory complement.
- **Principal customers**: hospital molecular pathology labs, pharma companion-diagnostic partners.
- **Purchasing criteria**: FDA clearance status, assay breadth, turnaround, low hands-on time (Genexus's ~5 minutes is the category benchmark).
- **Switching barriers**: highest of any segment — full regulatory revalidation is required to change platforms for an approved CDx.
- **IP constraints**: Oncomine/FoundationOne-style exclusive assay-development partnerships create durable platform lock-in independent of the underlying chemistry's merits.

### High-accuracy long-read
- **Market leader: PacBio Revio (HiFi).** Highest consensus accuracy (~99.9%+, Q30–Q33) of any long-read platform.
- **Strongest direct challenger: Oxford Nanopore PromethION** (duplex mode, ~Q30) — lower accuracy per read than HiFi but wins on read length, native modification calling, and instrument cost.
- **Emerging**: Roche AXELIOS 1 makes an accuracy claim in the same range (~Q38, duplex) but at a read length (~230–260 bp) an order of magnitude short of true long-read use cases — it's better classified as a rapid-WGS entrant competing with Illumina/MGI (above) than a long-read competitor to PacBio/ONT, despite sharing electrical single-molecule detection with ONT's lineage.
- **Technological substitutes**: short-read WGS plus statistical population-reference phasing, for labs unwilling to buy a second platform — a materially weaker substitute for true structural-variant/repeat-region work.
- **Principal customers**: rare-disease research groups, genome centers running T2T/pangenome projects, structural-variant-focused clinical research.
- **Purchasing criteria**: consensus accuracy, read length, cost/genome, native epigenetic-calling capability.
- **Switching barriers**: HiFi-tuned vs. Dorado/ONT-tuned bioinformatics pipelines are not interchangeable; many genome centers run both platforms rather than switching.
- **IP**: PacBio and ONT settled patent litigation over nanopore/ZMW-adjacent IP in 2018 — a reminder that even in long-read sequencing, the two incumbents' underlying detection mechanisms were legally contested, not just competitively distinct.

### Ultra-long-read
- **Market leader: Oxford Nanopore (PromethION/GridION)** — essentially uncontested; only platform routinely producing N50 >100 kb and multi-Mb reads from standard prep.
- **Strongest direct challenger**: none at feature parity — PacBio HiFi tops out at a 15–20 kb mean, a full order of magnitude short of ONT's ultra-long tier.
- **Technological substitutes**: optical genome mapping (Bionano, not covered as a DNA-sequencing note in this vault since it doesn't read bases) for some structural-variant applications.
- **Principal customers**: T2T/pangenome assembly projects, complex structural-variant and repeat-region research (the 2022 T2T-CHM13 assembly relied heavily on ONT ultra-long reads).
- **Purchasing criteria**: maximum read length, native base-modification detection.
- **Switching barriers**: minimal at the chemistry level (same ONT flow cells serve standard and ultra-long prep) — the real switching cost is ultra-long library-prep expertise (careful HMW DNA handling), not platform lock-in.

### Portable and field sequencing
- **Market leader: Oxford Nanopore MinION/Flongle** — effectively uncontested in this category.
- **Strongest direct challenger**: none at feature parity within true single-molecule long-read portability; Thermo Fisher's smallest Ion configurations and various rapid-PCR diagnostics compete for adjacent "small footprint, low capital cost" budgets without offering the same real-time, long-read, native-modification capability.
- **Principal customers**: outbreak genomic surveillance (Ebola/Zika-era precedent), field biology, extreme-environment sequencing (ISS spaceflight).
- **Purchasing criteria**: portability, power draw, real-time streaming data, minimal infrastructure.
- **Switching barriers**: minimal — low capital cost ($3,150 device) is itself the product's appeal, not a lock-in mechanism.

### Rapid sample-to-answer
- **Market leader: Thermo Fisher Genexus** — fastest fully-integrated workflow in this comparison (~24 h sample-to-report, ~5 minutes hands-on time), a direct structural consequence of having no optical subsystem at all.
- **Strongest direct challenger**: Oxford Nanopore rapid kits (MinION, 1–8 h for targeted applications like outbreak genotyping) — faster for narrow targeted questions, slower and less automated for a full validated clinical report.
- **Emerging**: Roche AXELIOS 1's "same-day whole-genome sequencing" claim targets this exact niche at WGS scale (not just targeted panels), but is three weeks old as of this report with zero independent validation.
- **Principal customers**: hospital labs needing fast turnaround (ICU rare-disease diagnosis, oncology), outbreak response teams.
- **Purchasing criteria**: total hands-on time, total sample-to-answer time, workflow automation depth.
- **Switching barriers**: workflow/software integration and validation, not chemistry lock-in per se.

### Multi-omics and spatial biology
- **Market leader: 10x Genomics Xenium** (not a DNA sequencer and not profiled as a dedicated note in this vault per its scope, but the acknowledged category leader against which the sequencing-vendor entrants below are explicitly positioned).
- **Strongest direct challenger from within this comparison set**: Element Biosciences AVITI24 (Teton Cytoprofiling/ABC Sequencing, in-situ RNA+protein+morphology on the same optical hardware as standard avidity sequencing) and Singular Genomics G4X (padlock-probe/RCA in-situ multiomics, launched commercially in the US February 2026, 128 samples/40 cm² per run — a materially different physical pipeline from either company's own DNA sequencer, per [[In Situ Sequencing (G4X)]]).
- **Emerging**: NanoString (Bruker) CosMx, Vizgen MERSCOPE (neither profiled in this vault, both named as direct G4X/AVITI24 competitors in the source notes).
- **Principal customers**: spatial-biology researchers, translational/tumor-microenvironment oncology programs.
- **Purchasing criteria**: plex depth (gene panel size), tissue-area throughput per run, combined RNA+protein+morphology capability.
- **Switching barriers**: gene-panel content lock-in (every target needs a designed probe) is the dominant switching cost, structurally different from a sequencer's flow-cell/reagent lock-in.
- **IP**: padlock-probe/RCA in-situ detection chemistry is a crowded, actively contested patent space across multiple vendors (not itemized per-company in this pass — flagged as a real constraint, not detailed).

## 11. Closing synthesis

### Best platform by application (from the original brief's application list)

| Application | Best platform | Why |
|---|---|---|
| Short-read whole-genome sequencing (population scale) | Illumina NovaSeq X Plus (cost-sensitive: Ultima UG 100 or MGI DNBSEQ-T7) | Deepest ecosystem/validation; UG 100/DNBSEQ-T7 win purely on $/genome if ecosystem maturity isn't the deciding factor |
| Whole-exome sequencing | Illumina NextSeq 1000/2000 or NovaSeq X | Standard short-read capture workflows are most mature here |
| Targeted panels (oncology, PGx, inherited disease) | Thermo Fisher Ion Torrent (Genexus/S5, Oncomine ecosystem) | Deepest FDA-cleared CDx footprint, fastest turnaround, purpose-built AmpliSeq workflow |
| Cancer sequencing (hotspot/comprehensive panels) | Thermo Fisher Ion Torrent (Genexus Dx) | Same reasoning; largest current-dated FDA CDx approval count in this comparison |
| Rare-disease sequencing | PacBio Revio (HiFi) + ONT PromethION (often run together) | Structural variants and phasing frequently the causal lesion; short-read alone under-calls these |
| Infectious-disease sequencing | Oxford Nanopore MinION/GridION | Real-time streaming, adaptive sampling, and field portability directly serve outbreak response |
| Metagenomics | Oxford Nanopore (long reads improve strain resolution) or PacBio Onso (per its own published taxa-resolution claims) | Long native reads span whole small genomes; Onso's binding-based accuracy independently aids ambiguous-read classification |
| Transcriptomics (short-read RNA-seq) | Illumina or Element AVITI | Mature short-read RNA-seq ecosystem; AVITI's RCA-based amplification avoids some PCR-driven quantification bias |
| Direct RNA sequencing | Oxford Nanopore | The only platform in this comparison that sequences native RNA molecules without cDNA conversion |
| Single-cell sequencing | Illumina (as the dominant read-out engine for 10x Genomics et al.) or Singular G4 Max Read (purpose-built high-read-count mode) | Ecosystem depth vs. purpose-built over-seeding design — genuine tradeoff, not a clean winner |
| Spatial biology | 10x Genomics Xenium (category leader, outside this vault's scope) or Singular G4X / Element AVITI24 (from within this comparison set) | See §10 Multi-omics segment |
| Methylation / epigenetics | Oxford Nanopore or PacBio HiFi | Both call base modifications directly from native molecules, no bisulfite conversion damage/bias |
| Structural-variant detection | Oxford Nanopore (ultra-long) or PacBio HiFi (highest-confidence breakpoints) | Long native reads directly span most SV classes; short-read platforms require indirect inference |
| Haplotype phasing | Oxford Nanopore (ultra-long) or PacBio HiFi | Physical molecule length directly links heterozygous variants without population-reference statistical phasing |
| De novo genome assembly | PacBio HiFi + ONT ultra-long combined | The published T2T-CHM13 approach — neither platform alone resolves every repeat class |
| Repetitive genomic regions | Oxford Nanopore (ultra-long) | Same T2T precedent; only platform with reads long enough to span the largest repeat/segmental-duplication classes |
| Pharmacogenomics | Thermo Fisher Ion Torrent (targeted panel ecosystem) or Illumina MiSeqDx | Both have purpose-built, validated PGx panel offerings |
| Clinical diagnostics (regulated IVD) | Illumina (MiSeqDx) and Thermo Fisher (Genexus Dx, Oncomine Dx) | The only two platform families in this comparison with meaningful current FDA clearance depth |
| Rapid / portable sequencing | Oxford Nanopore MinION (portable) or Thermo Fisher Genexus (rapid, non-portable but fastest integrated turnaround) | Different axes of "rapid" — field-portable vs. fastest full clinical workflow |

### Strongest direct competitors per market segment, with estimated share range

*(All percentages estimated, low-medium confidence — reasoned from the evidence gathered across all ten company notes, not sourced to a single market-research report; see §10 for the reasoning behind each figure.)*

| Segment | Leader (est. share) | Strongest challenger (est. share) |
|---|---|---|
| High-throughput short-read WGS | Illumina, 50–70% | MGI, 10–20% |
| Benchtop short-read | Illumina, 40–60% | Element / MGI, combined 15–25% |
| Targeted clinical panels | Thermo Fisher Ion Torrent + Illumina, combined 60–80% | (no single strong #2 identified in sources gathered) |
| High-accuracy long-read | PacBio, 40–55% | Oxford Nanopore, 35–50% (these two roughly split this segment) |
| Ultra-long-read | Oxford Nanopore, >85% | (no meaningful direct competitor identified) |
| Portable/field | Oxford Nanopore, >90% | (no meaningful direct competitor identified) |
| Rapid sample-to-answer | Thermo Fisher Genexus, 30–50% | Oxford Nanopore rapid kits, 20–35% |
| Multi-omics/spatial | 10x Genomics (outside this vault's scope), majority | Element AVITI24 + Singular G4X + NanoString + Vizgen splitting the remainder, each likely single-digit-to-low-teens % |

### Most scalable underlying technology

**Horizontally**, DNA nanoball/wafer/patterned-array-class chemistries that decouple amplification from the sequencing substrate (MGI's DNB-on-array, Ultima's emulsion-then-wafer, Element's RCA polonies) scale most cleanly by adding sensing area, since none of them fight PCR-cluster-overlap constraints on the substrate itself. **Vertically**, Oxford Nanopore is architecturally the most different: its bottleneck (motor-protein translocation speed) is fixed by single-molecule biophysics, not imaging or fluidics, so ONT's real efficiency gains have come from adding channels/flow cells and reducing pore-fouling downtime — a platform that scales almost entirely horizontally by design. The single technology with the most *headroom left* on both axes simultaneously is arguably **Ultima's open-wafer architecture**: it has no sealed-flow-cell fluidic ceiling (horizontal), and its Solaris chemistry update already demonstrated a 50% vertical throughput gain from chemistry alone without new hardware — though this is tempered by it also being the platform with the thinnest independent validation of any in this comparison.

### Largest technical bottleneck, one line per company

| Company | Primary bottleneck |
|---|---|
| Illumina | Imaging throughput and fluidic exchange time per cycle, not incorporation chemistry |
| MGI Tech / Complete Genomics | DNB packing density vs. optical/basecalling crosstalk at very short pitch |
| Thermo Fisher / Ion Torrent | Homopolymer-length resolution from an analog pH-magnitude signal |
| Oxford Nanopore | Per-pore translocation speed, fixed by motor-protein biophysics; secondarily, pore lifetime/occupancy decay within a run |
| PacBio (SMRT) | ZMW areal density (optical-crosstalk-limited) and real-time single-molecule polymerase kinetics, neither of which can be sped up by shortening a wash/image cycle (there isn't one) |
| PacBio (Onso/SBB) | Two-step examine-then-incorporate cycle inherently slower per base than single-step SBS (inference, not vendor-confirmed) |
| Element Biosciences | Imaging/cycle time and fluidic exchange across a shared optical system — throughput gains to date have come from adding lanes, not cutting cycle time |
| Ultima Genomics | DNA-damage-induced substitution artifacts and homopolymer run-length ambiguity in largely-unterminated flow chemistry (addressed computationally, not chemically) |
| Roche | Two-stage instrument architecture and run-queueing (Synthesis Instrument's ~4 h cycle, only 4 pools queued) — not sensor count, which is already very large |
| Singular Genomics (G4) | Same phasing/signal-decay class as any cyclic SBS platform; smaller independent validation base is a commercial, not physical, bottleneck |
| GeneMind Biosciences | Identical in kind to Illumina's — imaging-cycle-bound run time |
| Genapsys (discontinued) | Not technical — public reporting attributes the failure to a cash/liquidity crisis and leadership/litigation disputes, not a disclosed chemistry ceiling |

### Emerging companies most likely to gain market share over the next five years

Ranked by a combination of demonstrated cost/technical differentiation and the size of the barrier still standing between them and broad adoption:

1. **Ultima Genomics** — the largest publicly-quoted cost/Gb advantage in this entire comparison, a working Solaris chemistry upgrade already shipped, and explicit head-to-head positioning against NovaSeq X Plus and DNBSEQ-T7. Principal barrier: thinnest independent (non-vendor) validation literature of any currently-shipping platform in this report.
2. **Element Biosciences** — VITARI directly targets NovaSeq X Plus-class throughput with a mechanistically distinct, peer-reviewed-validated (Nature Biotechnology 2023; NAR Genomics and Bioinformatics 2026) chemistry, and AVITI has already accumulated more independent benchmarking than most other new entrants. Principal barrier: VITARI is unproven in the field as of this report (pre-order only).
3. **MGI Tech / Complete Genomics** — technically mature, chemically distinct, and already has meaningful installed base outside the US; the ceiling on its US-market share specifically (not global) is regulatory (BIOSECURE/1260H), not technical — a genuinely different kind of constraint than the other companies on this list.
4. **Roche** — AXELIOS 1 is the newest platform in this entire comparison (three weeks old as of this report) with real, primary-sourced, high-throughput specs and a genuinely novel electrical single-molecule mechanism, but zero independent validation and RUO-only status. Could move up or down this ranking quickly depending on early-adopter results.
5. **Oxford Nanopore** — already a clear leader in its own segments (ultra-long-read, portable), the growth case here is less "will it gain share" and more "will PromethION Plus chemistry close the accuracy/cost-per-genome gap enough to pull share from short-read production sequencing" — a real but narrower opportunity than the short-read disruptors above.

Singular Genomics (now private under Deerfield ownership) and GeneMind Biosciences (structurally a China-market/geopolitical hedge rather than a technical differentiator) are judged less likely to gain material *global* share in the next five years — not because either is technically deficient, but because neither has a cost, accuracy, or read-length axis that clearly beats the leaders in its own segment.

## Sources

This note is a derived synthesis; every individual figure traces to a citation already recorded in its source company note (linked in §0's table and throughout). No new primary sources were consulted for this note beyond re-deriving comparable units from those already-cited figures. See each linked note's own Sources and Confidence Summary sections for full citations, publication dates, and per-claim confidence levels.

Chart files (hand-built SVG, no external charting library available in this environment): `attachments/cost-per-gb-comparison.svg`, `attachments/cost-per-30x-genome-comparison.svg`, `attachments/throughput-per-day-comparison.svg`, `attachments/read-length-comparison.svg`.
