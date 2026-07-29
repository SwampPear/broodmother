# Ultima Genomics — Patents on Core Sequencing Biology

Status: reference analysis, researched and written 2026-07-19. Confidence and source labels follow the vault convention: *(publicly reported / independently measured / calculated from reported data / estimated / unavailable)*.

**Disclaimer:** This note is informational patent-landscape research for Proprium's internal awareness only. It is **not legal advice** and **not a freedom-to-operate opinion**. Patent status, claim scope, and expiration dates can change (maintenance-fee lapses, continuations, reexamination, litigation) and file histories were not reviewed. Any actual FTO or IP-strategy decision requires review by qualified patent counsel against current USPTO/PAIR records, not this note.

See [[Wafer-Scale Sequencing (UG 100)]] for the underlying technology/pipeline description these patents attach to, and [[Terminology & Metrics]] for shared vocabulary.

## Why coverage here is thinner than for Illumina/MGI/PacBio

Ultima is a young (2024 commercial launch), historically secretive company. Its patent estate is comparatively small and — notably — **a meaningful share of what was found is still pending or was abandoned**, not granted, which is itself informative: as of this research pass Ultima's strongest legal protection appears concentrated in two granted patents (below), with the foundational "wafer, not a flow cell" architecture claim still an unresolved pending application rather than an issued patent. This is a genuinely different posture than Illumina or MGI, whose core chemistry patents were granted years ago.

One positive research side-effect: patent claims, because they must legally enable the invention, contain more mechanistic detail than Ultima's marketing material. The single-frequency-detection patent family below directly resolves a mechanistic gap the [[Wafer-Scale Sequencing (UG 100)|main Ultima note]] flagged as low-confidence (§1, footnote on "mostly natural" nucleotide chemistry) — see the entry below.

## Patents mapped to pipeline steps

| Pipeline step (per [[Wafer-Scale Sequencing (UG 100)]]) | Patent family | Status |
|---|---|---|
| Open wafer / spin-coating substrate architecture (not a sealed flow cell) | WO2022072652A1 → US20230279487A1 | **Pending** (not yet granted) |
| Emulsion-based clonal amplification before wafer loading | US20220042072A1 → **US 12,319,959 B2** | **Granted, active** |
| "Mostly natural nucleotide" / single-frequency optical detection chemistry | WO2019161253A1 → **US 11,584,963 B2** | **Granted, active** |
| (superseded/abandoned early filing in the detection-chemistry family) | US20190352707A1 | Abandoned |
| Variant-calling from non-terminating-nucleotide sequencing data | US 12,482,536 (and related US 12,437,839) | Granted (bioinformatics-adjacent, not core wet-chemistry) |
| Next-generation nucleotide-analog/appended-label chemistry | US 2025/0059593 A1 | **Pending** |

## 1. Wafer-scale, non-flow-cell architecture

