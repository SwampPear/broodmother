# GenapSys / Genapsys, Inc. — eNGS electronic (non-optical) sequencing

**Status: DISCONTINUED.** GenapSys, Inc. (Redwood City, CA) filed a voluntary Chapter 11 bankruptcy petition on **2022-07-11** in the U.S. Bankruptcy Court for the District of Delaware, after a liquidity collapse compounded by internal leadership disputes and litigation. [GenomeWeb, "Sequencing Firm Genapsys, Mired in Lawsuits, Explores Bankruptcy"](https://www.genomeweb.com/business-news/sequencing-firm-genapsys-mired-lawsuits-explores-bankruptcy) (accessed 2026-07-17). Its assets were sold via bankruptcy auction to **Sequencing Health**, a newly formed entity tied to Farallon Capital Management and Soleus Capital (both prior GenapSys Series D investors), for up to $10M cash plus assumption of ~$32M debt owed to Oxford Finance; the reorganization plan was confirmed 2023-01-06 and became effective 2023-01-13. [Law360, "GenapSys Ch. 11 Plan Confirmed After $42M Asset Sale"](https://www.law360.com/articles/1562817/genapsys-ch-11-plan-confirmed-after-42m-asset-sale) (accessed 2026-07-17). Unverified secondary sources (Tracxn company profile) suggest a possible successor product ("GENIUS 110") under GenapSys/Sequencing Health branding, but no primary-source confirmation of an active, currently-shipping instrument was found — **treat any post-2023 GenapSys product as unconfirmed/low confidence.**

## Why it's included despite being defunct

The user's spec explicitly calls for discontinued platforms to be documented, not omitted, and GenapSys is scientifically relevant to this vault specifically because — like Proprium's own ECSEQ-1 — it was a **non-optical, purely electrical detection** approach to sequencing-by-synthesis, using CMOS semiconductor sensors rather than a camera. It is a directly relevant historical precedent/cautionary case for any company building an electrical-readout sequencer.

## Platform profile (as it existed pre-bankruptcy, 2020–2022)

- **Sequencing chemistry:** Conventional sequencing-by-synthesis (unlabeled, non-terminator nucleotides added in flows, similar in spirit to Ion Torrent) — but detection is electrical rather than pH/ISFET-based.
- **Detection method:** Proprietary CMOS sensor array ("eNGS" — the company described it as steady-state electrical detection of base incorporation events). Each sensor consists of a pair of closely spaced electrodes contacting one bead; incorporation events are read out electrically rather than optically or via simple pH change, distinguishing it from both Illumina (optical) and Ion Torrent (pH/ISFET). *(Publicly reported, low technical detail available — GenapSys never published a full peer-reviewed mechanism paper describing the exact electrical signal transduced; likely a capacitance or impedance-based readout by analogy to the semiconductor literature, but the precise transduction mechanism is **estimated**, not confirmed.)* [Nanalyze, "GenapSys Finally Commercializes Desktop DNA Sequencer"](https://www.nanalyze.com/2020/11/genapsys-desktop-dna-sequencer/); [GenomeWeb, "GenapSys Targeting Smaller Labs With New Low-Cost Sequencer"](https://www.genomeweb.com/sequencing/genapsys-targeting-smaller-labs-new-low-cost-sequencer) (both accessed 2026-07-17).
- **Amplification method:** Clonal bead-based amplification — each CMOS sensor is designed to capture one clonally amplified bead. The exact amplification chemistry (emulsion PCR analogous to Ion Torrent's Ion Sphere Particles, vs. an isothermal on-bead method) was not confirmed in public sources — **estimated** to be emulsion/bead-based clonal amplification by architectural analogy to Ion Torrent, not independently verified.
- **Chip architecture:** The commercial G3 chip carried **16 million sensors** and produced 1.2–2.0 Gb per run at average read length >150 bp. A next-generation ~144-million-sensor chip was reported in development/roadmap discussions but not confirmed as commercially shipped before the bankruptcy. [GenomeWeb](https://www.genomeweb.com/sequencing/genapsys-targeting-smaller-labs-new-low-cost-sequencer) (accessed 2026-07-17).
- **Instrument price:** ~**$10,000** at 2020 launch — explicitly positioned as the lowest-capital-cost sequencer on the market at the time, targeting smaller labs unable to justify an Illumina/Ion Torrent capital purchase. [Nanalyze](https://www.nanalyze.com/2020/11/genapsys-desktop-dna-sequencer/) (accessed 2026-07-17).
- **Accuracy:** >80% of bases at Q30 or better, average read length >150 bp — modest relative to contemporary Illumina/Ion Torrent benchtop accuracy, consistent with a first-generation chemistry. *(Publicly reported)*
- **Regulatory/clinical positioning:** Research-use-only; no FDA clearance found. Never achieved wide field deployment — GenomeWeb explicitly notes instruments were "not widely available" despite the 2020 commercial launch. [GenomeWeb](https://www.genomeweb.com/sequencing/genapsys-targeting-smaller-labs-new-low-cost-sequencer) (accessed 2026-07-17).

## Hair strand → prepared library → electrical signal pipeline (reconstructed; some steps estimated by analogy to disclosed bead-based electronic platforms since GenapSys did not publish a full protocol)

1. Extract and purify genomic DNA from the hair root.
2. Fragment genomic DNA and ligate adapters (standard NGS library prep — GenapSys marketed compatibility with library-prep workflows rather than requiring a fully proprietary kit).
3. PCR-amplify and clean up the adapter-ligated library; quantify.
4. Combine the library with sensor-compatible beads under conditions favoring one template molecule per bead. *(Estimated step — exact emulsion/isothermal chemistry not publicly disclosed.)*
5. Clonally amplify each bead-bound template so every bead carries many identical copies of one fragment (analogous in purpose, though not necessarily in exact chemistry, to Ion Torrent's Ion Sphere Particle emulsion PCR — see [[Ion Semiconductor Sequencing]]).
6. Recover and enrich beads carrying successful clonal amplification; discard empty/under- or over-loaded beads.
7. Load the bead suspension onto the CMOS sensor chip; each of the chip's ~16 million electrode-pair sensors is sized to seat approximately one bead.
8. Flow unlabeled nucleotides sequentially (or in a defined order) across the loaded chip.
9. At each sensor where the bead's clonal strands incorporate the flowed base, the local electrical environment at the electrode pair changes; the CMOS circuitry under each sensor converts this into a steady-state electrical readout — no camera, no fluorescence, no wash-clexave-dye chemistry step.
10. Wash, flow the next base, repeat for the length of the run.
11. Onboard/downstream software converts the per-sensor electrical trace into base calls, filters polyclonal/empty sensors, trims adapters, and aligns reads to a reference genome.

## Instrument-level summary (last commercial configuration, ~2020–2022)

| Instrument | Chip | Sensors | Yield/run | Read length | Q30 | List price | Status |
|---|---|---|---|---|---|---|---|
| GenapSys Sequencer (desktop) | G3 | 16,000,000 | 1.2–2.0 Gb | >150 bp average | >80% | ~$10,000 (instrument) | Discontinued 2022-07-11 |

No independently verified figures exist for run time, sample-to-answer time, per-run consumable cost, cost per Gb, or annual throughput — these are **unavailable** in accessible public sources; GenapSys ceased operating before third-party benchmarking studies of the kind that exist for Illumina/Ion Torrent/ONT were published.

## Why it failed (relevant lesson for electrical-detection sequencing generally)

Public reporting attributes the collapse to a combination of: (1) a cash/liquidity crisis following failed pre-bankruptcy financing and sale efforts, (2) an internal leadership power struggle between the founding CEO and his successor, and (3) mounting litigation pressure. [GenomeWeb](https://www.genomeweb.com/business-news/sequencing-firm-genapsys-mired-lawsuits-explores-bankruptcy) (accessed 2026-07-17). There is no public evidence that the core electrical-detection chemistry itself was technically disqualifying — the failure mode reported is corporate/financial/legal, not a disclosed chemistry or accuracy ceiling. This is a meaningfully different failure mode than, e.g., a platform being out-competed on cost-per-genome or accuracy, and is worth distinguishing explicitly (**estimated interpretation** — no source directly states "the chemistry was fine"; this is inferred from the absence of any technical-failure narrative in the reporting reviewed).

## Competitive positioning (historical)

At launch, GenapSys competed for the same "cheapest possible entry-level benchtop sequencer" customer as Illumina's iSeq 100 and Ion Torrent's smaller GeneStudio/Ion PGM-class instruments — small academic labs, teaching labs, and low-throughput clinical microbiology use cases valuing capital cost over yield or accuracy. It did not compete in the high-throughput production-genomics segment (Illumina NovaSeq / MGI T7 territory) at any point in its commercial life.

## Confidence summary

| Claim | Label | Confidence |
|---|---|---|
| Bankruptcy filing date, sale to Sequencing Health, plan confirmation dates | Publicly reported (court filings via Law360/GenomeWeb) | High |
| $10,000 instrument price, G3 chip = 16M sensors, 1.2–2.0 Gb/run, >150bp, >80% Q30 | Publicly reported (trade press) | Medium-High |
| Exact electrical transduction mechanism (capacitance/impedance/other) | Estimated | Low |
| Exact bead-amplification chemistry | Estimated | Low |
| Post-2023 "GENIUS 110" successor product | Unverified | Low |
| Run time, consumable cost, cost/Gb, annual throughput | Unavailable | — |
