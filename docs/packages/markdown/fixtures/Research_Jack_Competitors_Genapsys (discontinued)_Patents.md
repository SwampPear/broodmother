# Genapsys — Patents on Core Sequencing Biology

Status: **Company discontinued** (Chapter 11 bankruptcy, 2022-07-11); underlying patent portfolio **survives and appears active**, now held by the successor entity **Sequencing Health, Inc.** Researched 2026-07-19. Confidence and source labels follow the vault convention: *(publicly reported / independently measured / calculated from reported data / estimated / unavailable)*.

**This note is informational patent-landscape research for Proprium's internal awareness only. It is NOT legal advice and NOT a freedom-to-operate (FTO) opinion.** Patent claims, legal status, and ownership can change (reexamination, IPR, litigation, maintenance-fee lapses); any actual FTO reliance requires review of current claim language and file histories by qualified patent counsel. See also `ECSEQ-1/IP & Patents/` for how this vault treats Proprium's own IP.

Context: see [[Electronic Non-Optical Sequencing (eNGS)]] for the underlying pipeline this patent portfolio covers.

## 1. What happened to the patent portfolio in bankruptcy

GenapSys, Inc. filed Chapter 11 on 2022-07-11; its assets — including its patent portfolio — were sold via a confirmed bankruptcy reorganization plan (effective 2023-01-13) to **Sequencing Health, Inc.**, a new entity tied to prior GenapSys investors Farallon Capital Management and Soleus Capital (see [[Electronic Non-Optical Sequencing (eNGS)]] for deal-value detail).

