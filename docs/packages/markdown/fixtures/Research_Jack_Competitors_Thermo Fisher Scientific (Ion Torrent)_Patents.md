# Patents — Thermo Fisher Scientific / Ion Torrent

Status: reference analysis, researched and written 2026-07-19. Confidence and source labels follow the vault convention: *(publicly reported / independently verified / calculated from reported data / estimated / unavailable)*.

**Disclaimer: this is informational patent-landscape research for Proprium's internal awareness only.** It is not legal advice and not a freedom-to-operate opinion. Patent status (active/expired/lapsed), claim scope, and family membership can change (maintenance-fee lapses, reexamination, inter partes review, litigation outcomes, continuations). Any actual freedom-to-operate decision requires review of current claims and file histories by patent counsel — see the caveat already established in `ECSEQ-1/IP & Patents/`.

This note covers patents protecting the specific **biology/chemistry pipeline steps** described in [[Ion Semiconductor Sequencing]] and [[Sanger (Capillary Electrophoresis) Sequencing]] — not business-method, software, or unrelated Thermo Fisher IP.

## 1. Core ISFET / chemFET semiconductor-detection patents

This is Ion Torrent's foundational, defining mechanism: detecting the H⁺ ion released on nucleotide incorporation via an ion-sensitive field-effect transistor beneath each well, instead of optical imaging. All patents below descend from Jonathan Rothberg's original Ion Torrent Systems Inc. filings, now assigned to Life Technologies Corp (a Thermo Fisher subsidiary).

