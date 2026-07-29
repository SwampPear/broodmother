# Sanger (Capillary Electrophoresis) Sequencing — Applied Biosystems (Thermo Fisher)

Status: **currently selling** (Applied Biosystems SeqStudio Genetic Analyzer). Researched/compiled 2026-07-18.

This is a short companion note to [[Ion Semiconductor Sequencing]] in the same folder. Sanger/capillary sequencing is included because it is a **genuinely different hair-to-genome pipeline** — no clonal amplification array, no massively parallel sensing sites, no NGS-style basecalling — not because it competes with any NGS platform on throughput. It is a low-throughput, high-per-read-cost, extremely mature technology still sold and used for confirmatory sequencing, plasmid/clone verification, and single-locus clinical assays.

## Physical pipeline: hair strand → prepared library → optical (capillary) signal

1. Extract and purify genomic DNA from the hair root bulb, as in the NGS platforms (see [[Ion Semiconductor Sequencing]] Section 2 for the shared extraction steps).
2. PCR-amplify the single target region of interest using locus-specific primers (Sanger sequencing targets one region at a time — there is no whole-genome library prep step, since Sanger is not used for unbiased whole-genome coverage).
3. The **Sanger chain-termination reaction**: a sequencing PCR reaction using one primer, normal dNTPs, and a small proportion of fluorescently labeled **dideoxynucleotides (ddNTPs)** — one of four dye colors per base type. Each time a ddNTP is incorporated instead of a normal dNTP, chain extension terminates irreversibly at that point (a ddNTP lacks the 3′-OH needed for the next bond). This produces a population of many different-length, fluorescently end-labeled fragments, each terminating at a different position along the template, in a single tube.
4. The reaction products are cleaned up (removing unincorporated dye-labeled ddNTPs and salts) and loaded onto the instrument.
5. **Capillary electrophoresis**: the labeled fragments are electrokinetically injected into a narrow, polymer-filled glass capillary and pulled through it by an applied voltage. Because the polymer matrix separates DNA fragments by size (shorter fragments migrate faster), the many different-length terminated fragments exit the capillary in strict size order — one base longer at a time.
6. A laser at the capillary's detection window excites each fragment's dye as it passes; a camera/detector records the color (and therefore the terminal base) of each fragment in the order they pass — directly reading out the sequence, one base per detected peak, from a single continuous electropherogram trace.
7. Software calls bases from the trace peaks and assigns a quality score per base (Phred-style, the original context in which Q-scores were defined — see [[Terminology & Metrics]]).

This is fundamentally different from every NGS platform in this vault: there is no massively parallel array of sensing sites, no clonal bead/cluster/nanoball, and no cycle-by-cycle flow-and-image or flow-and-measure process — one capillary reads one template molecule population (from one PCR product) per injection, producing one continuous read (typically 700–1,000 bases) directly from the electropherogram.

## Platform profile

| Attribute | Detail |
|---|---|
| Chemistry | Chain-termination (dideoxy) sequencing — Sanger, 1977 method, still the basis of the modern automated version. |
| Detection | Optical — laser-excited fluorescence of dye-labeled chain-terminating fragments, detected as they migrate past a fixed point in a capillary. |
| Amplification | Locus-specific PCR of the region of interest, upstream of the sequencing reaction itself; no clonal array amplification. |
| Architecture | Multi-capillary array (SeqStudio: 4 capillaries) — each capillary is one independent lane, not a parallel sensing array of millions of sites. |
| Typical applications | Sanger confirmation of NGS-detected variants, plasmid/clone/CRISPR-edit verification, cell-line authentication, single-gene clinical assays, forensic/paternity STR fragment analysis (the same instrument also does fragment-length analysis, a related but distinct application from sequencing). |
| Major advantages | Very high per-base accuracy on a well-designed assay (mature, decades-refined chemistry); simple, fast for single-locus questions; low capital cost; remains the gold-standard confirmatory method often required by clinical labs and journals to validate NGS-called variants. |
| Major limitations | Throughput is the defining limitation — one capillary produces one read per injection; totally impractical for whole-genome or even whole-exome work; cost per base is orders of magnitude higher than any NGS platform in this vault. |
| Regulatory/clinical positioning | Long-standing clinical and regulatory acceptance as a confirmatory/orthogonal method; often specifically required (by lab accreditation bodies or clinical policy) to confirm NGS findings before they are reported as actionable — a durable, if narrow, niche that is not threatened by NGS platforms getting faster or cheaper, since its role is orthogonal validation, not primary discovery. |

## Instrument-level summary

| Instrument | Capillaries | Read length | Runs/day (approx.) | List price | Consumable cost |
|---|---|---|---|---|---|
| SeqStudio Genetic Analyzer | 4 | ~700–1,000 bases/read | Multiple short runs/day (minutes-to-~2h per run depending on run type) | **$57,000** instrument + ~$3,000 one-time starter package *(publicly reported, vendor/reseller pricing, medium confidence)* | SeqStudio Cartridge: **$1,600 per cartridge, rated for 125 injections/500 samples ≈ $3.20/sample** *(publicly reported, vendor pricing, medium-high confidence)*; 4-month cartridge shelf life once installed |

*(Sources: Thermo Fisher/Applied Biosystems SeqStudio product pages; GenomeWeb, "Thermo Fisher's New Genetic Analyzer Provides Makeover for Sanger Sequencing, Fragment Analysis"; reseller/distributor pricing pages.)*

Cost-per-Gb and cost-per-genome metrics are not meaningful for this platform (see [[Terminology & Metrics]] — Sanger is used for single-locus, not genome-scale, sequencing) and are therefore **labeled not applicable** rather than calculated.

## Competitive positioning

SeqStudio does not compete with any NGS platform in this vault for the same budget line or workflow — it is typically purchased *alongside* an NGS platform (Illumina, MGI, Ion Torrent, or others) as an orthogonal confirmatory tool, not as an alternative to one. Its only real "competitors" are other capillary-electrophoresis Sanger instruments from other vendors (not otherwise covered in this vault, which focuses on massively parallel/single-molecule NGS platforms per the user's original scope).

## Sources

- Thermo Fisher Scientific / Applied Biosystems, SeqStudio Genetic Analyzer product pages, thermofisher.com — vendor-published specifications and pricing.
- GenomeWeb, "Thermo Fisher's New Genetic Analyzer Provides Makeover for Sanger Sequencing, Fragment Analysis" — reputable industry press.
- Sanger, F., Nicklen, S., Coulson, A.R., "DNA sequencing with chain-terminating inhibitors," *PNAS* 74(12):5463–5467 (1977) — original peer-reviewed method description.

## Confidence summary

| Claim | Confidence |
|---|---|
| Chain-termination/capillary-electrophoresis mechanism | High — well-established, decades-old, uncontested method |
| SeqStudio instrument specs (capillaries, read length) | High — vendor spec sheets |
| SeqStudio pricing (instrument, cartridge) | Medium — vendor/reseller pricing pages, not an independently audited price list |
