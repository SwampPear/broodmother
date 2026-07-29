# Application Markets by Segment

Status: reference analysis, researched and written 2026-07-19. This is a **different market lens** than [[Instrument & Market Comparison]] §10, which segments by technology/throughput tier (short-read vs. long-read, benchtop vs. high-throughput). This note segments by **end-use application vertical** (oncology, reproductive health, forensics, etc.) — a cut that draws on largely different market-research sources than the company technology notes, since application-vertical sizing comes from market-research firms tracking clinical/commercial testing markets, not sequencing-instrument spec sheets.

## Read this before the table: a scope problem in the source data

While researching this, a genuine inconsistency turned up that's worth stating plainly rather than smoothing over: the Fortune Business Insights NIPT market figure (**$9.92B in 2026**) is *larger* than the BusinessResearchInsights total "NGS market" figure for the same year (**$7.35B in 2026**) — see rows below. Since NIPT is supposed to be a subset of NGS-based testing, these two numbers cannot both describe the same underlying market under a consistent definition.

The most likely explanation, based on how these report categories are typically defined: the "NGS market" figures track **instrument and reagent sales** (what a sequencer manufacturer or its distributor books as revenue), while the NIPT, forensic-genomics, and agrigenomics figures track **the full clinical/commercial testing market** — lab service fees, sample logistics, interpretation software, physician/genetic-counseling costs, and in several cases *non-NGS* technologies (qPCR-based NIPT, PCR/CE-based forensic STR typing) bundled into the same "market" figure alongside NGS-based methods. That means these application-vertical figures are **not a clean subdivision of the NGS instrument market** — they're separately-scoped markets that happen to consume NGS as one input among several.

**Practical consequence:** I have not computed a "% of total NGS market" column by dividing these figures, because doing so would produce misleading results (e.g., NIPT alone would compute to >100% of the "total" market). Instead, each row below reports its own market size in its own report's terms, with the technology/company breakdown that report actually gives. The one genuinely apples-to-apples percentage breakdown found — of the **core NGS instrument/reagent market specifically** — is given as its own table in §2.

## 1. Application vertical market sizes (each in its own report's scope — not directly summable)