| Patent | Title | Filed | Priority date | Granted | Status | Expiration | What it covers |
|---|---|---|---|---|---|---|---|
| [US7,948,015 B2](https://patents.google.com/patent/US7948015B2/en) | Methods and apparatus for measuring analytes using large scale FET arrays | 2007-12-14 | 2006-12-14 | 2011-05-24 | **Active** *(publicly reported, Google Patents legal-status field)* | 2029-01-23 | The foundational chemFET-array patent: large-scale (512×512+) arrays of chemically-sensitive FETs, simplified per-pixel architecture, 20–100 fps readout, and applying pH/byproduct detection during nucleic-acid synthesis to DNA sequencing. This is the patent most directly "protecting" the core electrical (non-optical) detection principle. |
| [US8,349,167 B2](https://patents.google.com/patent/US8349167B2/en) | Methods and apparatus for detecting molecular interactions using FET arrays | 2009-06-26 | 2006-12-14 | 2013-01-08 | **Expired — fee related** *(publicly reported; lapsed for non-payment of a maintenance fee, not natural 20-year term expiration)* | Adjusted expiration would have been 2028-10-11 had fees been paid | Same chemFET-array family as US7,948,015, extended to general molecular-interaction detection (hybridization, protein binding, enzyme reactions) beyond sequencing specifically; ≤10 μm² per-sensor pixels, microfluidic reaction-chamber coupling, fabrication/passivation methods. |
| [US8,262,900 B2](https://patents.google.com/patent/US8262900) | Methods and apparatus for measuring analytes using large scale FET arrays | 2007-12-17 | 2006-12-14 | (continuation in same family) | *(status not independently re-verified this pass — same priority family as US7,948,015; treat as **estimated** active/expired parallel to sibling patents)* | ~2027–2029 (family priority-date-based estimate) | Delivery of chemical samples/reagents to large-scale chemFET arrays — the fluidics-integration counterpart to the detection-array claims above. |

**Reading this family**: Ion Torrent's core IP is not one patent but a large continuation family, all tracing to the same December 2006 priority date (Rothberg's original filing). That means the *substance* of the foundational chemFET-sequencing concept starts becoming unprotectable roughly **2026–2029** as the family's 20-year terms lapse — several members are already expired (one for non-payment, which is itself informative: Thermo Fisher did not consider that particular claim scope worth the maintenance-fee cost, likely because broader/later continuations in the same family already cover the commercially relevant ground).

## 2. Ion Sphere Particle / clonal-amplification patents

Covers the emulsion-PCR bead-based clonal amplification step (§2C in [[Ion Semiconductor Sequencing]]) — analogous in *function* to Illumina's bridge amplification and MGI's DNA nanoballs, but a physically distinct bead-in-oil-droplet mechanism.

| Patent | Title | Filed | Priority date | Granted | Status | Expiration | What it covers |
|---|---|---|---|---|---|---|---|
| [US8,574,835 B2](https://patents.google.com/patent/US20100304982A1/en) (granted from application US2010/0304982A1) | Scaffolded nucleic acid polymer particles and methods of making and using | 2010-05-24 | 2009-05-29 | 2013-11-05 | **Active** *(publicly reported)* | 2030-09-19 | The Ion Sphere Particle itself: a porous 3-D gel-matrix bead (not a simple surface-coated bead) with polynucleotides distributed *throughout* the particle volume (claimed density ≥6.9×10⁴ templates/µm³) rather than only on the surface — this is what gives one bead enough clonal template mass for the ISFET signal to be detectable. Also claims membrane-emulsification manufacturing methods for producing monodisperse bead populations, and a bridge-PCR-on-particle variant that avoids the emulsion step entirely. |
| Related family (not individually re-verified this pass) — emulsion-based amplification apparatus/method patents, e.g. **US9,803,226** ("Emulsion systems and emulsion-based amplification of nucleic acid") | — | — | — | — | *(unavailable — identified via search, not independently fetched/confirmed this pass)* | — | Covers the emulsion-PCR system/method (oil-in-water droplet partitioning, thermocycling-in-droplet) as distinct from the particle composition itself. Flagged for follow-up verification. |

## 3. Notable patent litigation (context for enforcement risk, not a claim of current status)

- **Illumina v. Life Technologies (Ion Torrent), filed 2011-12** — Illumina accused Life Technologies' Ion Personal Genome Machine and Ion OneTouch System of infringing an Illumina patent on "making and decoding of array sensors with microspheres." *(Publicly reported, BioSpace/Bloomberg trade coverage, 2011-12-29 — high confidence the suit was filed; outcome/settlement terms not independently confirmed in this pass, labeled **unavailable**.)* Relevant because it shows Illumina has previously and successfully asserted bead/microsphere-array patents against Ion Torrent's amplification/loading approach, not just against direct SBS competitors.
- **Enzo Biochem/Enzo Life Sciences v. Life Technologies** — a 2012 jury verdict awarded Enzo **$48.6M** for infringement, with a further **$12.4M** awarded in 2014, ultimately resolved via a **$35M settlement** covering US Patents **6,992,180** and **7,064,197** (nucleic-acid labeling/detection patents, not specific to Ion Torrent's chemFET mechanism but relevant to the broader labeled-nucleotide/array-detection IP landscape Thermo Fisher operates in). *(Publicly reported, GenomeWeb/Enzo investor-relations press release, medium-high confidence on the settlement figures; note Enzo separately extracted a $21M settlement from Illumina over the same 7,064,197 patent in 2016, indicating this was an industry-wide licensing sweep rather than an Ion-Torrent-specific vulnerability.)*

## 4. Legacy Sanger / capillary-electrophoresis automation patents — status: expired

The chain-termination (dideoxy) sequencing method itself (Sanger, Nicklen & Coulson, *PNAS* 1977) predates the modern patent-priority window entirely and was never the kind of commercially asserted patent that matters for a freedom-to-operate check today. The commercially relevant IP was in the **automated fluorescent dye-terminator chemistry and capillary-array electrophoresis instrumentation** that Applied Biosystems (predecessor, now part of Thermo Fisher) commercialized starting in the late 1980s–1990s (e.g., four-color fluorescent dye-terminator detection, sheath-flow capillary detection cuvettes, multi-capillary array instruments — ABI's first capillary sequencer generation launched 1998).

- Given a 20-year utility-patent term, **any patent filed before ~2006 on this original ABI capillary/dye-terminator technology would already be expired by 2026** — this is a structural conclusion from patent-term arithmetic, not a claim about any specific patent number. **Label: estimated, medium-high confidence** (the underlying logic is sound; no specific ABI 1990s CE patent number was individually pulled and confirmed expired in this research pass, which would be needed to state this with high confidence for a specific claim).
- Practical implication: the core Sanger/CE mechanism used in the current SeqStudio instrument is very unlikely to carry any live composition-of-matter or core-method patent risk today; if SeqStudio-specific IP still exists, it is far more likely confined to newer instrument-engineering details (e.g., the specific SeqStudio cartridge/fluidics design), not the underlying 1977 chemistry or 1990s automation principles. Not independently verified — **labeled estimated**.

## Sources

1. [US7,948,015 B2, Google Patents](https://patents.google.com/patent/US7948015B2/en) — primary patent record.
2. [US8,349,167 B2, Google Patents](https://patents.google.com/patent/US8349167B2/en) — primary patent record.
3. [US8,262,900, Google Patents](https://patents.google.com/patent/US8262900) — primary patent record (family member, not independently re-verified for status this pass).
4. [US20100304982A1 / granted as US8,574,835 B2, Google Patents](https://patents.google.com/patent/US20100304982A1/en) — primary patent record, Ion Sphere Particle composition.
5. GenomeWeb, "Ion Torrent Patent App Suggests Sequencing Tech Using Chemical-Sensitive Field-Effect Transistors" — trade press, early coverage of the ISFET patent family.
6. Bloomberg, "Illumina Sues Life Technologies Over Array Sensor Patent" (2011-12-29) — trade press, primary-adjacent litigation reporting.
7. BioSpace, "Illumina, Inc. Accuses Life Technologies of Infringing Patent" — trade press, litigation reporting.
8. GenomeWeb, "Life Technologies, Enzo Biochem Settle Patent Infringement Lawsuit" — trade press, settlement reporting.
9. Enzo Biochem, Inc. investor-relations press release, "$35 Million Patent Infringement Settlement... With Life Technologies Corporation" — primary company source.
10. Rothberg, J.M. et al., "An integrated semiconductor device enabling non-optical genome sequencing," *Nature* 475, 348–352 (2011) — peer-reviewed foundational science paper (already cited in [[Ion Semiconductor Sequencing]]), corroborating context for the patent-claimed mechanism.
11. Sanger, F., Nicklen, S., Coulson, A.R., "DNA sequencing with chain-terminating inhibitors," *PNAS* 74(12):5463–5467 (1977) — original method publication, context for why the base chemistry itself carries no current patent exposure.

## Confidence summary

| Claim | Confidence |
|---|---|
| Core chemFET/ISFET patent family exists, originates from Rothberg's Dec. 2006 priority filing, current assignee Life Technologies Corp (Thermo Fisher) | High — multiple independently cross-checked Google Patents records |
| US7,948,015 status (active, expires 2029-01-23) | High — direct from Google Patents legal-status field |
| US8,349,167 status (expired, fee-related) | High — direct from Google Patents legal-status field |
| US8,262,900 current status | Low-medium — identified via search, not independently re-fetched and confirmed in this pass |
| Ion Sphere Particle patent (US8,574,835, active, expires 2030-09-19) | High — direct from Google Patents legal-status field |
| Emulsion-amplification apparatus patent (US9,803,226) details | Low — identified only via search snippet, not independently fetched |
| Illumina v. Life Technologies (2011) suit filed | High — multiple trade-press sources; outcome/settlement terms unavailable |
| Enzo Biochem v. Life Technologies verdict/settlement figures | Medium-high — GenomeWeb and Enzo IR press release, consistent figures across sources |
| Legacy Sanger/CE automation patents now expired | Medium-high — sound term-arithmetic conclusion, not confirmed against a specific patent number |
