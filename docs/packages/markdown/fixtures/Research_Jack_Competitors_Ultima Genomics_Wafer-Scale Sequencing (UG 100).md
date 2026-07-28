# Wafer-Scale Sequencing — Ultima Genomics (UG 100)

Status: **currently selling** — UG 100 announced/available to order 2024-02-06 (BusinessWire); throughput-upgraded "Solaris" chemistry announced 2025-02. Researched/compiled 2026-07-19. Confidence and source labels follow the vault convention: *(publicly reported / independently measured / calculated from reported data / estimated / unavailable)*.

Ultima Genomics is privately held (no 10-K/annual report); funding-round and valuation figures were not corroborated with a primary source in this research pass and are omitted rather than estimated from secondary aggregator sites.

## 1. What makes this a physically distinct pipeline

Ultima's core claim to a genuinely different hair-to-genome pipeline (not just a rescaled version of Illumina/MGI-style SBS) rests on two physical departures, both confirmed via the company's own product documentation and independent trade-press coverage of customer installations:

1. **Open, spinning silicon wafer instead of a sealed flow cell.** The sequencing substrate is described directly as "a massive spinning silicon wafer of the type used to fabricate computer chips" (University of Minnesota Genomics Center, describing their installed UG 100 — publicly reported, independent, 2024). Reagents are applied by **spin-coating**: fluid is dripped onto the center of the spinning wafer and centrifugal force spreads it into a uniform film across the whole surface, rather than pumping reagent through a sealed microfluidic channel network as Illumina/MGI/Element flow cells do (Bio-IT World, 2024 — publicly reported, independent trade press).
2. **"Mostly natural" nucleotide chemistry with flow-based delivery.** Per Ultima's own product documentation, the chemistry uses "one type of nucleotide per flow" — a flow-ordered delivery scheme conceptually related to Ion Torrent's sequential-flow approach, but read out optically rather than by pH, and combined with **ppmSeq** ("Paired Plus-Minus Sequencing"), a scheme the company describes as identifying and suppressing errors caused by DNA damage, plus a **machine-learning basecaller** used specifically to resolve homopolymer run lengths (Ultima Genomics product page, 2026; Bio-IT World, 2024). **Caveat, medium-low confidence:** the exact biochemical mechanism by which single-base flow control is maintained when most nucleotides are unblocked/"natural" (i.e., not carrying a reversible terminator, unlike Illumina/MGI/Element chemistry) was not confirmed against primary technical documentation or a peer-reviewed methods paper in this research pass — the company's own founding technical preprint (Almogy et al., bioRxiv, 2022-05-29, "Cost-efficient whole genome-sequencing using novel mostly natural sequencing-by-synthesis chemistry and open fluidics platform") could not be directly retrieved in this pass (bioRxiv blocked automated fetches). Note it is a **preprint**, not confirmed here as peer-reviewed/published in a journal. This mechanistic detail should be verified against that preprint or a later peer-reviewed methods paper before being treated as settled.

Clonal signal amplification is achieved by **emulsion-based clonal amplification** prior to wafer deposition (Ultima Genomics product documentation, 2026, publicly reported) — i.e., library molecules are clonally amplified in a water-in-oil emulsion (conceptually similar to Ion Torrent's Ion Sphere Particle emulsion PCR, or PacBio Onso's bead-based approach) before being deposited onto the wafer for sequencing, rather than amplified in place on the substrate the way Illumina bridge-PCR clusters or MGI DNA nanoballs are. This is a second, independent point of mechanistic divergence from Illumina/MGI-style on-substrate amplification.

## 2. Physical pipeline: hair strand → prepared library → optical signal

**A. Sample to purified DNA (shared with virtually all short-read platforms — see [[Sequencing by Synthesis (SBS)]] for the fuller version of this stage):**
1. Hair is collected with the root/bulb attached (nuclear DNA source).
2. Cells are lysed, protein digested, and genomic DNA purified (column or bead-based) into buffer.
3. DNA is quantified and quality-checked (concentration, purity ratios, fragment-size distribution).

