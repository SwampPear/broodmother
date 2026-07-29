# PacBio — Patent Landscape (Sequencing Biology & Chemistry)

Status: reference research, compiled 2026-07-19. Covers patents on the core biology/chemistry steps of PacBio's two pipelines documented in this vault: [[SMRT Sequencing (Revio, HiFi)]] (zero-mode waveguide real-time single-molecule sequencing) and [[Sequencing by Binding (Onso)]] (examine-then-incorporate short-read chemistry, acquired with Omniome in 2021). See [[Terminology & Metrics]] for shared definitions.

**Disclaimer: this is informational patent-landscape research for Proprium's internal awareness only.** It is not legal advice and not a freedom-to-operate opinion. Patent scope, validity, and enforceability depend on the full prosecution history, current claim construction, and any post-grant challenges (IPR, litigation) — none of which is exhaustively analyzed here. Any reliance on this note for a real FTO decision requires review by qualified patent counsel of the current, complete claim language and legal status. Confidence/source labels follow the vault convention: *(publicly reported / independently verified / calculated from reported data / estimated / unavailable)*.

## 1. Zero-mode waveguide (ZMW) — the core optical-confinement structure

The ZMW is the physical structure that makes single-molecule real-time detection possible at all: a sub-wavelength metal-clad aperture that confines the observation volume to zeptoliters, so a single polymerase's fluorescence pulses are distinguishable from the bulk-solution background (see [[SMRT Sequencing (Revio, HiFi)]] §pipeline step 8–9). Two generations of patent exist — the original Cornell academic patent, and PacBio's own follow-on apparatus patents.

| Patent | Assignee | Filed | Priority date | Granted | Status | Anticipated expiration | What it covers |
|---|---|---|---|---|---|---|---|
| **US7,181,122 B1** — "Zero-mode waveguides" | Cornell Research Foundation, Inc. | 2005-12-20 | 2001-09-27 | 2007-02-20 | **Expired** | 2022-09-27 | Foundational academic patent: metal-clad sub-wavelength waveguide structure that prevents light propagation below a cutoff frequency, confining an observation volume small enough to detect single molecules at physiologically relevant (µM) concentrations. Names PacBio's own founder/CTO Stephen Turner as a co-inventor, alongside the Cornell Webb/Craighead lab. |
| **US7,170,050 B2** — "Apparatus and methods for optical analysis of molecules" | Pacific Biosciences of California, Inc. | 2004-09-17 | 2004-09-17 | 2007-01-30 | **Expired** | 2024-09-17 | PacBio's own follow-on: high-density ZMW *arrays* (>40,000 confinements/mm²), fabrication method (negative-tone resist process), and the specific application to real-time DNA sequencing via polymerase observation. |
| **US7,302,146 B2** — "Apparatus and method for analysis of molecules" | Pacific Biosciences of California, Inc. | 2005-09-16 | 2004-09-17 | 2007-11-27 | **Expired** | 2025-05-16 | Continuation of the above — same ZMW-array/observation-volume subject matter, broader claim set; the two-decade term ran from a slightly later effective date than a strict priority-date calculation would suggest, which is why its expiration lands ~8 months after the parent patent's. |

**Implication:** the foundational ZMW patent family — the specific physical structure enabling single-molecule real-time optical sequencing — is now fully expired (the last of the three, US7,302,146, lapsed 2025-05-16, roughly 14 months before this research date). The bare ZMW concept is public domain; PacBio's continuing protection in this area now rests on *later*, narrower engineering patents (chemistry, fabrication refinements, signal processing) rather than the core waveguide structure itself. *(Calculated from reported data, high confidence on the dates — Google Patents' own "anticipated expiration" field for each; medium confidence on the broader "now public domain" implication, since a full freedom-to-operate search would need to confirm no later continuation/divisional patents from this same family remain active.)*

## 2. SMRTbell template / circular consensus sequencing (CCS/HiFi)

| Patent | Assignee | Filed | Priority date | Granted | Status | Anticipated expiration | What it covers |
|---|---|---|---|---|---|---|---|
| **US9,404,146 B2** — "Compositions and methods for nucleic acid sequencing" | Pacific Biosciences of California, Inc. | 2013-04-19 | 2008-03-28 | 2016-08-02 | **Active** | 2029-08-15 | The hairpin-adapter/SMRTbell circularization mechanism itself: ligating a hairpin oligonucleotide to each end of a double-stranded fragment to create a single continuous circular template, enabling repeated polymerase passes over both strands of the same molecule and consensus base-calling from those passes — i.e., the specific mechanism this vault's [[SMRT Sequencing (Revio, HiFi)]] note describes in pipeline steps 5 and 11–12 (SMRTbell formation, multi-pass CCS/HiFi consensus). |