Direct confirmation from patent records: Google Patents' assignment history for each patent checked below shows a **reassignment dated 2023-01-12** — one day before the bankruptcy plan's effective date — moving ownership from GenapSys, Inc. to **Sequencing Health, Inc.** *(publicly reported, high confidence — consistent across all four patents checked, and consistent with the independently-sourced bankruptcy timeline in [[Electronic Non-Optical Sequencing (eNGS)]])*. Oxford Finance LLC (GenapSys's secured lender, owed ~$32M per the bankruptcy reporting) is also recorded as a collateral-agent assignee as of 2023-06-30 on at least one patent in the family, consistent with a lender's security interest surviving the asset sale *(publicly reported, medium confidence, source: search-engine summary of Justia patent-assignment data, not independently re-verified against the raw USPTO assignment database in this pass)*.

**Practical implication:** this is not an abandoned, ownerless patent portfolio. The core biology claims remain enforceable IP, now owned by Sequencing Health, Inc. rather than the defunct GenapSys entity — a materially different situation from "the company died, so the patents no longer matter."

One data point cuts the other way on a *specific* patent: US10,683,389 ("Beads for nucleic acid sequencing") is recorded with legal status **"Active – Reinstated"** on Google Patents, meaning it lapsed at some point (most likely a missed maintenance-fee payment, plausibly during the bankruptcy period) and was later reinstated. This is worth flagging as a concrete illustration that maintenance-fee risk is real during corporate distress, even though the end state here is "active." *(Publicly reported, medium confidence — Google Patents legal-status field, underlying USPTO maintenance-fee/reinstatement filing not independently pulled in this pass.)*

## 2. Core biology/chemistry patents

| Patent | Title | Pipeline step covered | Filing date | Priority date | Grant date | Current assignee | Legal status | Anticipated expiration |
|---|---|---|---|---|---|---|---|---|
| [US8,969,002 B2](https://patents.google.com/patent/US8969002B2/en) | Methods and systems for electronic sequencing | Core detection mechanism — electronic/electrical base-incorporation sensing | 2012-10-01 | 2010-10-04 | 2015-03-03 | Sequencing Health, Inc. (ex-GenapSys) | Active | 2031-10-04 |
| [US9,822,401 B2](https://patents.google.com/patent/US9822401B2/en) | Methods and systems for nucleic acid amplification | Bead/electrode-tethered isothermal clonal amplification (no thermal cycling) | 2015-04-16 | 2014-04-18 | 2017-11-21 | Sequencing Health, Inc. (ex-GenapSys) | Active | 2036-01-17 |
| [US10,683,389 B2](https://patents.google.com/patent/US10683389B2/en) | Beads for nucleic acid sequencing | Chip-loading bead chemistry (functionalized magnetic beads, primer-linker attachment) | 2017-09-18 | 2015-03-30 | 2020-06-16 | Sequencing Health, Inc. (ex-GenapSys) | **Active — Reinstated** (lapsed and reinstated at some point; underlying cause not independently confirmed) | 2036-03-24 |
| [US10,900,075 B2](https://patents.google.com/patent/US10900075B2/en) | Systems and methods for nucleic acid sequencing | Broader continuation of the electronic-detection claims (electrostatic-moiety-labeled nucleotides, charge-double-layer signal detection, reversible-terminator-compatible) | 2018-09-25 | 2017-09-21 | 2021-01-26 | Sequencing Health, Inc. (ex-GenapSys) | Active | 2038-09-20 |

All patent type: **utility patents** (US). Expiration dates above are Google Patents' own "anticipated expiration" field (accounts for the standard 20-years-from-earliest-nonprovisional-filing term plus any Patent Term Adjustment on file) rather than a simple filing-date-plus-20-years calculation — *(publicly reported, high confidence for the field itself; PTA/terminal-disclaimer details behind each date not independently re-derived)*.

### What each patent actually protects (plain-English)

- **US8,969,002** (earliest, foundational): claims the basic method of sequencing by positioning a template/primer complex — attached to a bead — next to an electrode-pair sensor, and reading base incorporation from a change in conductivity/impedance within the Debye length (the charge double-layer) rather than from an optical signal. This is the patent that most directly covers "detect DNA synthesis electrically instead of optically," i.e., the same high-level category of approach (non-optical, electrode-based, per-base electrical readout) that Proprium's own ECSEQ-1 also falls into, though the specific transduction physics differ (see §3).
- **US9,822,401**: claims the isothermal, thermal-cycling-free clonal amplification method — primers tethered to a bead/electrode/array surface, extended by a strand-displacing polymerase, with "invader" oligonucleotides/proteins competitively displacing/denaturing strands to expose new primer sites — used to build the clonal population on each bead before sequencing. This is a bead-amplification-chemistry patent, not a detection patent.
- **US10,683,389**: claims specific magnetic-bead compositions (hydrophilic-polymer-functionalized surfaces, specific linker/coupling chemistries such as ATRP-grown polymer brushes) used to attach primers for the clonal amplification above. Narrower and more materials-science-flavored than the other three.
- **US10,900,075**: a later, broader continuation of the electronic-detection family — extends US8,969,002's core claims to explicitly cover labeled nucleotides bearing "electrostatic moieties" (polycations/polyanions) as the signal source, and explicitly contemplates reversible terminators and flap endonucleases as optional cycle-control elements. This is the patent most likely to have the broadest claim scope over "read DNA synthesis via an electrically-detectable label/moiety on the incoming nucleotide."

## 3. Relevance framing (technical, not legal)

Genapsys's approach and Proprium's ECSEQ-1 are both non-optical, electrode-based single-base detection schemes, which makes this family worth having on file for competitive/prior-art awareness even though GenapSys itself never commercialized broadly and is now defunct as an operating company (see [[Electronic Non-Optical Sequencing (eNGS)]] §"Why it failed" — the collapse was financial/legal, not a disclosed chemistry failure). Genapsys's claims center on **impedance/conductance changes within a bead-adjacent electrode pair from charged-nucleotide incorporation**; Proprium's approach is impedance-spectroscopy-based at a polymerase-functionalized electrode (see `ECSEQ-1/Whitepaper/Definitions.md`) — related detection *category* (electrical, non-optical), but a different specific sensing mechanism and geometry. Whether ECSEQ-1's actual claims-eligible design falls inside or outside the scope of these claims is a legal question for counsel, not something this note determines.

## 4. Confidence summary

| Claim | Confidence |
|---|---|
| Patent numbers, titles, filing/priority/grant dates | High — Google Patents primary records, cross-checked against WebSearch results (USPTO grant reports, FreePatentsOnline) |
| Current assignee = Sequencing Health, Inc., reassigned 2023-01-12 | High — consistent across all four patents' Google Patents assignment history; corroborates the independently-sourced bankruptcy-plan effective date already in [[Electronic Non-Optical Sequencing (eNGS)]] |
| "Active" legal status | Medium-high — Google Patents legal-status field, not independently cross-checked against live USPTO Patent Center for maintenance-fee payment currency as of today |
| US10,683,389's lapse/reinstatement cause | Low — status flagged, underlying reinstatement petition/reason not pulled |
| Oxford Finance LLC collateral-agent assignment | Medium — from a search-engine summary of Justia data, not independently re-verified in this pass |
| Completeness of portfolio (i.e., no other significant biology patents exist) | Medium — four patents found via targeted search cover the core detection/amplification/bead-chemistry claims consistently; a full USPTO assignee search (assignment.uspto.gov, not accessible via WebFetch in this pass — returned HTTP 403) could not be run directly, so a small number of additional continuation/divisional patents in the same families is plausible and would likely narrow rather than change the picture above |

## Sources

- [US8,969,002 B2 — Google Patents](https://patents.google.com/patent/US8969002B2/en)
- [US9,822,401 B2 — Google Patents](https://patents.google.com/patent/US9822401B2/en)
- [US10,683,389 B2 — Google Patents](https://patents.google.com/patent/US10683389B2/en)
- [US10,900,075 B2 — Google Patents](https://patents.google.com/patent/US10900075B2/en)
- [Patents Assigned to Genapsys, Inc. — Justia Patents Search](https://patents.justia.com/assignee/genapsys-inc) (list page; direct fetch returned HTTP 403 in this pass, referenced via search-result summary only)
- [Beads for nucleic acid sequencing — uspto.report grant page](https://uspto.report/patent/grant/10,683,389)
- [Systems and methods for nucleic acid sequencing — uspto.report grant page](https://uspto.report/patent/grant/10,900,075)
- Bankruptcy/reorganization timeline: see Sources in [[Electronic Non-Optical Sequencing (eNGS)]] (Law360, GenomeWeb).