**B. Library preparation:**
4. Genomic DNA is fragmented (mechanical or enzymatic) to the target insert size and ligated with Ultima-compatible adapters carrying sample indexes — Ultima supports third-party and its own **Solaris** family of library-prep workflows (Solaris Free, Solaris Flex, Solaris 2.0), plus compatibility with standard third-party kit providers (Ultima Genomics product documentation, 2026, publicly reported).
5. Library cleanup and QC as standard for short-read platforms.

**C. Clonal amplification and wafer loading (the platform's first physical divergence point):**
6. The prepared library is clonally amplified via **emulsion-based amplification** — each library molecule is isolated and clonally copied within a water-in-oil droplet, analogous in principle to Ion Torrent/PacBio Onso emulsion workflows, producing many clonal copies of each original fragment attached to/associated with a discrete unit.
7. The emulsion is broken and the clonally amplified material is loaded onto the **open silicon wafer** — a large-format, patterned substrate resembling a semiconductor fabrication wafer rather than a sealed glass/plastic flow-cell cartridge.

**D. Sequencing (the platform's second physical divergence point):**
8. The wafer spins continuously; sequencing reagents (successive single-nucleotide flows, wash steps, and imaging reagents) are applied by **spin-coating** — dripped at the wafer's center and spread outward by centrifugal force into a uniform film, rather than pumped through sealed microfluidic channels.
9. Nucleotides are delivered **one base type per flow** (flow-ordered chemistry), with most bases "mostly natural" (i.e., not each carrying a synthetic reversible-terminator/dye load the way standard Illumina/MGI/Element chemistry does on every cycle) — exact per-cycle termination/synchronization mechanism not independently confirmed in this pass (see caveat above).
10. **ppmSeq** paired plus/minus read generation is used to flag and computationally suppress errors traceable to DNA damage, and a machine-learning model is applied specifically to resolve homopolymer-run length from the flow signal (Ultima Genomics product documentation, 2026).
11. Optical imaging reads the wafer at each cycle, analogous in principle to Illumina/MGI camera-based cycle imaging, but across the full spinning wafer format rather than a static flow cell.
12. Base calls are converted to reads, assigned a **SNVQ** (single-nucleotide-variant quality) score — described by the company as focused specifically on substitution-error probability rather than an aggregate per-base Phred-style score (Ultima Genomics product documentation, 2026) — demultiplexed, and aligned to a reference genome for variant calling.

## 3. Platform profile

| Attribute | Detail |
|---|---|
| Sequencing chemistry | Flow-ordered, "mostly natural"-nucleotide sequencing-by-synthesis; one nucleotide type delivered per flow; ppmSeq paired plus/minus error-suppression scheme; ML-based homopolymer resolution. |
| Detection method | Optical (fluorescence-based cycle imaging), same broad family as Illumina/MGI, but across an open spinning-wafer format. |
| Amplification method | Emulsion-based clonal amplification prior to wafer loading (not on-substrate bridge PCR or RCA). |
| Array/substrate architecture | Open, large-format circular silicon wafer (semiconductor-fab-style), reagents applied via spin-coating; not a sealed flow-cell cartridge. |
| Typical applications | Whole-genome sequencing (population-scale, cost-sensitive), methylation profiling, minimal-residual-disease (MRD) detection, single-cell sequencing, RNA-seq (Ultima Genomics product documentation, 2026). |
| Major advantages | Lowest reported reagent cost per Gb among currently-shipping short-read platforms in this comparison set (publicly reported vendor pricing, see table below); open-wafer format claimed to enable continuous 24/7 operation; ppmSeq error-suppression targeted specifically at DNA-damage-derived errors, relevant to low-input/degraded-sample applications (e.g., cfDNA). |
| Major limitations | Short-read only — no long-read/structural-variant/phasing capability; newest entrant among currently-shipping platforms in this comparison (2024 commercial launch), so has the thinnest independent (non-vendor) benchmarking literature of any platform covered in this folder; instrument capital cost, physical footprint, and exact per-cycle chemistry mechanism are not fully disclosed in public sources found in this research pass (**unavailable**). |
| Regulatory/clinical positioning | No FDA clearance or CE-IVD marking identified for the UG 100 in this research pass — **unavailable/not found**, consistent with a 2024-vintage platform still establishing a clinical-validation track record; used in research and early clinical/translational settings (e.g., academic genomics cores) as of this writing. |

## 4. Instrument-level comparison

| Configuration | Launch | Throughput per wafer | Cost (reagent) | Annual capacity (vendor-claimed) | Notes |
|---|---|---|---|---|---|
| UG 100 (original chemistry) | 2024-02-06 | 6–8 billion reads/wafer (publicly reported, Ultima Genomics/BusinessWire) | "$100 genome" raw sequencing-cost claim at launch (publicly reported, vendor) | Not separately disclosed for this chemistry generation | Two physical instrument units per system, reported combined weight >2 tons (University of Minnesota Genomics Center, independent, 2024) |
| UG 100 with Solaris chemistry update | 2025-02 | 10–12 billion reads/wafer (+50% vs. original, publicly reported, Ultima Genomics/Pharma's Almanac) | $0.24 per million reads / $0.80 per Gb (publicly reported, vendor pricing as of 2025-02); "$80 genomes" marketing claim (Ultima Genomics WGS focus page, 2026) | ">30,000 whole genomes per year" (publicly reported, vendor) | 20% lower sequencing cost vs. pre-Solaris chemistry (publicly reported, vendor) |

**Reconciling the weekly-throughput and annual-capacity figures (calculated from reported data):** an independent customer report (University of Minnesota Genomics Center, 2024) states "approximately 16 human genomes per wafer" in single-wafer mode and "up to 20 wafers weekly" for ~320 genomes/week, which annualizes to ≈16,640 genomes/year — well under the vendor's own ">30,000 genomes/year" claim. This discrepancy is most plausibly explained by chemistry-generation timing: the UMN figure appears to predate the 2025-02 Solaris throughput increase. Applying the post-Solaris 10–12B reads/wafer figure and assuming ~2×150 bp paired reads (≈300 bases/read-pair) and a 30× human genome ≈ 90–100 Gb, one wafer yields roughly 10×10⁹ × 300 bp ≈ 3 Tb, or **≈30 genomes/wafer** — which, at 20 wafers/week × 52 weeks, gives ≈31,200 genomes/year, closely matching the vendor's ">30,000/year" claim. **This reconciliation is a calculated estimate built on a stated read-length assumption not independently confirmed for the UG 100 in this pass — confidence medium.**

**Instrument list/capital price: unavailable.** No primary source disclosing UG 100 purchase price was located in this research pass (multiple targeted searches attempted); third-party funding/valuation aggregator sites surfaced but were not treated as reliable primary sources for instrument pricing and are excluded per the source-priority order in this vault's methodology.

**Cost-per-30×-genome (calculated from reported data):** at $0.80/Gb reagent pricing and ≈90–100 Gb for a 30× human genome, reagent-only cost ≈ $72–80, consistent with the vendor's own "$80 genomes" marketing claim — **this appears to be a reagent-cost-only figure, not a fully loaded cost including instrument depreciation, labor, or library prep**, the same caveat that applies to Illumina's and MGI's comparable headline genome-cost claims elsewhere in this folder.

## 5. Application specialization and physical basis

- **Cost-sensitive, high-volume WGS**: primary designed use case — the platform's entire value proposition (open wafer, spin-coating, emulsion clonal amplification, "mostly natural" nucleotides) is explicitly engineered to minimize reagent cost per Gb, making it best-suited to population-scale or high-sample-count WGS programs where per-genome cost dominates purchasing decisions.
- **Low-input / degraded-sample applications (e.g., cfDNA, MRD)**: ppmSeq's DNA-damage-error suppression is specifically relevant here — the vendor reports "30× WGS from 2 ng of cfDNA" using ppmSeq (Ultima Genomics product documentation, 2026, publicly reported vendor claim, not independently corroborated in this pass), consistent with a chemistry designed to distinguish true low-frequency variants from damage-induced artifacts in low-input samples.
- **No long-read, structural-variant, phasing, or repetitive-region capability**: like Illumina, MGI, and Element, this is a short-read amplification-based platform; it does not address the applications that require single-molecule long reads (see [[Sequencing by Synthesis (SBS)]], [[Research/Jack Research/Competitors/MGI Tech/DNBSEQ (cPAS)]], and the long-read platforms in the PacBio and Oxford Nanopore folders for contrast).
- **Homopolymer accuracy**: the ML-based homopolymer-resolution step is a direct physical response to the same class of error (run-length ambiguity in a flow-based, non-fully-terminated chemistry) that causes indel errors on Ion Torrent — Ultima's use of a dedicated ML correction step is evidence this is a real, physically-motivated failure mode for their chemistry as well, though no independent (non-vendor) quantification of Ultima's residual homopolymer error rate was found in this pass (**unavailable**).
- **Independent validation status**: the one independent (non-vendor) data point found in this pass is a qualitative equivalence claim — University of Minnesota Genomics Center reported "equivalent results on the UG 100 as was observed on our legacy Illumina NovaSeq sequencers" for comparative RNA-seq experiments (2024, independent, but qualitative rather than quantitative — confidence medium for the claim's existence, low for treating it as a rigorous accuracy benchmark).

## 6. Standardized scalability analysis

**Horizontal scaling**: the wafer itself is the horizontal-scaling unit (analogous to a flow cell on other platforms) — Ultima's roadmap lever is wafer throughput (6–8B → 10–12B reads/wafer with the Solaris update) and wafers processed per week per instrument (up to 20/week per the UMN report), not a larger number of discrete smaller flow cells. Running more wafers (via the claimed 24/7 continuous-operation architecture) or more instruments is the platform's horizontal path to more capacity.

- Total physical/active sensing-site counts on the wafer: **unavailable** — Ultima has not published a site-density or per-wafer feature count in the sources found in this pass, unlike MGI's disclosed DNB pitch; only aggregate reads/wafer figures are available.
- Instruments needed for 1 Tb/day: at ≈3 Tb/wafer (post-Solaris, per the calculation above) and up to 20 wafers/week (≈2.9 wafers/day) per instrument, one instrument's throughput is roughly 2.9 × 3 Tb ≈ **8.6 Tb/day at full utilization** — well over 1 Tb/day from a single instrument. **Calculated from reported data, confidence medium**, since the underlying wafers/week figure is drawn from an independent customer report that may not reflect Ultima's most current throughput ceiling.
- Instruments to reach 100 / 1,000 / 10,000 genomes/year: using the vendor's own ">30,000 genomes/year" per-system claim, **a single UG 100 system comfortably covers all three tiers** (100, 1,000, and 10,000 genomes/year) at vendor-claimed throughput — calculated from reported data, confidence medium (vendor-claimed input, not independently reproduced).

**Vertical scaling**: the Solaris chemistry update (+50% reads/wafer, −20% cost) is a clear example of vertical scaling — same wafer format and instrument, more usable signal extracted per wafer through improved chemistry, not more physical hardware. This suggests Ultima's near-term roadmap is likely to continue prioritizing chemistry/software (basecalling model) improvements over adding new hardware tiers, consistent with the pattern of a single-instrument product line (unlike Illumina's or MGI's multi-tier hardware families).

- Bases/active site/second: **unavailable** — no per-site sensing count is published, so this cannot be calculated (see above).
- Primary physical bottleneck: based on what the ppmSeq and ML-homopolymer-correction features are explicitly designed to solve, the platform's binding constraints appear to be (a) DNA-damage-induced substitution artifacts and (b) homopolymer run-length ambiguity inherent to flow-ordered, largely-unterminated chemistry — the same general error class that limits Ion Torrent, addressed here computationally rather than by returning to fully-terminated (and more expensive) nucleotide chemistry. **Confidence: medium**, inferred from what the product's own error-correction features are built to address rather than a direct vendor statement naming the bottleneck.

## 7. Competitive positioning

The UG 100 competes directly with Illumina's NovaSeq X/X Plus and MGI's DNBSEQ-T7/T7+ for the same customer set — large-scale genome-center and population-genomics programs where cost per Gb and cost per genome are the dominant purchasing criteria, not read length or turnaround time (all three are short-read, similar-read-length platforms). Its point of differentiation within that competitive set is the lowest publicly-quoted reagent cost per Gb found across the platforms covered in this comparison folder ($0.80/Gb, vs. MGI's ~$1.0–1.5/Gb range and Illumina's higher list pricing — see [[Research/Jack Research/Competitors/MGI Tech/DNBSEQ (cPAS)]] and [[Sequencing by Synthesis (SBS)]] for those figures), at the cost of being the newest, least clinically validated, and least independently benchmarked platform in the group. The principal switching barrier working against Ultima adoption is the same one working against MGI in the US market to a lesser degree: an unproven long-term clinical/regulatory track record and thinner independent literature, versus Illumina's deep base of validated assays and software ecosystem (BaseSpace, DRAGEN) that many labs are contractually or operationally reliant on. Full cross-company competitive-landscape tables are consolidated in [[Instrument & Market Comparison]].

## 8. Sources

- Ultima Genomics, UG 100 Sequencing Platform product page, ultimagenomics.com/products/ug-100-sequencing-platform/ — vendor-published specifications, accessed 2026-07-19.
- Ultima Genomics, Whole Genome Sequencing focus-area page, ultimagenomics.com/focus-areas/whole-genome-sequencing/ — "$80 genomes" claim, accessed 2026-07-19.
- BusinessWire, "Ultima Announces UG 100™ and Reveals Disruptive Cost and Accuracy," 2024-02-06 — vendor press release, publicly reported.
- Pharma's Almanac, "Ultima Genomics Increases Output by Over 50%" — Solaris chemistry update coverage, 2025-02, publicly reported/independent trade press.
- University of Minnesota Genomics Center, "Ultima UG 100 Arrives," genomics.umn.edu/news/ultima-ug-100-arrives — independent customer account, 2024, publicly reported.
- Bio-IT World, coverage of UG 100 launch (spin-coating/wafer architecture description), 2024 — independent trade press, publicly reported (full article could not be directly retrieved in this pass; description drawn from an indexed excerpt).
- Almogy, G., Pratt, M., Oberstrass, F. et al., "Cost-efficient whole genome-sequencing using novel mostly natural sequencing-by-synthesis chemistry and open fluidics platform," bioRxiv preprint, posted 2022-05-29 (doi: 10.1101/2022.05.29.493900) — Ultima's founding technical preprint; **not confirmed as peer-reviewed/published in this pass**, and full text could not be directly retrieved (bioRxiv blocked automated access) — cited for its existence and title only; mechanistic claims attributed to it above are flagged accordingly.
- Genohub, Ultima Genomics UG 100 listing, genohub.com — third-party sequencing-services marketplace, used only for corroborating launch-year framing, low weight.

## 9. Confidence summary

| Claim | Confidence |
|---|---|
| Open spinning-wafer + spin-coating architecture | High — corroborated across vendor documentation and independent trade press/customer accounts |
| Emulsion-based clonal amplification prior to wafer loading | Medium — stated in vendor documentation, not independently corroborated by a methods paper in this pass |
| Exact single-base-flow termination/synchronization mechanism | Low — founding technical preprint not directly retrievable in this pass; described only at a high level by secondary sources |
| Reads/wafer and reagent cost figures (both chemistry generations) | Medium-high — consistent across vendor and independent trade-press sources |
| ">30,000 genomes/year" and "16 genomes/wafer" reconciliation | Medium — internally consistent once a chemistry-generation timing difference and a stated read-length assumption are applied; not independently verified |
| Instrument capital/list price | Unavailable — no primary source located |
| ppmSeq accuracy/error-suppression numeric claims | Low-medium — vendor-reported, not independently reproduced in this pass |
| Regulatory/clinical validation status | Unavailable/not found — consistent with a young, 2024-launch platform |