**WO2022072652A1** — "Methods, systems, and apparatus for high throughput sequencing" *(publicly reported, Google Patents, high confidence for bibliographic data)*
- Assignee: Ultima Genomics, Inc. Inventors: Gilad Almogy, Nathan Beckett, Mark Pratt, Anatoly A. Surdutovich, Nathan Caswell, Patrick D. Kinney.
- Type: PCT international application (PCT/US2021/052902) — not itself a grantable national right, a filing vehicle for national-phase applications.
- Priority date: 2020-09-30. International filing date: 2021-09-30. Publication: 2022-04-07. International-phase legal status: **ceased** (normal end-of-life for a PCT filing once national phase begins — not equivalent to abandonment of the underlying invention).
- **US national phase: US20230279487A1** (application US18/124,481), filed 2023-03-21, published 2023-09-07. **Legal status: pending** — not yet granted as of this research pass; no anticipated-expiration date is computable until/unless it grants (a utility patent's term normally runs 20 years from the earliest non-provisional US filing or PCT filing that established priority, i.e., **no earlier than 2041** if it grants on the current priority chain, before accounting for prosecution delay/PTA — *calculated, low confidence, since it is not yet granted*).
- What it claims/would protect: a sequencing system built around **planar, patterned substrates explicitly claimed as "not flow cells,"** with independently addressable locations, a substrate station holding multiple wafers for sequential automated loading, and continuous (24+ hour, minimal-intervention) operation with reagent/substrate/sample "hot-swapping." This is the claim language most directly protecting the open-wafer/spin-coating structural departure from sealed-cartridge platforms (Illumina, MGI, Element) described in the main note.
- Practical read: because this is still pending, Ultima does not yet hold an enforceable US patent right over the wafer architecture itself — competitors are not currently blocked by an issued claim here, though the application could still grant (with claims potentially narrowed during prosecution) at any point.

## 2. Emulsion-based clonal amplification

**US 12,319,959 B2** — "Methods for nucleic acid analysis" (from application US20220042072A1) *(publicly reported, Google Patents, high confidence)*
- Assignee: Ultima Genomics, Inc. Inventors: Gilad Almogy, Florian Oberstrass, Omer Barad, Chandan Shee.
- Type: US utility patent, granted.
- Priority date: 2019-02-11. Filing date (this application): 2021-08-05. Publication: 2022-02-10. **Granted: 2025-06-03.**
- Legal status: **Active.** Anticipated/adjusted expiration: **2040-02-10** *(publicly reported directly from Google Patents' expiration field, high confidence, subject to timely maintenance-fee payment — standard US utility-patent maintenance fees are due at 3.5/7.5/11.5 years post-grant; non-payment would lapse the patent early)*.
- What it protects: emulsion (partitioned water-in-oil droplet) clonal amplification methods using **multiple beads within a single partition** to exceed ordinary Poisson loading limits, bead-immobilized-primer attachment chemistry, paired-end generation via distinct primer sets for each strand, and reaction-rate control (attachment slower than amplification) to reduce noise/sample loss. This is the claim set most directly covering the "clonal amplification and wafer loading" step (§2C of the main note) — i.e., the mechanism Ultima uses instead of Illumina's on-substrate bridge PCR or MGI's rolling-circle DNA nanoballs.
- Practical read: this is Ultima's strongest currently-enforceable patent in this research pass — granted, active, 14+ years of remaining term as of 2026.

## 3. "Mostly natural nucleotide" single-frequency detection chemistry

**US 11,584,963 B2** — "Methods for sequencing with single frequency detection" (US national-phase descendant of WO2019161253A1) *(publicly reported, Google Patents, high confidence)*
- Assignee: Ultima Genomics, Inc. Inventors: Gilad Almogy, Florian Oberstrass.
- Type: US utility patent, granted.
- Priority date: 2018-02-16 (original PCT/US2019/018287 filed 2019-02-15; this particular US application filed 2020-07-31 as a continuation/national-phase descendant).
- Grant date: **2023-02-21.** Legal status: **Active.** Adjusted expiration: **2039-08-14** *(publicly reported, Google Patents expiration field, high confidence, subject to maintenance-fee payment)*.
- **This is the mechanistic answer to the gap flagged in the main note.** Claims cover sequencing by **transient (non-covalent) binding** of nucleotides to the template — rather than full incorporation-and-block the way Illumina/MGI reversible terminators work — using **known ratios of labeled-to-unlabeled nucleotide** for each of the four bases so that all four produce **the same optical frequency but different, base-identifying signal intensities**, enabling single-wavelength (not four-channel) optical readout. Binding conditions include specific metal cations (calcium, nickel, iron, etc.) to control reversible/transient binding kinetics. This is almost certainly the patent-protected core of what Ultima's product literature calls "mostly natural nucleotide" chemistry and single-frequency imaging.
- A related sibling patent application, **US20230279486A1** (also in this family, priority 2023-01-25), was identified but not independently pulled in this pass — likely a continuation covering refinements to the same detection scheme; flagged for follow-up, not detailed here (**unavailable** beyond bibliographic existence).
- Practical read: together with US 12,319,959 B2 above, this is Ultima's second strong, currently-enforceable, long-remaining-term (13 years as of 2026) patent — this one covering the optical-detection/chemistry step rather than the amplification step.

## 4. Abandoned early filing (superseded)

**US20190352707A1** — "Systems and methods for nucleic acid sequencing" *(publicly reported, Google Patents, high confidence)*
- Priority date: 2016-09-29. Filed: 2019-03-19. Published: 2019-11-21. **Legal status: abandoned** — never granted.
- Covered an earlier, related concept (mixtures of labeled/unlabeled terminating nucleotides at a controlled sub-50% labeled ratio, FRET-based detection, phi-29-family polymerases) that appears to have been superseded by the more refined single-frequency/transient-binding claims in US 11,584,963 B2 above. Included here for completeness and because an abandoned application confers **no patent protection at all** — it is prior art (Ultima's own) but not an enforceable right, and does not block third parties.

## 5. Downstream variant-calling patents (bioinformatics-adjacent, brief note)

Two additional granted patents surfaced in this pass but sit downstream of the wet-chemistry pipeline (software/analysis of sequencing output, not the biology/detection mechanism itself), so they are noted only briefly per this note's scope:
- **US 12,482,536** — filed 2024-07-17, granted 2025-11-25 — methods for detecting short genetic variants from sequencing data.
- **US 12,437,839** — related family — short-variant detection specifically from **non-terminating-nucleotide** sequencing data (i.e., tied to Ultima's own chemistry's error profile). *(Publicly reported via search-engine indexing of USPTO records; bibliographic detail not independently cross-verified against Google Patents in this pass — confidence medium.)*

## 6. Pending next-generation chemistry filing

**US 2025/0059593 A1** — published 2025-09-11 — "methods for sequencing nucleic acids using nucleotide analogs and subsequently appended labels" *(publicly reported via search-engine summary; not independently fetched from Google Patents in this pass — confidence medium on exact bibliographic details, high confidence the application exists)*. Legal status: **pending**, not examined in detail here. Likely represents Ultima's next chemistry-generation patent filing (possibly related to the Solaris chemistry update covered in the main note) — flagged for follow-up research rather than fully documented, since as a pending application its eventual claim scope is not yet fixed.

## What this means for freedom-to-operate awareness (informational only, not a legal conclusion)

- Ultima's two **granted, active** patents (§2, §3 above) are real, currently-enforceable rights covering (a) its specific multi-bead-per-partition emulsion amplification method and (b) its specific transient-binding/ratio-based single-frequency detection chemistry — both expire in the 2039–2040 range.
- The **structural** "open wafer instead of a flow cell" claim (§1) is, as of this research pass, **not yet an issued US patent** — it is a pending application. This status can change at any time (grant, further narrowing, or abandonment), so it should be re-checked before treating wafer-format substrates as either clear or blocked IP territory.
- None of the patents found claim impedance/electrochemical detection specifically — Ultima's detection mechanism (optical, transient-binding fluorescence-ratio) is a different physical readout family from Proprium's ECSEQ-1 approach, which is the most directly relevant fact for a first-pass overlap screen, though this is not a substitute for a real claim-by-claim FTO analysis.

## Sources

- Google Patents: [US20190352707A1](https://patents.google.com/patent/US20190352707A1/en), [WO2022072652A1](https://patents.google.com/patent/WO2022072652A1/en), [US20230279487A1](https://patents.google.com/patent/US20230279487A1/en), [US20220042072A1 / US12319959B2](https://patents.google.com/patent/US20220042072A1/en), [WO2019161253A1](https://patents.google.com/patent/WO2019161253A1/en), [US11584963B2](https://patents.google.com/patent/US11584963B2/en) — all accessed 2026-07-19, publicly reported, high confidence for bibliographic/legal-status fields shown on each page.
- [Patents Assigned to Ultima Genomics, Inc. — Justia Patents Search](https://patents.justia.com/assignee/ultima-genomics-inc) — index used to identify additional candidates (direct fetch of this page returned HTTP 403 in this pass; entries cross-checked via Google Patents and search-engine indexing instead).
- Search-engine-indexed USPTO records for US 12,482,536, US 12,437,839, and US 2025/0059593 A1 — bibliographic existence publicly reported; not independently opened on Google Patents in this pass, confidence medium.
- [Ultima Genomics, Inc. Patent Filings — uspto.report](https://uspto.report/company/Ultima-Genomics-Inc/patents) — secondary aggregator, used only to cross-check filing existence, not treated as a primary source for legal-status fields.

## Confidence summary

| Claim | Confidence |
|---|---|
| Bibliographic data (filing/priority/publication/grant dates) for the 6 primary patents fetched directly from Google Patents | High |
| Legal status (active/pending/abandoned/ceased) for those 6 | High — read directly from Google Patents' status field |
| Adjusted expiration dates for the 2 granted patents (2039, 2040) | High — Google Patents' own computed field, but still subject to future maintenance-fee non-payment, which would end a patent early |
| Anticipated expiration for the pending wafer-architecture application, if granted | Low — cannot be fixed until/unless the application grants |
| Existence and rough subject matter of the 3 secondary/downstream patents (§5, §6) | Medium — sourced from search-engine summaries of USPTO records, not independently opened on Google Patents |
| Completeness of this list as "all" Ultima patents touching core biology | Medium — the Justia assignee index (the most likely single source of a complete list) returned HTTP 403 and could not be directly reviewed; this note should not be treated as an exhaustive patent-family map |
