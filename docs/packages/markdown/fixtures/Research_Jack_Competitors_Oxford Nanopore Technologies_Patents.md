# Oxford Nanopore Technologies — Patent Landscape (Core Sequencing Biology)

Status: reference research, compiled 2026-07-19. Scope: patents covering the physical/biochemical pipeline steps described in [[Nanopore Strand Sequencing]] — the engineered protein nanopore, the motor-protein translocation control, and the duplex (paired-strand) reading method — plus the patent litigation that has actually tested those claims. Business-method, bioinformatics-only, and manufacturing/instrument patents are out of scope. Confidence and source labels follow the vault convention: *(publicly reported / independently verified / calculated from reported data / estimated / unavailable)*.

**Disclaimer: this is informational patent-landscape research for Proprium's internal awareness only. It is not legal advice and not a freedom-to-operate opinion.** Patent status, claim scope, and enforceability can change (maintenance-fee lapses, reexamination, IPR, continuation filings, litigation outcomes) and must be independently verified against current USPTO/file-history records by patent counsel before any reliance for design, procurement, or IP-strategy decisions.

## 1. Patents Oxford Nanopore itself holds (or co-holds) on the core pipeline

### 1.1 Engineered nanopore protein (CsgG-derived pore)

| Patent | US10975428B2 | US12024541B2 |
|---|---|---|
| Title | "Mutant pore" | "Transmembrane pore consisting of two CsgG pores" |
| Assignee | Oxford Nanopore Technologies PLC | Oxford Nanopore Technologies PLC; VIB (Vlaams Instituut voor Biotechnologie); VUB (Vrije Universiteit Brussel) |
| Filing date | 2017-03-02 | 2018-05-03 |
| Priority date | 2016-03-02 | 2017-05-04 |
| Grant date | 2021-04-13 | 2024-07-02 |
| Patent type | Utility | Utility |
| Legal status | Active | Active |
| Anticipated expiration | 2037-08-14 *(reflects patent-term adjustment beyond the plain 20-yr-from-filing date, per Google Patents)* | 2041-02-24 *(reflects patent-term adjustment)* |
| What it protects | Specific point mutations to the wild-type CsgG monomer (e.g. R192D/Q/F/S/T, R97W, R93W/Y) that improve expression, widen the discriminable current range between bases, and stabilize translocation rate through the pore — i.e., the actual sensing pore used in R9/R10-era MinION/PromethION flow cells. | A tandem (two-CsgG-pore-in-series) architecture and its mutant variants, aimed specifically at resolving homopolymer runs — a direct fix for the "current barely changes as identical bases pass through" error mode. Co-owned with VIB/VUB because the base CsgG scaffold itself is VIB-licensed IP (see §1.4). |
| Source | [Google Patents US10975428B2](https://patents.google.com/patent/US10975428B2/en) | [Google Patents US12024541B2](https://patents.google.com/patent/US12024541B2/en) |

*Publicly reported, high confidence (Google Patents primary record).* Related continuation-family members in the same mutant-CsgG lineage — **US11186868B2** and **US12018326B2** — were identified via search but not individually pulled from Google Patents in this pass; treat their existence as *publicly reported* and their exact expiration dates as *unavailable* here (expect similar ~2036–2038 expiration window given filing dates in the same 2017–2018 range, **estimated, not verified**). The pattern of repeated continuation filings on the same CsgG scaffold (at least four related grants between 2021–2024) is itself notable — it extends ONT's effective pore-level exclusivity well past any single patent's nominal term, a common large-portfolio strategy, not evidence of anything irregular.

**Underlying license note:** the CsgG scaffold itself originates from VIB (Belgium) academic research, not from Oxford University — ONT licensed the base pore and co-assigns improvement patents with VIB/VUB. This is a distinct lineage from the original Hagan Bayley (Oxford) α-hemolysin nanopore work that founded the company; ONT's *shipping* pore since ~2014 is CsgG-based, not Bayley's original α-hemolysin pore.

### 1.2 Motor protein / controlled strand translocation

| Attribute | Detail |
|---|---|
| Patent | **US9758823B2**, "Enzyme method" |
| Assignee | Oxford Nanopore Technologies PLC |
| Filing date | 2012-10-18 |
| Priority date | 2011-10-21 |
| Grant date | 2017-09-12 |
| Patent type | Utility |
| Legal status | Active |
| Anticipated expiration | 2032-10-18 |
| What it protects | Using a **Hel308 helicase** (or related molecular motor) bound to the target strand to ratchet it through a transmembrane pore in discrete, controlled steps — rather than letting the strand drift through under the electric field alone — at high salt concentration (up to 2M KCl) for better signal-to-noise. This is the mechanism-level patent behind the "motor protein... ratchets the single strand through the pore base-by-base" step in [[Nanopore Strand Sequencing]] §1. |
| Source | [Google Patents US9758823B2](https://patents.google.com/patent/US9758823B2/en) |

*Publicly reported, high confidence.* A related family of "Modified Helicases" applications/patents (e.g. **US20210123032A1**) covers newer engineered helicase variants; found via search but not independently pulled — status **unavailable** in this pass, flagged for follow-up if motor-protein freedom-to-operate becomes relevant.

### 1.3 Duplex (paired-strand) reading

This is where a naming collision matters: "duplex sequencing" is used by **two unrelated inventions** in the patent literature, and only one of them is Oxford Nanopore's:

| | ONT's duplex/hairpin method | University of Washington's "Duplex Consensus Sequencing" |
|---|---|---|
| Patent | **US9957560B2** (+ family: US10851409B2, US10597713B2, US11168363B2, US11261487B2, US12168799B2 — continuations spanning priority dates 2011 through 2021) | US9752188B2 |
| Title | "Hairpin loop method for double strand polynucleotide sequencing using transmembrane pores" | "Methods of lowering the error rate of massively parallel DNA sequencing using duplex consensus sequencing" |
| Assignee | Oxford Nanopore Technologies PLC | University of Washington Center for Commercialization |
| Filing / priority / grant | Filed 2012-07-25, priority 2011-07-25, granted 2018-05-01 | Filed 2013-03-15, priority 2012-03-20, granted 2017-09-05 |
| Anticipated expiration | 2032-07-25 (base grant; later family members extend into the 2040s given later priority dates — **estimated**, not individually confirmed) | 2033-03-15 |
| Relevance to ONT's actual product | **Directly relevant.** This is the patent behind ONT's shipping "duplex mode": a bridging hairpin adapter links template and complement strand so both pass through the *same physical nanopore* in one continuous read, and software reconciles the two traces into a consensus call (§1 step 11 of [[Nanopore Strand Sequencing]]). | **Not ONT's technology and not used by ONT's duplex mode.** UW's method is a molecular-barcoding/consensus technique (unique-molecular-identifier adapters + independent resequencing of both strands, typically on a short-read platform) used for ultra-rare-variant detection — an unrelated invention that happens to share the marketing term "duplex." Included here only to prevent confusing the two if "duplex sequencing patent" is searched again. |

*Publicly reported, high confidence for both records (Google Patents).* The breadth of ONT's hairpin-duplex continuation family (six+ related US grants spanning 2018–2025 with priority dates as recent as 2021) suggests ONT has been actively layering new claims onto the same core hairpin-bridging concept as its duplex chemistry has matured (R10.4.1/Kit 14 era) — **estimated interpretation** based on the filing pattern, not a stated ONT strategy document.

### 1.4 Adaptive sampling / real-time read-until rejection

**No dedicated Oxford Nanopore patent was identified in this research pass covering the adaptive-sampling/voltage-reversal-ejection method itself.** The technique's real-time targeting logic ("Read Until") was originated and published openly by academic researchers (Loose, Malla, Stout — University of Nottingham/Exeter, *Nature Methods* 2016) rather than filed as a dedicated ONT biology patent, and is implemented as software (MinKNOW) rather than a claimed biochemical mechanism — which is also why it falls closer to the "business-method/software" boundary this note is scoped to exclude. **Label: unavailable/estimated — the voltage-control hardware itself is likely covered incidentally by ONT's broader pore-control-apparatus patents rather than a dedicated adaptive-sampling patent, but no such patent was confirmed in this pass.** Flag for a follow-up, narrower search (e.g. against WIPO/Espacenet directly) if this specific capability becomes strategically relevant.

## 2. Patents asserted *against* ONT — litigation history

This section matters more than §1 for understanding "what protects others from using [ONT's pipeline]" in practice, because it shows which claims were actually tested, not just filed.

### 2.1 Illumina / University of Washington / UAB Research Foundation v. Oxford Nanopore (2016)

| Attribute | Detail |
|---|---|
| Patents asserted | **US8673550B2** ("MSP nanopores and related methods") and **US9170230** (same family) — owned by the University of Washington and UAB Research Foundation, exclusively licensed to Illumina in the nucleic-acid-sequencing field. |
| US8673550B2 filing/priority/expiration | Filed 2011-03-22, priority 2008-09-22, granted 2014-03-18, anticipated expiration 2029-09-22. *(Publicly reported, Google Patents.)* |
| What the patents cover | Engineered mutant **MspA** (Mycobacterium smegmatis porin A) nanopores — a *different* pore protein from ONT's current CsgG-based pore, but the one used in ONT's original/early MinION pore design. |
| Filed | February 2016, simultaneously in US District Court (S.D. California) and as a Section 337 complaint at the US International Trade Commission (ITC). *(Publicly reported, contemporaneous trade press: Nature Biotechnology, GenomeWeb, C&EN.)* |
| Outcome | Settled via consent order filed July–August 2016. ONT represented that it had already stopped making/using/selling/importing MspA-pore products in the US, and is **permanently enjoined** from doing so for the life of the patents (i.e., through ~2029). Illumina/co-plaintiffs retain the right to request **up to 5 independent third-party audits** of ONT's US products over the following 10 years (or until the patents expire, whichever comes first) to confirm compliance. |
| Practical effect on today's product line | Low — by the time of the suit, ONT was already transitioning to its CsgG-based pore (§1.1), which is a structurally distinct protein not covered by these MspA claims. The settlement mainly closes off any future return to MspA-based pores in the US. |
| Confidence | High — settlement terms independently reported by GenomeWeb and corroborated by the underlying consent-order description found in multiple secondary sources; original GenomeWeb article returned an access error on direct fetch this pass, so terms are cross-referenced from the search-engine summary of that reporting, not read verbatim — **medium-high confidence on exact audit-count/duration figures specifically**. |

### 2.2 Pacific Biosciences v. Oxford Nanopore (2017–2021, US) — ONT prevailed

| Attribute | Detail |
|---|---|
| Patents asserted | US9546400 ("Nanopore sequencing using n-mers"), US9678056, US9772323, US9738929 — all Pacific Biosciences patents. |
| Filed | 2017, US District Court, District of Delaware. |
| Jury verdict | 2020-03-18: jury found ONT had **infringed** three of the four patents (US9546400, US9678056, US9772323) — but also found those same three **invalid** (lack of enablement on the biology claims; one for obviousness). The fourth patent (US9738929) was found neither infringed nor conclusively valid/invalid. |
| Appeal | PacBio appealed; the Federal Circuit **affirmed the invalidity verdict** in May 2021 (*Pacific Biosciences of California, Inc. v. Oxford Nanopore Technologies, Inc.*, No. 20-2155). |
| Net effect | ONT prevails: infringement is moot once the underlying patents are held invalid, so ONT continues selling its nanopore-sequencing products in the US without restriction from these specific PacBio patents. |
| Confidence | High — jury verdict and Federal Circuit affirmance are both independently and repeatedly reported (GenomeWeb, PacBio's own press release, IPWatchdog, Justia case record, Finnegan law-firm case summary). |

### 2.3 Pacific Biosciences v. Oxford Nanopore (UK/Germany, settled 2018) — time-limited, now lapsed

| Attribute | Detail |
|---|---|
| Forum | UK and German courts (separate from the US Delaware action above). |
| Outcome | Five-year settlement agreement, May 2018: ONT agreed **not to make, use, sell, or import "2D" nanopore sequencing products** in the UK or Germany through the end of 2023; in exchange, PacBio agreed not to assert its patents against ONT or ONT's customers in those jurisdictions during that same window. |
| Relevance today | "2D" (two-direction/two-read, pre-duplex) chemistry is legacy — ONT's current product line runs 1D²-successor "duplex" chemistry (§1.3), a different (later-patented) method, so this restriction is largely moot for current products even before considering that the 5-year window itself **expired 2023-12-31**. **Whether any new UK/German suit has followed since expiration is unavailable in this research pass** — flagged as a gap, not confirmed either way. |
| Confidence | High for the settlement terms and dates (multiple independent trade-press sources: GenomeWeb, PacBio press release, Life Sciences IP Review); low-medium on current (2026) status given no source found addressing the post-expiration period. |

## 3. Reading this table for freedom-to-operate purposes

- ONT's live, enforceable protection on its *own* current pipeline centers on the CsgG pore-mutation family (§1.1, active through 2037–2041), the Hel308 helicase motor-control patent (§1.2, active through 2032), and a broad, actively-extended hairpin-duplex family (§1.3, active through at least 2032 with continuations reaching further).
- The one *proven-enforceable, currently-active* restriction on ONT itself is the 2016 Illumina/UW/UAB MspA injunction (§2.1) — but it targets a pore ONT no longer ships, so it constrains ONT's *option to return to MspA*, not its current product.
- The two PacBio actions (§2.2, §2.3) either resolved in ONT's favor (US) or have lapsed (UK/Germany) — neither currently restricts ONT's shipping product.
- None of the litigation reviewed here involves electrochemical-impedance detection (Proprium's own approach) — ONT's asserted and defended patents are specifically about ionic-current nanopore sensing, a different transduction mechanism. This note does not constitute an assessment of whether any ONT (or UW/UAB/PacBio) claim reads on Proprium's own electrode-impedance method; that would require a dedicated claim-by-claim FTO review by counsel.

## Sources

1. [US10975428B2 — Mutant pore](https://patents.google.com/patent/US10975428B2/en) — Google Patents, primary record.
2. [US12024541B2 — Transmembrane pore consisting of two CsgG pores](https://patents.google.com/patent/US12024541B2/en) — Google Patents, primary record.
3. [US9758823B2 — Enzyme method](https://patents.google.com/patent/US9758823B2/en) — Google Patents, primary record.
4. [US9957560B2 — Hairpin loop method for double strand polynucleotide sequencing](https://patents.google.com/patent/US9957560B2/en) — Google Patents, primary record.
5. [WO2013014451A1 — Hairpin loop method (WO family record, lists US continuations)](https://patents.google.com/patent/WO2013014451A1/en) — Google Patents.
6. [US8673550B2 — MSP nanopores and related methods](https://patents.google.com/patent/US8673550B2/en) — Google Patents, primary record.
7. [US9752188B2 — Duplex consensus sequencing (University of Washington, unrelated to ONT)](https://patents.google.com/patent/US9752188B2/en) — Google Patents, primary record.
8. [Illumina sues Oxford Nanopore for infringing next generation sequencing patents — C&EN, 2016](https://cen.acs.org/articles/94/web/2016/02/Illumina-sues-Oxford-Nanopore-infringing.html)
9. [Illumina and Oxford Nanopore Settle Patent Infringement Lawsuit — GenomeWeb](https://www.genomeweb.com/sequencing/illumina-and-oxford-nanopore-settle-patent-infringement-lawsuit) — direct fetch returned an access error this pass; terms cross-referenced via search-result summary of this reporting, not read verbatim.
10. [Illumina sues Oxford Nanopore — Nature Biotechnology, 2016](https://www.nature.com/articles/nbt0416-360)
11. [Jury Invalidates Pacific Biosciences Patents in Lawsuit Against Oxford Nanopore — GenomeWeb](https://www.genomeweb.com/sequencing/jury-invalidates-pacific-biosciences-patents-lawsuit-against-oxford-nanopore)
12. [Jury invalidates PacBio's patents in U.S. patent trial against Oxford Nanopore — Oxford Nanopore press statement](https://nanoporetech.com/news/news-jury-invalidates-pacbios-patents-us-patent-trial-against-oxford-nanopore)
13. [Federal Circuit Affirms Jury Verdict Invalidating Pacific Biosciences Patents — IPWatchdog, 2021](https://ipwatchdog.com/2021/05/12/federal-circuit-affirms-jury-verdict-invalidating-pacific-biosciences-patents/)
14. [Pacific Biosciences of California, Inc. v. Oxford Nanopore Technologies, Inc., No. 20-2155 (Fed. Cir. 2021) — Justia case record](https://law.justia.com/cases/federal/appellate-courts/cafc/20-2155/20-2155-2021-05-11.html)
15. [Pacific Biosciences Announces Favorable Outcome in UK and German Patent Litigation Against Oxford Nanopore — PacBio press release, 2018](https://www.pacb.com/press_releases/pacific-biosciences-announces-favorable-outcome-in-uk-and-german-patent-litigation-against-oxford-nanopore/)
16. [PacBio, Oxford Nanopore Settle Patent Dispute in Europe — GenomeWeb, 2018](https://www.genomeweb.com/sequencing/pacbio-oxford-nanopore-settle-patent-dispute-europe)
17. Loose, M. et al., "Real-time selective sequencing using nanopore technology," *Nature Methods* 2016 — peer-reviewed, academic origin of Read Until/adaptive sampling.

## Confidence summary

| Claim | Confidence |
|---|---|
| ONT-owned CsgG mutant-pore and tandem-pore patent identity, dates, status | High — primary Google Patents records |
| ONT-owned Hel308 helicase motor-control patent identity, dates, status | High — primary Google Patents record |
| ONT-owned hairpin-duplex patent identity, dates, status | High for the base grant; continuation-family scope/dates beyond the base patent are estimated |
| Adaptive-sampling patent existence | Unavailable — none confirmed in this pass |
| Illumina/UW/UAB v. ONT (MspA) patent identity and settlement terms | High on patents/injunction scope; medium-high on precise audit terms (secondary-source cross-reference) |
| PacBio v. ONT US litigation outcome | High — corroborated across court record, both parties' statements, and independent legal press |
| PacBio v. ONT UK/Germany settlement and current (2026) status | High for 2018 terms; low-medium for whether anything has followed since the 2023 expiration |
