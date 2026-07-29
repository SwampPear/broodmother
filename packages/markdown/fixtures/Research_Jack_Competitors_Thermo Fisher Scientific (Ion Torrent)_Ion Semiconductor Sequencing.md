# Ion Semiconductor Sequencing — Thermo Fisher Scientific / Ion Torrent

Status: **currently selling** (Ion GeneStudio S5 family and Genexus family both actively marketed, 2026). Researched/compiled 2026-07-18. Confidence and source labels follow the vault convention: *(publicly reported / independently measured / calculated from reported data / estimated / unavailable)*.

Ion Torrent was founded by Jonathan Rothberg, acquired by Life Technologies in 2010, which was itself acquired by Thermo Fisher Scientific in 2014; Ion Torrent now operates as a Thermo Fisher product line. See also [[Sanger (Capillary Electrophoresis) Sequencing]] in this same folder for Thermo's other, physically unrelated sequencing product line (Applied Biosystems SeqStudio).

## 1. Platform profile

| Attribute | Detail |
|---|---|
| Sequencing chemistry | Sequencing by synthesis with **natural (unmodified), unlabeled** nucleotides — no fluorescent dye, no reversible terminator. One nucleotide type is flowed at a time; incorporation is detected chemically, not optically. |
| Detection method | **Electronic/electrochemical** — an ion-sensitive field-effect transistor (ISFET) beneath each well measures the tiny pH drop caused by the H⁺ ion released each time DNA polymerase incorporates a nucleotide. No lasers, cameras, or optical filters are part of the sequencing-signal path (publicly reported, high confidence — this is the platform's defining, patent-protected mechanism: Rothberg et al., *Nature* 2011, "An integrated semiconductor device enabling non-optical genome sequencing," PMID 21776081). |
| Amplification method | **Emulsion PCR (emPCR)** on ~2 µm acrylamide Ion Sphere Particles (ISPs) — water-in-oil droplets, each ideally containing one library molecule and one primer-bead, thermally cycled to build clonal bead populations (S5 family, via the automated Ion Chef instrument). The newer Genexus system replaces emPCR with a different, proprietary clonal-amplification chemistry integrated into its automated cartridge workflow (publicly reported as "next-generation templating chemistry" in Thermo Fisher literature; exact mechanism not fully detailed in public sources — **labeled estimated/unavailable** for the precise chemistry, though the functional outcome — clonal bead populations loaded onto a semiconductor chip — is the same as S5). |
| Chip/array architecture | CMOS semiconductor chip, lithographically etched into millions of microwells, each seated directly above one ISFET sensor. The original 2011 Ion 314 chip had **1.2 million wells** (publicly reported, peer-reviewed, Rothberg et al. 2011 — historical reference point, not a current product). Current Ion 510–550 chips and Genexus GX5/GX7 chips use much higher well densities to reach their 2–130 million-read outputs; exact current well counts are not published by Thermo Fisher in sources located during this research pass — **labeled unavailable**; see Scalability section for a bounded estimate calculated from reported read counts. |
| Typical applications | Targeted amplicon panels (Ion AmpliSeq) — oncology hotspot/comprehensive panels, inherited-disease panels, pharmacogenomics, microbial ID, forensic STR profiling — plus lower-volume whole-exome and small/microbial whole-genome work. Not marketed or commonly used for population-scale human WGS. |
| Major advantages | No optics in the signal path → simpler, cheaper, smaller instruments and inherently fast per-cycle time (a flow-wash-measure cycle is faster than a flow-image-wash-cleave cycle); lowest capital cost of any mainstream benchtop NGS platform; Genexus offers the most automated, lowest-hands-on-time sample-to-report workflow of any platform compared in this vault (~5 minutes hands-on, publicly reported); deep, FDA-cleared oncology companion-diagnostic ecosystem (Oncomine panels). |
| Major limitations | Homopolymer-driven indel error dominates the error profile (see Application Specialization); read lengths capped well below long-read platforms (200–400 bp typical, up to ~400–600 bp in some configurations) and below Illumina's practical 2×150–2×300 bp; no long-read, no native single-molecule modification detection; emPCR (S5 family) introduces the same amplification/GC-bias exposure as any PCR-based clonal-amplification platform; smaller installed base and software ecosystem than Illumina, which limits some lab standardization/LDT-portability decisions. |
| Regulatory/clinical positioning | Strongest, most current-dated clinical footprint of any platform in this vault after Illumina: the **Oncomine Dx Target Test** and **Oncomine Dx Express Test** (the latter running on the FDA-cleared **Genexus Dx Integrated Sequencer**, an IVD-labeled clinical instrument distinct from the research-use Genexus) hold multiple active FDA companion-diagnostic approvals, including approvals as recent as 2025-07-02 (ZEGFROVY/sunvozertinib, NSCLC) and 2025-11-20 (sevabertinib, NSCLC) *(publicly reported, high confidence — BusinessWire/OncLive company and trade-press coverage of FDA actions, both primary-adjacent regulatory news)*. |

## 2. Physical pipeline: hair strand → prepared library → electronic (pH) signal

*(Preserved and refined from the vault's original draft; steps 1–4 sample handling match the general pattern shared with Illumina/MGI — see those notes for a parallel account of the DNA-extraction stage.)*

**A. Sample to purified DNA**
1. Hair is collected with the root bulb attached — the bulb's follicular cells carry nuclear genomic DNA (shaft-only hair carries essentially no usable nuclear DNA).
2. Cells are lysed and protein is digested (detergent + proteinase K); genomic DNA is purified via silica-column or paramagnetic-bead binding, eluted into buffer.
3. DNA is quantified and quality-checked (fluorometric quantification; fragment-size/degradation check).

**B. Library preparation**
4. Genomic DNA (or, far more commonly in Ion Torrent's actual clinical workflow, a small multiplex PCR reaction directly on the sample) is used to generate short, appropriately sized fragments/amplicons — typically 125–275 bp inserts for Ion AmpliSeq targeted panels, or ~200–400 bp inserts for shotgun/whole-genome library prep.
5. Short Ion-specific **A and P1 adapters**, including a sample barcode, are ligated (or, for AmpliSeq, built into the multiplex-PCR primers) onto each fragment.

**C. Clonal amplification (emulsion PCR, Ion Chef-automated on the S5 family)**
6. The adapted library is mixed with ~2 µm oligo-coated acrylamide Ion Sphere Particles (ISPs) and PCR reagents, then partitioned so that ideally one library molecule and one primer-coated ISP end up together in one water-in-oil emulsion droplet.
7. Thermal cycling within each droplet denatures the library to single strands; one template strand binds a bead-bound oligo through its adapter, and polymerase extends the bead oligo to create a bead-attached copy. Repeated heating/annealing/extension cycles (the released free strand rebinds unused bead oligos within the same droplet) cover each isolated bead with many clonal copies of the same original fragment — functionally analogous to Illumina's bridge amplification, but occurring inside an isolated oil droplet with a bead as the solid support, rather than on a flat, patterned glass surface.
8. The emulsion is broken; ISPs are recovered in aqueous buffer, and centrifugation/magnetic enrichment removes empty (unloaded) beads.
9. A final strand-separation step leaves single-stranded, sequencing-ready template on each enriched, clonally loaded ISP.

**D. Chip loading**
10. Loaded ISPs are resuspended and transferred (robotically, via Ion Chef, or manually on older workflows) into the semiconductor chip's loading port.
11. The chip is centrifuged, driving beads down into the microwell array; well dimensions are sized so that essentially one bead seats per well. Excess/unseated beads are washed away in subsequent fluidics steps.

**E. Sequencing (flow-based, electronic detection)**
12. Sequencing reagents flow across the loaded chip while each bead remains physically confined above its own ISFET sensor.
13. One unlabeled nucleotide type (A, C, G, or T) is flowed over the entire chip at a time, in a fixed, repeating flow order.
14. In any given well, if the templates on that well's bead have the flowed base next in their sequence, polymerase incorporates it — one copy if it's a single base, or multiple copies in one flow if the template contains a homopolymer run of that base (e.g., three flowed bases incorporated at once for a run of "AAA" in the template).
15. Each incorporation event releases one H⁺ ion per base added; because every copy on the bead is incorporating in unison (clonal, in-phase synthesis, same logic as an Illumina cluster or an MGI DNB), the local pH drop is large enough for the ISFET beneath that well to register a clear, roughly-quantized voltage change.
16. The ISFET converts that local pH change directly into an electrical signal — this is the platform's single defining physical departure from every optical platform in this vault: base calling here is a **charge-measurement problem**, not an **image-analysis problem**.
17. The chip is washed, and the next nucleotide type in the flow order is introduced; the cycle (flow → measure → wash) repeats for the programmed number of flows.
18. Software tracks every well's signal independently across all flows, converting the sequence of voltage magnitudes at each well into a called base sequence — a well with no signal for a given flow means that base wasn't next in that template; a well with a signal roughly double (or triple, etc.) the single-incorporation baseline means a homopolymer run of that length was called.
19. Reads with mixed/ambiguous signal (indicating more than one template loaded per bead — "polyclonal" wells) are filtered out, along with low-quality and adapter-contaminated reads.
20. Remaining reads are demultiplexed by sample barcode and aligned to a reference (or, for AmpliSeq panels, to the target amplicon set) for variant calling.

## 3. Instrument-level comparison

Figures are vendor-published specifications from Thermo Fisher spec sheets and press materials unless noted; $ figures are the least-reliable category (Thermo Fisher does not publish list prices; third-party/secondary-market figures are used and flagged low confidence).

### Ion GeneStudio S5 family (chip-based, semi-automated via Ion Chef)

| Chip | Reads/chip | Max read length | Typical yield (200 bp reads) | Run time (sequencing only) | Notes |
|---|---|---|---|---|---|
| Ion 510 | 2–3M | up to 400–600 bp (application-dependent) | ~0.4–1.2 Gb | ~2.5 h | Lowest-throughput, fastest-turnaround chip; small panels |
| Ion 520 | 4–6M | up to 400 bp | ~0.8–2.4 Gb | ~3 h | Small-to-mid panels |
| Ion 530 | 15–20M | up to 400 bp | ~3–8 Gb | ~4–5 h | Mid-size panels, small exomes |
| Ion 540 | 60–80M | 200 bp (400 bp not offered on this chip) | ~10–15 Gb, up to 30 Gb w/ 2 chips | ~19 h | High-throughput exome/large-panel work |
| Ion 550 | 100–130M | 200 bp | ~20–25 Gb, up to 50 Gb w/ 2 chips (S5 Prime only) | ~11.5 h | Highest-throughput S5 chip; S5 Prime-exclusive |

*(publicly reported — Thermo Fisher Ion GeneStudio S5 brochure/spec sheet and multiple secondary technical summaries cross-checked; confidence high for reads/chip and read length, medium for exact Gb/run-time pairings since these vary by protocol.)*

- **System tiers**: Ion GeneStudio S5 (compatible with 510–540 chips) and Ion GeneStudio S5 Prime (adds 550 chip compatibility, up to 50 Gb/day with dual 550 chips). Both require the separate **Ion Chef** instrument for automated emPCR/templating (~8 h Chef run) unless done manually.
- **List price**: Thermo Fisher does not publish a list price ("request quote" only). Secondary/industry-blog figures cite **≈$65,000** for Ion S5 vs. **$90,000–$150,000** for Illumina MiSeq and **≈$335,000** for NextSeq 2000 *(publicly reported by industry blogs Excedr and Biotech Veritas, not a primary Thermo Fisher source — confidence low-medium)*. Equipment resale listings show new Chef-bundled systems around $90,000 and refurbished units around $55,000 *(publicly reported, secondary market, low confidence for current new-unit pricing)*.
- **Cost per sample**: a peer-reviewed comparison (Barzon-independent group; picornavirus/calicivirus WGS study, *Journal of Virological Methods*/bioRxiv 2019, PMC9119587) found Ion Torrent 530-chip runs cost **$5.47–$10.25 more per sample than a comparably multiplexed (24-sample) Illumina MiSeq V2 run** *(independently measured, peer-reviewed, medium-high confidence — but specific to this one study's protocol and 2019-era reagent pricing, not necessarily current list pricing)*.

### Genexus family (fully integrated sample-to-report system)

| Component | Chip | Reads/chip | Read length | Sample-to-answer time | Hands-on time |
|---|---|---|---|---|---|
| Genexus Integrated Sequencer (+ Genexus Purification System) | GX5 Chip (4 lanes) | 12–15M/lane → 48–60M/chip | 200 bp | as little as 24 h from extracted/raw sample to report | ~5 minutes *(publicly reported, The Pathologist, 2021-12 user-experience article)* |
| same system, newer chip | GX7 Chip (4 lanes) | 20–25M/lane → 80–100M/chip | 200 bp | as little as 24 h | ~5 minutes |
| Genexus Purification System (standalone) | n/a | n/a | n/a | 2–5.5 h depending on protocol/sample count | Low — automated extraction |
| **Genexus Dx** (FDA-cleared IVD variant) | GX5/GX7 | as above | as above | ≤24 h, IVD-labeled clinical workflow | ~5 minutes |

*(publicly reported — Thermo Fisher Genexus/Genexus Dx product pages, GX7 chip spec sheet, Fisher Scientific catalog listings; confidence high for reads/lane and workflow-time claims, since these are consistent across multiple vendor and clinical-user sources including a 2024 comparative clinical paper — Genetics in Medicine Open, S2949774424007945 — that independently reports Genexus outperforming the older Ion PGM Dx on total reads, mapped reads, and mean depth.)*

- Genexus list price not found in any public source in this research pass — **labeled unavailable**. Used-equipment listings around $60,000 exist but are not a reliable proxy for new-system list price given typical NGS instrument depreciation curves — **labeled estimated, low confidence**.
- Genexus lanes can be run 1–4 at a time per chip, allowing labs to match throughput to daily sample volume without wasting a full chip — a scheduling/utilization advantage distinct from raw throughput.

### Cost-per-Gb / cost-per-genome caution

No complete, current, first-party reagent price list was located for either product line in this research pass. Third-party core-facility price sheets (the same category of source used for the Illumina note in this vault) were not found specifically for Ion Torrent in this pass — **cost per Gb, cost per million reads, and cost per 30× human genome for both Ion GeneStudio S5 and Genexus are labeled unavailable** rather than estimated, since no defensible reagent-cost baseline was found (unlike MGI/Illumina, where at least vendor marketing figures existed to calculate from). Given the platform is not marketed for 30× human WGS at all (see Application Specialization), a cost-per-genome figure would in any case be a poor fit for this platform's actual commercial use.

## 4. Application specialization and physical basis

| Application | Fit | Physical reasoning |
|---|---|---|
| Targeted panels (oncology, inherited disease, PGx) | **Strong** — core use case | Ion AmpliSeq multiplex-PCR library prep is fast and requires very little input DNA; short flow-based runs (down to ~2.5 h on Ion 510) match the turnaround clinical panels need; FDA-cleared Oncomine assays run natively on this chemistry. |
| Cancer sequencing (hotspot/comprehensive panels) | **Strong** | Same reasoning as above; this is the platform's single largest clinical revenue driver via Oncomine Dx Target/Express. |
| Infectious-disease / microbial ID | **Good** | Fast turnaround and low capital cost suit decentralized/hospital-lab deployment; short reads are adequate for targeted microbial panels and known-pathogen ID, less so for de novo assembly of novel pathogens. |
| Forensic STR profiling | **Good, niche** | A published, independent forensic-science workflow (ScienceDirect, S1872497322000941) validates Genexus + ForeNGS software for automated DNA-to-STR-profile analysis — an application where Genexus's low hands-on time and fast turnaround are directly valuable. |
| Whole-genome sequencing (human, population-scale) | **Poor** | Not marketed for this use; read lengths and per-run yield are far below what makes short-read WGS economical at scale on Illumina/MGI-class instruments, and no cost-per-genome figure is even published by the vendor for this configuration. |
| Whole-exome sequencing | **Moderate** | Technically supported (Ion 540/550 chips have adequate yield), but less common in practice than on Illumina, given smaller ecosystem of exome capture kits validated for Ion chemistry. |
| Long-read applications (SV detection, phasing, de novo assembly, repetitive regions) | **Not supported** | Ion semiconductor sequencing is a short-read (≤400–600 bp), amplification-based technology; it has no mechanism for long native-molecule reads. |
| Direct RNA / native base modification detection | **Not supported** | Sequencing occurs on amplified, PCR-derived DNA copies (via emPCR or Genexus's equivalent clonal step), not native single molecules — modification information is lost during amplification, same limitation as Illumina and MGI. |
| Single-cell / spatial | **Not supported as a native workflow** | No first-party single-cell or spatial product line was found for Ion Torrent in this research pass. |
| Rapid / decentralized sequencing | **Strong, distinctively so** | The absence of any optical subsystem (no laser, no camera, no image-processing pipeline) is what makes Genexus's low hands-on time and same-day turnaround physically possible — this is the platform's clearest structural advantage over every fluorescence-based competitor in this vault. |

**Homopolymer/indel error mode — the platform's defining error signature:**
Because base calls are made by measuring the *magnitude* of a pH signal (roughly proportional to how many identical bases were incorporated in one flow) rather than by imaging one discrete fluorescent event per base, distinguishing a run of, say, 5 identical bases from a run of 6 becomes progressively harder as homopolymer length grows — the signal is a continuous, noise-affected analog measurement being rounded to an integer, not a per-base binary detection. This is the direct physical cause of Ion Torrent's characteristic **insertion/deletion-dominated, homopolymer-driven error profile**, and it is not merely a historical PGM-era artifact: a foundational independent, peer-reviewed characterization (Salk et al./PLOS Computational Biology, PMC3623719, "Shining a Light on Dark Sequencing: Characterising Errors in Ion Torrent PGM Data") found homopolymer errors responsible for **96–97% of total errors**, with a mean indel rate of 1.68–4.84% depending on kit/read length, and substitution errors an order of magnitude rarer (0.04–0.17%) *(independently measured, peer-reviewed, high confidence for what it measured — but this study used the original PGM instrument and reagents circa 2013, not current S5/Genexus Hi-Q chemistry)*. Thermo Fisher's current vendor-reported accuracy claims (base-call accuracy 99.99%; Torrent Variant Caller sensitivity 99.85%/specificity 100%/accuracy 99.99% in one validation study) reflect substantial chemistry and basecalling improvements since 2013, but note that **the 99.99% "accuracy" figures found in this research pass describe variant-calling accuracy at adequate coverage depth (a consensus-like, post-processing metric), not necessarily single-read raw base accuracy** — no independently published, current-generation (S5/Genexus Hi-Q) raw single-read error-rate study was located in this pass. **This distinction is labeled explicitly because conflating vendor variant-caller accuracy with raw-read accuracy is exactly the kind of cross-metric error the vault's Terminology & Metrics note warns against.**

## 5. Standardized scalability analysis

**Horizontal scaling** (more wells / more chips / more instruments): Ion Torrent's product-line structure (510 → 520 → 530 → 540 → 550, and GX5 → GX7) is explicitly a horizontal-scaling ladder — same flow-based chemistry and same ISFET detection principle at every tier, with well density (and therefore reads/chip) increasing roughly 50-fold from the smallest to largest current chip (2–3M reads on Ion 510 vs. 100–130M on Ion 550).

- Physical well count: the only independently sourced figure located is the **original 2011 Ion 314 chip's 1.2 million wells** (peer-reviewed, Rothberg et al. 2011). Scaling that figure by the reads/chip ratio (Ion 550's ~100–130M reads is roughly 100× the 314 chip's typical usable read yield) implies current top-tier chips likely carry on the order of **hundreds of millions of physical wells**, but this is a rough, unverified extrapolation, not a reported figure — **labeled estimated, low confidence**. Total physical well count, active-well percentage, and occupancy rate for any current-generation Ion chip are **labeled unavailable** — Thermo Fisher does not publish these in the sources located.
- Instruments needed for 1 Tb/day: at S5 Prime's stated maximum of 50 Gb/day (dual Ion 550 chips), reaching 1 Tb/day would require **≈20 S5 Prime systems** run continuously at maximum configuration — calculated from reported data, optimistic (100%-utilization) assumption. Genexus, at 80–100M reads/chip and 200 bp reads (≈16–20 Gb per chip per ~24 h cycle, one chip at a time in the current integrated workflow), would need **far more instruments** to hit 1 Tb/day — Genexus is not designed or marketed as a bulk-throughput system; it is designed to optimize turnaround and hands-on time per sample, not aggregate daily Gb. This is the clearest illustration in this vault of a platform that deliberately does **not** compete on the horizontal-throughput axis at all.
- Instruments needed for 100 / 1,000 / 10,000 human genomes/year: not a meaningful calculation for this platform family, since neither product line is marketed, priced, or typically used for 30× human WGS (see Section 3 cost caveat) — **labeled not applicable** rather than estimated.

**Vertical scaling** (faster per-site/per-instrument output): this is where Ion Torrent's core architectural choice pays off most directly. Because there is no optical imaging step, each flow cycle is fundamentally a **flow → chemical reaction → electronic read → wash** sequence with no camera exposure or laser-scan time — inherently faster per cycle than an SBS optical cycle at equivalent chip size, which is the direct physical reason Genexus can offer same-day turnaround with minimal hands-on time. The tradeoff is that flow-based (rather than per-base-imaged) detection is what creates the homopolymer ambiguity problem described above — the platform's vertical-scaling advantage (speed) and its principal weakness (indel errors) share the same root cause: signal is read as an analog magnitude per flow, not a discrete per-base image.

- Bases generated per active site per second: not independently calculable from public data (well-level cycle timing and total active-well counts are not both published) — **labeled unavailable**.
- Primary physical bottleneck: **homopolymer-length resolution**, not chip density or fluidics speed — Thermo Fisher's chemistry roadmap (Hi-Q, Hi-Q View basecalling improvements) has historically targeted this exact problem rather than raw well density, which is consistent with it being the binding constraint (inferred from where R&D effort has visibly gone, not a direct vendor statement — confidence medium).
- The platform scales more naturally by **adding more chips/wells (horizontal, within the S5 family) and by shortening total workflow time via automation (Genexus)** than by extending read length or run duration — Ion chemistry read lengths have historically improved only modestly (PGM-era ~200–400 bp to current ~200–400/600 bp), while chip density and workflow automation have improved by orders of magnitude, indicating where the platform's real engineering investment has gone.

## 6. Competitive positioning

- **Ion GeneStudio S5 / S5 Prime** competes most directly with **Illumina MiSeq/MiSeq i100** and **NextSeq 1000/2000** in the benchtop clinical-panel and core-lab segment — same customer (hospital molecular pathology labs, academic core facilities, mid-size clinical labs), same budget tier (S5 systems priced well below MiSeq/NextSeq per the figures above), and overlapping workflows (targeted panels, small-genome/microbial work, PGx). Ion Torrent's pitch in this segment is lower capital cost and faster per-run turnaround; Illumina's counter-pitch is higher per-base accuracy, a far larger validated-assay and software ecosystem (BaseSpace, DRAGEN), and broader paired-end/longer-read-length flexibility.
- **Genexus / Genexus Dx** occupies a more distinctive competitive position: its closest functional competitor is not a single Illumina instrument but rather the *combination* of a separate library-prep automation system plus a sequencer plus separate analysis software that an Illumina-based lab would otherwise assemble — Genexus's value proposition is workflow consolidation and hands-on-time reduction, not raw throughput or accuracy. Within oncology companion diagnostics specifically, Genexus Dx and its Oncomine assays compete with other FDA-cleared or lab-developed NGS-based CDx workflows (including Illumina-based ones, e.g., FoundationOne CDx runs on Illumina hardware) for the same pharma-partnership and hospital-lab-adoption budget line.
- **Applied Biosystems SeqStudio** (Sanger/capillary) does not compete with either Ion or Illumina NGS platforms for the same budget or workflow — see [[Sanger (Capillary Electrophoresis) Sequencing]] for why it occupies a structurally separate, confirmatory/low-N niche.
- Full cross-company competitive-landscape tables are consolidated in [[Instrument & Market Comparison]].

## Sources

- Rothberg, J.M. et al., "An integrated semiconductor device enabling non-optical genome sequencing," *Nature* 475, 348–352 (2011), PMID 21776081 — foundational peer-reviewed description of the ISFET/pH-detection mechanism and the original 1.2M-well Ion 314 chip.
- Salk, J.J. et al. (title/authorship as indexed), "Shining a Light on Dark Sequencing: Characterising Errors in Ion Torrent PGM Data," *PLOS Computational Biology* (2013), PMC3623719 / PubMed 23592973 — peer-reviewed, independent homopolymer/indel error characterization (PGM-era).
- Comparison of error correction algorithms for Ion Torrent PGM data (hepatitis B virus application), *Scientific Reports* (2017), PMC5556038 — peer-reviewed, independent.
- Picornavirus/calicivirus WGS platform comparison (Ion Torrent PGM/S5 vs. Illumina MiSeq), *Journal of Virological Methods* / bioRxiv 2019, PMC9119587 — peer-reviewed, independent, source for per-sample cost delta.
- "Comparative analysis of Ion Torrent sequencing platforms: ... Genexus integrated sequencer in clinical applications," *Genetics in Medicine Open* (2024), S2949774424007945 — peer-reviewed/conference-proceedings, independent clinical comparison of Genexus vs. Ion PGM Dx.
- Ion Torrent™ Genexus™ Integrated Sequencer and ForeNGS Analysis Software forensic workflow paper, *Forensic Science International: Genetics* (2022), S1872497322000941 — peer-reviewed, independent.
- Thermo Fisher Scientific, Ion GeneStudio S5 Series brochure and spec sheet, documents.thermofisher.com — vendor-published specifications.
- Thermo Fisher Scientific, Genexus/Genexus Dx and GX5/GX7 chip product pages, thermofisher.com — vendor-published specifications.
- The Pathologist, "User experience of the Ion Torrent Genexus Integrated Sequencer" (2021-12) — reputable industry/trade press, user-reported hands-on-time figure.
- BusinessWire, "Thermo Fisher Scientific's Oncomine Dx Target Test Receives FDA Approval as a Companion Diagnostic..." (2025-11-20); BusinessWire, "Thermo Fisher's NGS Assay Receives FDA Approval as a Companion Diagnostic for ZEGFROVY..." (2025-07-02) — company press releases reporting primary FDA regulatory actions.
- Thermo Fisher Scientific, Form 10-K FY2025 (SEC EDGAR, filed 2026), Life Sciences Solutions segment revenue ($10,374M, 2025) — publicly reported, primary regulatory filing; Ion Torrent-specific revenue is not broken out separately within this segment.
- Excedr, "How Much Does a Next-Generation Sequencer Cost?"; Biotech Veritas, "Comparing NGS Platforms: Ion Torrent vs. Illumina" — reputable industry blogs, source for approximate instrument list-price comparison (low-medium confidence, not primary vendor pricing).
- Applied Biosystems SeqStudio product pages and GenomeWeb coverage — see companion note for full citation list.

## Confidence summary

| Claim | Confidence |
|---|---|
| Core ISFET/pH-detection mechanism and emPCR clonal amplification | High — peer-reviewed foundational paper, consistent with all vendor documentation |
| Current chip reads/run and read-length specs (510–550, GX5/GX7) | High — vendor spec sheets, cross-checked across multiple vendor and reseller sources |
| Physical well counts, active-well %, occupancy (current-gen chips) | Unavailable — not published; only the 2011-era 1.2M-well figure is independently sourced |
| Homopolymer/indel error mechanism and its physical cause | High — peer-reviewed, though the specific numeric error rates cited are PGM-era (2013), not current-generation |
| Current-generation (S5/Genexus) raw single-read accuracy vs. variant-calling accuracy | Medium-low — vendor figures conflate the two; no independent current-gen raw-accuracy study located |
| Instrument list prices (S5, Genexus) | Low — no primary vendor pricing published; relies on secondary/industry-blog and resale-market figures |
| Cost per Gb / per genome | Unavailable — no defensible current reagent-cost baseline found; also not a natural fit for this platform's marketed use case |
| FDA companion-diagnostic regulatory status (Oncomine Dx Target/Express, Genexus Dx) | High — primary-adjacent regulatory news (company press releases reporting specific FDA actions with dates) |
