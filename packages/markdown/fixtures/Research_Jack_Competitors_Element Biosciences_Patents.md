# Element Biosciences — Patents on Core Sequencing Biology

Status: reference research, compiled 2026-07-19. Covers patents on the biology/chemistry steps of Element's pipeline as described in [[Avidity Sequencing]] — avidite multivalent base-identification chemistry and rolling-circle/polony amplification — plus the active Illumina↔Element patent litigation, which is directly relevant to how enforceable/contested this IP currently is. Confidence and source labels follow the vault convention: *(publicly reported / independently measured / calculated from reported data / estimated / unavailable)*.

**This note is informational patent-landscape research for Proprium's internal awareness only. It is NOT legal advice and NOT a freedom-to-operate opinion.** Patent status, claim scope, and litigation outcomes change; any actual FTO or licensing decision requires review of current file histories and claims by qualified patent counsel — see [[Patent Plan]] for this vault's standing guidance on IP matters.

## 1. Patents on base-identification chemistry (the "avidite" step)

These cover the core differentiator described in [[Avidity Sequencing]] §1: multivalent, dye-labeled polymer-nucleotide conjugates ("avidites") that bind a polymerase-template complex through several simultaneous contacts, lowering the effective dissociation constant so imaging works at low reagent concentration.

| Patent | Title | Filing date | Priority date | Grant/publication | Status | Anticipated expiration |
|---|---|---|---|---|---|---|
| [US10768173B1](https://patents.google.com/patent/US10768173B1/en) | Multivalent binding composition for nucleic acid analysis | 2019-09-23 | 2019-09-06 | Granted 2020-09-08 | Active | 2039-09-23 |
| [US10704094B1](https://patents.google.com/patent/US10704094B1/en) | Multipart reagents having increased avidity for polymerase binding | 2020-01-10 | 2018-11-14 | Granted 2020-07-07 | Active | 2039-03-25 |
| [US20210318294A1](https://patents.google.com/patent/US20210318294A1/en) → granted as **US11287422B2** | Multivalent binding composition for nucleic acid analysis (continuation of US10768173B1) | 2021-06-24 | 2019-09-23 | Granted 2022-03-29 | Active | 2040-09-23 |
| [US20210373000A1](https://patents.google.com/patent/US20210373000A1/en) | Multipart reagents having increased avidity for polymerase binding (continuation of US10704094B1) | 2021-08-10 | 2019-05-01 | Published, not granted | **Abandoned** | n/a |

*(publicly reported, high confidence for dates/status/assignee — sourced directly from each patent's Google Patents record, which shows USPTO legal-status data; not independently cross-checked against USPTO Patent Center for this pass)*

All four list the same core inventor group (Sinan Arslan, Molly He, Matthew Kellinger, Michael Previte, Junhua Zhao and colleagues) and form one continuation family — Element has been filing successive continuations off the original 2018–2019 priority filings to keep claim scope adjustable as the chemistry commercialized (a common strategy to broaden or narrow claims against a moving competitive target; not itself evidence of any specific dispute). What the *active* patents cover, in plain terms:
- A polymer core carrying multiple identical copies of one nucleotide type, each fluorescently labeled ("avidite").
- The mechanism by which this multivalent structure binds a polymerase-template complex more tightly than a single labeled nucleotide would, permitting nanomolar (vs. micromolar) reagent concentration and longer imaging dwell time.
- Surface/hydrophilic-coating compositions that reduce nonspecific binding, used together with the avidite chemistry to improve signal-to-noise.
- Applications of this multivalent-binding mechanism to sequencing-by-synthesis, biosensor microarrays, and in-situ/spatial nucleic-acid detection (the latter overlapping with AVITI24's Teton/ABC in-situ mode mentioned in [[Avidity Sequencing]] §2).

## 2. Patents on amplification / polony generation

Covers [[Avidity Sequencing]] §2 step 8 (rolling-circle amplification producing a clonal polony) and the upstream circularization step.

| Patent | Title | Filing date | Priority date | Grant/publication | Status | Anticipated expiration |
|---|---|---|---|---|---|---|
| [US20210269793A1](https://patents.google.com/patent/US20210269793A1) → granted as **US12492396B2** | Methods for generating circular nucleic acid molecules | 2021-05-13 | 2018-11-15 | Granted 2025-12-09 | Active | 2042-12-12 |

*(publicly reported, high confidence)*

What it covers: a **ligase-free** method of circularizing library DNA using **TelN protelomerase**, which recognizes a target sequence, cleaves it, and rejoins the ends into a closed circle in as little as 5 minutes (vs. ~16 hours for standard ligase-based circularization). This is a meaningful chemistry difference from MGI's splint-ligation circularization (see [[Research/Jack Research/Competitors/MGI Tech/DNBSEQ (cPAS)]]) even though both companies land on a conceptually similar "circularize → rolling-circle-amplify → polony" pipeline shape — the circularization *mechanism* is separately patented and distinct.

**Gap flagged**: no distinct patent specifically named for the downstream RCA/polony-formation chemistry itself (Phi29 polymerase-based rolling circle amplification is decades-old, broadly non-proprietary technology — e.g. NEB and academic patents from the 1990s–2000s, long expired or never Element's to begin with) was found as an Element-owned patent in this pass; Element's IP contribution here appears concentrated on the circularization *method* (above) and the avidite detection chemistry (§1), not on RCA as a mechanism, which is consistent with RCA being pre-existing, unpatentable-by-Element prior art. **Confidence: medium** — absence of a search hit is not proof no such patent exists.

## 3. Active litigation — directly relevant to "what protects whom"

This is the most concrete signal of what Element's and Illumina's patents are currently understood (by the parties themselves) to cover, since both sides are actively litigating specific claims rather than just holding unenforced patents.

### Illumina → Element (Illumina asserting infringement)
- **Filed**: 2025-05-16, U.S. District Court for the District of Delaware, Case No. 1:25-cv-00602. *(publicly reported, high confidence — GenEngNews)*
- **Patents asserted** (5 total):

| Patent | Subject | Issued |
|---|---|---|
| US 12,251,702 | Flowcell cartridge with floating seal bracket (mechanical/fluidic, not core sequencing biology) | 2025-03-18 |
| US 8,951,781 | SBS imaging systems/methods/apparatus | 2015-02-10 |
| US 11,117,130 | SBS imaging systems/methods/apparatus | 2021-09-14 |
| US 11,697,116 | SBS imaging systems/methods/apparatus | 2023-07-11 |
| US 12,151,241 | SBS imaging systems/methods/apparatus | 2024-11-26 |

- Illumina's claim: Element's AVITI sequencers "practice every limitation of the asserted claims," alleging the imaging patents (originally developed for MiSeq/MiniSeq) read on AVITI's imaging approach. Note only 4 of the 5 are about imaging/detection (closer to this vault's "biology of the pipeline" scope); the cartridge patent is mechanical/fluidic hardware, included here for completeness since it was part of the same suit. *(publicly reported, high confidence — GenEngNews, GenomeWeb)*

### Element → Illumina (countersuit + antitrust)
- Element filed patent-infringement and antitrust/anticompetitive-conduct claims against Illumina (N.D. California antitrust complaint; related patent claims), alleging Illumina threatened customers with punitive consumables/service pricing if they also bought Element instruments. *(publicly reported, medium-high confidence — GenomeWeb, Element press materials — these are one-sided allegations in active litigation, not adjudicated facts)*
- **Element's own asserted US patents** referenced in the Delaware litigation (per Element's press materials): **US 8,612,161; US 9,605,301; US 9,909,174; US 11,001,887; US 12,656,313**. Note the earliest of these (8,612,161, issued ~2013) predates Element's 2017 founding — this patent was very likely acquired/in-licensed rather than originally filed by Element; **this detail is unconfirmed in this research pass and should be verified against the assignee/reassignment record before relying on it — confidence: low-medium** on the exact provenance of that specific patent, though the litigation reference itself is publicly reported.
- **German ruling, 2026-07-14**: Regional Court of Munich I (Landgericht München I) found Illumina and its German subsidiary infringe an Element-controlled patent covering "an imaging method used in DNA sequencing," via direct use (Illumina's own use of the method) and indirect infringement (offering infringing sequencing systems, reagent kits, flow cells, and cartridges) — specifically naming **MiSeq and MiSeqDx** as infringing products. Illumina was ordered to recall affected products sold since 2023-03-31 and refund customers, with a right to appeal (first-instance ruling). The specific German/EP patent number was not identified in the source fetched this pass — **flagged as a gap; the exact patent number should be confirmed before any reliance on this ruling's scope.** *(publicly reported, high confidence for the ruling's occurrence and outcome; medium confidence on exact patent-claim scope, pending the specific patent number)*

**Reading on this for Proprium's context**: this litigation shows Illumina's imaging/SBS patents are being actively asserted against a materially different (avidity, not bridge-PCR) chemistry — i.e., Illumina is treating its imaging/detection-apparatus patents as covering the *imaging step* broadly, not just its own specific bridge-amplification/CRT chemistry. That is a relevant signal for any electrical/impedance-readout platform to be aware of if any shared imaging-adjacent or general "biological analysis apparatus" claim language could be read broadly — though ECSEQ-1's readout is electrical, not optical, which is a substantive, not incidental, difference from every patent listed above.

## Sources

- Element Biosciences, "Patents and Trademarks," elementbiosciences.com/legal/patents — could not be parsed in this pass (PDF/binary content), page confirms patents exist but was not machine-readable; **flagged as a gap, recommend a manual check**.
- Google Patents records: [US10768173B1](https://patents.google.com/patent/US10768173B1/en), [US10704094B1](https://patents.google.com/patent/US10704094B1/en), [US20210318294A1](https://patents.google.com/patent/US20210318294A1/en) (→US11287422B2), [US20210373000A1](https://patents.google.com/patent/US20210373000A1/en), [US20210269793A1](https://patents.google.com/patent/US20210269793A1) (→US12492396B2) — accessed 2026-07-19.
- Justia Patents, "Patents Assigned to Element Biosciences, Inc." (patents.justia.com/assignee/element-biosciences-inc) — direct fetch returned HTTP 403 this pass; referenced only via search-result snippet stating ~15 patents assigned to Element, not independently verified count.
- GenEngNews, "Illumina Sues Element Biosciences, Alleging Infringement of Flow Cell, Imaging Patents" — accessed 2026-07-19, publicly reported, high confidence for filing date/case number/patent numbers.
- GenomeWeb, "Illumina Sues Element Biosciences for Patent Infringement"; "Element Biosciences Sues Illumina Alleging Anticompetitive Behavior, Patent Infringement"; "Element Biosciences Scores Win Against Illumina in German Patent Lawsuit" — accessed 2026-07-19.
- Element Biosciences press releases: "Element Responds to Illumina Patent Litigation"; "Element Biosciences Files Competition and Patent Infringement Countersuits Against Illumina"; "Element Biosciences Prevails in German Patent Case Against Illumina" (2026-07-14) — accessed 2026-07-19, one-sided party statements, treated as publicly reported claims not adjudicated fact except where an actual court ruling is described.
- CourtListener docket, Element Biosciences, Inc. v. Illumina, Inc., 1:25-cv-01175 — referenced via search snippet only, not independently fetched this pass.

## Confidence summary

| Claim | Confidence |
|---|---|
| Four avidite/multivalent-binding patents (numbers, dates, status) | High — direct Google Patents records |
| Protelomerase circularization patent (US12492396B2) | High — direct Google Patents record |
| No distinct Element-owned RCA/polony patent found | Medium — absence of evidence, not proof of absence |
| Illumina v. Element Delaware suit (case number, patents asserted, dates) | High — trade-press reporting, consistent across two sources |
| Element's asserted US patents in countersuit | Medium — single-source (Element press materials), oldest patent's provenance unconfirmed |
| German ruling outcome | High for occurrence/outcome; medium for exact patent number (not identified) |