**Enforcement history — this specific patent was actually litigated:** PacBio filed an ITC complaint on 2016-11-02 asserting US9,404,146 against Oxford Nanopore's MinION/PromethION products, seeking to exclude them from US import. This opened a multi-year, multi-jurisdiction patent fight between the two companies:
- **2018**: PacBio and ONT reached a 5-year settlement in the **UK and Germany** specifically — ONT agreed not to sell "2D" sequencing products in those two countries through end of 2023, and dropped a countersuit there. *(Publicly reported, GenomeWeb.)*
- **2019**: The US ITC found ONT's products did **not** infringe PacBio's asserted patents; the US Court of Appeals for the Federal Circuit upheld that finding on appeal. *(Publicly reported.)*
- **2020**: In a separate Delaware federal court case, a jury found **four PacBio patents related to long-read/nanopore-adjacent sequencing technology invalid** in PacBio's suit against ONT. *(Publicly reported, GenomeWeb headline — this research pass did not independently confirm whether US9,404,146 itself was among the four invalidated patents or whether it survived; flagged as a gap, confidence low-medium on which specific patents were affected.)*

**Implication:** US9,404,146 remains listed as active with an anticipated 2029 expiration, but its practical strength as a barrier to competitors is genuinely contested — PacBio's attempt to enforce a hairpin/consensus-sequencing patent against a *different* single-molecule technology (nanopore) largely failed on the merits (non-infringement finding, upheld on appeal) rather than succeeding. This is a useful illustration for Proprium: a patent's face-value "active, unexpired" status does not by itself establish that it would successfully block a differently-mechanized competitor — infringement still has to be proven claim-by-claim against the accused product. *(Publicly reported / independently verified via Google Patents legal-status field for the patent's own status; the litigation-outcome synthesis is publicly reported from trade press, medium confidence given the gap noted above.)*

## 3. Sequencing by Binding (SBB) — examine-then-incorporate chemistry (ex-Omniome)

Both patents below originated at Omniome, Inc. and were reassigned to Pacific Biosciences of California, Inc. following PacBio's 2021 acquisition of Omniome (deal closed 2021-09-20; patent-office assignment records show the formal reassignment completed in early 2022). This is the chemistry described in [[Sequencing by Binding (Onso)]] pipeline steps 4–6 (examination step: polymerase+nucleotide binding without covalent incorporation; separate incorporation step after base identification).

| Patent | Assignee (current) | Original assignee | Filed | Priority date | Granted | Status | Anticipated expiration | What it covers |
|---|---|---|---|---|---|---|---|
| **US10,077,470 B2** — "Nucleic acid sequencing methods and systems" | Pacific Biosciences of California, Inc. | Omniome, Inc. | 2015-07-21 | 2015-07-21 | 2018-09-18 | **Active** | 2036-08-21 | The core SBB mechanism: identifying the next template base by monitoring polymerase–nucleotide binding-complex ("ternary complex") formation with *unlabeled* nucleotides, without incorporation — using non-catalytic metal ions (e.g., strontium, nickel) to stabilize the complex and block the incorporation chemistry until after base identification — then a separate, controlled incorporation step. This is the foundational examine/incorporate split this vault's Onso note describes. |
| **US9,951,385 B1** — "Methods and apparatus that increase sequencing-by-binding efficiency" | Pacific Biosciences of California, Inc. | Omniome, Inc. | 2017-09-22 | 2017-04-25 | 2018-04-24 | **Active** | 2037-09-22 | An efficiency refinement on the above: identifying all four bases using fewer reagent-delivery/detection-channel cycles than a naive one-nucleotide-per-cycle scheme, via strategic omission of certain nucleotide types and inferring the omitted base from the pattern of "no signal" results. |

**Implication:** unlike the ZMW patents, PacBio's SBB patent family is comparatively young (both filed 2015–2017, both still well over a decade from expiration) and reasonably broad on the core examine-before-incorporate mechanism — this looks like the more durable protection in PacBio's current portfolio, though this note has not searched for adjacent patents held by other examine/incorporate-adjacent players (e.g., Element Biosciences' avidity-based multivalent binding chemistry uses a related but distinctly-patented mechanism — see [[Avidity Sequencing]] and that company's own patent note) to assess freedom-to-operate risk in either direction.

## 4. Nucleotide chemistry — phospholinked/protein-shielded fluorescent substrates

| Patent | Assignee | Filed | Priority date | Granted | Status | Anticipated expiration | What it covers |
|---|---|---|---|---|---|---|---|
| **US11,718,639 B2** — "Fluorescent polymerase enzyme substrates having protein shields" | Pacific Biosciences of California, Inc. | 2021-04-14 | 2012-02-15 | 2023-08-08 | **Active** | 2033-02-14 | A refinement of the phospholinked-nucleotide chemistry described in [[SMRT Sequencing (Revio, HiFi)]] §pipeline step 9–10: positioning a protein spacer (≥60 amino acids, e.g. an avidin/streptavidin-biotin scaffold) between the nucleotide and its fluorescent dye label(s), physically shielding the polymerase from photodamage during the repeated illumination cycles of a real-time run — extending enzyme operational life and read length. This patent family traces back to a 2012 priority date (i.e., it is a continuation claiming an original filing over a decade old), which is why its 2033 expiration is earlier than the newer-filed SBB patents above despite issuing more recently (2023). |

This is one representative example from a larger family of related "protein shield"/phospholinked-nucleotide patents found in this search (e.g. US10,023,605; US11,014,958; US12,162,903; US9,062,091 all share the same title/subject and appear to be continuations of the same original 2012 priority application) — **not all individually tabulated here**; treat the 2033 expiration as representative of the family's likely outer bound, though exact dates should be checked per-patent before relying on any one of them specifically. *(Calculated from reported data, medium confidence on the "family" characterization — inferred from matching titles/inventors in search results, not independently confirmed via a full continuation-chain check on USPTO PatFT.)*

## Summary table — protection timeline

| Technology area | Earliest coverage | Latest coverage | Net status (2026-07-19) |
|---|---|---|---|
| ZMW core structure (Cornell + PacBio arrays) | Filed 2001 (priority) | Expired 2025-05-16 | **Fully expired** — public domain |
| SMRTbell/CCS hairpin-consensus mechanism | Filed 2013 (priority 2008) | Expires 2029-08-15 | Active, but infringement claims against a different (nanopore) mechanism did not succeed in the one enforcement action found |
| Sequencing by Binding (examine/incorporate) | Filed 2015–2017 | Expires 2036–2037 | Active, comparatively young, broad core-mechanism claims |
| Phospholinked-nucleotide/protein-shield chemistry | Priority 2012 | Expires ~2033 | Active, narrower/refinement-level claims |

## Sources

1. [US7181122B1 — Zero-mode waveguides](https://patents.google.com/patent/US7181122B1/en) — Google Patents, accessed 2026-07-19.
2. [US7170050B2 — Apparatus and methods for optical analysis of molecules](https://patents.google.com/patent/US7170050B2/en) — Google Patents, accessed 2026-07-19.
3. [US7302146B2 — Apparatus and method for analysis of molecules](https://patents.google.com/patent/US7302146B2/en) — Google Patents, accessed 2026-07-19.
4. [US9404146B2 — Compositions and methods for nucleic acid sequencing](https://patents.google.com/patent/US9404146B2/en) — Google Patents, accessed 2026-07-19.
5. [US10077470B2 — Nucleic acid sequencing methods and systems](https://patents.google.com/patent/US10077470B2/en) — Google Patents, accessed 2026-07-19.
6. [US9951385B1 — Methods and apparatus that increase sequencing-by-binding efficiency](https://patents.google.com/patent/US9951385B1/en) — Google Patents, accessed 2026-07-19.
7. [US11718639B2 — Fluorescent polymerase enzyme substrates having protein shields](https://patents.google.com/patent/US11718639B2/en) — Google Patents, accessed 2026-07-19.
8. [PacBio press release, "PacBio Files ITC Patent Infringement Complaint Against Oxford Nanopore," 2016-11-02](https://www.pacb.com/press_releases/pacbio-files-itc-patent-infringement-complaint-against-oxford-nanopore/) — accessed 2026-07-19.
9. GenomeWeb: "PacBio, Oxford Nanopore Settle Patent Dispute in Europe" (2018); "Oxford Nanopore Prevails in US Patent Dispute With Pacific Biosciences" (2019); "Jury Invalidates Pacific Biosciences Patents in Lawsuit Against Oxford Nanopore" (2020) — trade press, litigation outcomes.
10. Pacific Biosciences press release, "Pacific Biosciences Closes Acquisition of Omniome and Establishes San Diego Presence," 2021-09-20 — Omniome acquisition close date.
11. C&EN, "DNA Sequencing: Zero-Mode Waveguides Turn 10," and Cornell/Levene et al. 2003 *Science* paper (via search aggregation) — ZMW academic origin and inventor cross-reference.

## Confidence summary

| Claim | Confidence |
|---|---|
| Patent numbers, filing/priority/grant dates, current assignee, legal status, anticipated expiration (all 7 patents tabulated) | High — sourced directly from each patent's own Google Patents record, which reflects USPTO assignment/legal-status data |
| Claims-summary plain-English descriptions | Medium-high — derived from Google Patents' own claim summarization, not independently re-read against full claim language by a patent professional |
| PacBio v. ONT litigation outcome details | Medium — publicly reported via trade press across multiple jurisdictions/years; which specific patents were invalidated in the 2020 Delaware verdict is an unconfirmed gap |
| "Protein shield" patent family scope (beyond the one tabulated patent) | Low-medium — inferred from matching titles in search results, not individually verified per-patent |
| Completeness of this landscape (i.e., no other unfound relevant patents/applications exist) | Low — this is a representative, not exhaustive, search; a real FTO analysis would need a professional prior-art/patent-clearance search |