| Application vertical | Market size & year | Forecast | CAGR | Leading company/platform | Sequencing type required, and why |
|---|---|---|---|---|---|
| Total "NGS market" (instruments + reagents, narrow scope) | $7.35B (2026) | $15.16B by 2035 | 8.0% (2026–2035) | Illumina ~52% revenue share; Thermo Fisher ~17% | — (this is the baseline instrument/reagent market, not an application) |
| Non-invasive prenatal testing (NIPT) / reproductive health | $9.92B (2026); $8.42B (2025) | $36.79B by 2034 | 17.8% (2026–2034) | Illumina, Natera named as leaders; no clean % share disclosed in this source | Shallow low-pass short-read WGS of maternal cell-free DNA — needs extreme per-sample cost efficiency at very high testing volume, not depth; a genuinely high-throughput-short-read-shaped problem |
| Oncology / clinical oncology NGS | $744.4M (2025) | $3.13B by 2035 | 17.3% (2025–2035) | Illumina and Thermo Fisher named as leaders (AI-assisted variant calling emphasized); no % share disclosed | Deep, targeted short-read panels on hotspot regions — needs FDA-cleared assay validation and fast turnaround, not whole-genome breadth |
| Forensic genomics (all technologies) | $8.43B (2025) | $22.79B by 2035 | 10.46% (2025–2035) | Illumina named as leading NGS vendor to forensic labs; no % share disclosed | Within this, NGS is projected to reach **$7.5B by 2035** vs. **PCR/capillary-electrophoresis at $6.0B by 2035** — the two technologies split this market roughly evenly by 2035, reflecting that STR/CE-based profiling (older, court-precedented) still competes directly with newer NGS-based forensic panels (e.g. Illumina ForenSeq) |
| Agricultural genomics (agrigenomics) | $4.82B (2025); $5.28B (2026) | $11.72B by 2035 | 9.29% (2026–2035) | Illumina HiSeq family: 36% of sequencing-technology share within this market; PacBio noted as fastest-growing | Cost-driven WGS/genotyping across large breeding-program sample counts; crops are 65% of this market's application split, livestock a smaller but growing share |
| Single-cell sequencing | $2.82B (2025) | $11.09B by 2035 | 14.67% (2026–2035) | 10x Genomics named as leading platform vendor (runs on Illumina sequencers) | Specialized short-read library chemistry (droplet/well-based cell barcoding) sequenced on standard short-read instruments — the innovation is in sample prep, not the sequencing chemistry itself |
| Direct-to-consumer genetic testing | $2.17B (2025) | $11.02B by 2035 | 17.64% (2026–2035) | 23andMe, Ancestry, MyHeritage named — **note: these are testing-service brands, not sequencing-platform manufacturers; Illumina is not named in this source at all** | This source states WGS "dominated" this market in 2025 — **flagged as surprising and worth independent verification**, since DTC ancestry/health testing has historically run on low-cost SNP genotyping arrays (a different technology from sequencing), not WGS; possible the report's market definition includes a broader "consumer genomics" category, or reflects genuinely recent movement toward WGS-based DTC offerings — could not resolve which within this research pass |
| Pathogen / infectious-disease genomic surveillance | $3.8B (2025) | $9.7B by 2034 | 14.2% (2026–2034) | Illumina: 45–50% of installed sequencing capacity, 38–42% of market revenue; Thermo Fisher 18–22%; Oxford Nanopore 8–12%; Roche 8–12%; BGI 5–8% | Mixed: high-volume routine surveillance runs on short-read (Illumina's installed-capacity dominance reflects this); outbreak/field response increasingly uses ONT for portability and real-time streaming — this is the one vertical in this table with a genuinely disclosed multi-company percentage breakdown |

All figures above: **publicly reported** (market-research firm reports), each individually cited below with publication date. **Confidence: medium** for the market-size/CAGR figures themselves (single-source per vertical, not independently cross-checked against a second firm in this pass, and market-research firms are known to vary significantly in methodology — see [[Instrument & Market Comparison]] for the same caveat applied to Illumina's overall share estimate). **Confidence: low** specifically for the DTC "WGS dominated" claim, flagged above as inconsistent with known industry practice.

**Left unavailable** (searched, but a clean standalone market-size figure wasn't found within this research pass — not fabricated): academic/basic research and pharma R&D as standalone dollar markets (only available as a percentage *within* the core NGS market, see §2 below); environmental/microbiome & metagenomics; synthetic biology / gene-therapy & biomanufacturing QC; newborn screening. These would need a follow-up research pass if wanted.

## 2. The one clean apples-to-apples breakdown: core NGS instrument/reagent market by end-user type

Source: BusinessResearchInsights, *Next Generation Sequencing (NGS) Market*, published 2026-06-29 — this is the only source found that breaks the *same* underlying market (instruments + reagents, $7.35B in 2026) into percentages that sum coherently.

| End-user segment | % of core NGS market (2025/2026) |
|---|---|
| Academic & government research | 36% |
| Pharmaceutical companies | 24% |
| Hospitals & clinics | 22% |
| Biotechnology companies | 18% |

The same source separately states oncology accounts for "nearly 32%" of total market *usage* and hereditary-disease testing "crossed 24%" — these are usage-pattern figures that **overlap with, rather than add cleanly to**, the end-user breakdown above (an oncology test can be run by a hospital, a biotech, or an academic center), so treat the two breakdowns as two different cuts of the same market, not additively.

Regional split (2025, same source): North America 45%, Europe 28%, Asia-Pacific 22%, Middle East & Africa 5%. Technology split: targeted sequencing 48%, whole-exome 29%, whole-genome 23%.

## 3. Cross-check: a conflicting total-market figure

A second source found in this pass (market.us, title only: *"Next Generation Sequencing Market Growth CAGR Of 21.5%"*) implies a markedly higher growth rate than BusinessResearchInsights' 8.0% CAGR for what appears to be the same overall market — the full page content wasn't fetched in this pass (time-boxed), so I can't state market.us's dollar figures or reconcile the CAGR discrepancy. Grand View Research's NGS market report (a first-tier source per this vault's sourcing priority) returned an HTTP 403 (blocked) on direct fetch and could not be retrieved in this pass. **This CAGR discrepancy (8.0% vs. 21.5%) is left unresolved and flagged low confidence** — market-research CAGR figures are known to vary by 2–3x across firms depending on base-year, market-definition, and forecast-methodology choices; neither figure should be treated as authoritative without a third independent source, which this pass did not have search budget remaining to pursue.

## Sources

- Fortune Business Insights, *Non-Invasive Prenatal Testing (NIPT) Market*, published 2026-06-29, fortunebusinessinsights.com/industry-reports/non-invasive-prenatal-testing-market-100998. Publicly reported, medium confidence.
- Future Market Insights, *Clinical Oncology Next-Generation Sequencing Market*, published 2025-08-02, futuremarketinsights.com/reports/clinical-oncology-next-generation-sequencing-market. Publicly reported, medium confidence.
- BusinessResearchInsights, *Next Generation Sequencing (NGS) Market*, published 2026-06-29, businessresearchinsights.com/market-reports/next-generation-sequencing-ngs-market-121069. Publicly reported, medium confidence.
- Precedence Research, *Agrigenomics Market*, published 2026-01-08, precedenceresearch.com/agrigenomics-market. Publicly reported, medium confidence.
- Market Research Future, *Forensic Genomic Market*, published 2026-04-06, marketresearchfuture.com/reports/forensic-genomic-market-29304. Publicly reported, medium confidence.
- Precedence Research, *Single Cell Sequencing Market*, published 2026-06-10, precedenceresearch.com/single-cell-sequencing-market. Publicly reported, medium confidence.
- Precedence Research, *Direct-to-Consumer Genetic Testing Market*, published 2026-07-08, precedenceresearch.com/direct-to-consumer-genetic-testing-market. Publicly reported, **low confidence on the WGS-dominance claim specifically** (flagged above as inconsistent with known industry technology mix).
- MarketIntelo, *Genomic Surveillance Market*, last updated 2026-06-11, marketintelo.com/report/genomic-surveillance-market. Publicly reported, medium confidence (this is the one source in this note with a multi-company disclosed percentage breakdown, which somewhat increases confidence relative to the single-leader-named sources above).
- Grand View Research, *Next Generation Sequencing Market* — attempted, returned HTTP 403, not retrieved.
- market.us, *Next Generation Sequencing Market* — title only retrieved ("CAGR of 21.5%"), full figures not fetched in this pass; noted as an unresolved conflict with the BusinessResearchInsights CAGR figure above.

All web research in this pass used a DuckDuckGo-HTML-results + WebFetch workaround rather than the WebSearch tool, which was exhausted for this session (200/200 calls used) prior to this task starting.
