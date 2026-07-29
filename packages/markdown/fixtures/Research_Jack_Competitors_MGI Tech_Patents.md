# MGI Tech / Complete Genomics — Pipeline-Relevant Patents

**Disclaimer:** This note is informational patent-landscape research for Proprium's internal awareness only. It is **not legal advice** and **not a freedom-to-operate opinion**. Patent claim scope, validity, and enforceability are legal determinations that require review of full file histories and current claim language by qualified patent counsel before any reliance for design, sourcing, or litigation-risk decisions. See [[Patent Plan]] for how this vault treats IP matters generally.

Status: research pass compiled 2026-07-19. Scope: patents covering the core **biology/chemistry pipeline steps** described in [[copyå/Research/Jack Research #2/Competitors/MGI Tech/DNBSEQ (cPAS)]] — rolling-circle amplification and DNA-nanoball formation, the patterned-array substrate, cPAL/cPAS sequencing chemistry, and CoolMPS antibody-based detection. Business-method, instrument-mechanical, and software/base-calling-algorithm patents outside this biology/chemistry scope are excluded except where a base-calling patent is inseparable from the chemistry it enables (see cPAL entry below). Confidence and source labels follow the vault convention: *(publicly reported / independently verified / calculated from reported data / estimated / unavailable)*.

## 1. Rolling-circle amplification & DNA-nanoball array architecture

These three patents are the foundational Complete Genomics, Inc. (pre-2013 BGI acquisition) filings that together describe DNB formation via rolling-circle amplification and the patterned-array substrate DNBs are loaded onto — the physical basis of [[copyå/Research/Jack Research #2/Competitors/MGI Tech/DNBSEQ (cPAS)]] steps 4–10.

| Patent | Title | Assignee | Filed | Priority | Granted | Status | Anticipated expiration |
|---|---|---|---|---|---|---|---|
| [US7910354B2](https://patents.google.com/patent/US7910354) | Efficient arrays of amplified polynucleotides | Complete Genomics, Inc. | 2007-10-29 | 2006-10-27 | 2011-03-22 | Active | 2028-09-07 |
| [US8445194B2](https://patents.google.com/patent/US8445194) | Single molecule arrays for genetic and chemical analysis | Complete Genomics, Inc. | 2006-06-13 | 2005-06-15 | 2013-05-21 | Active | 2027-05-31 |
| [US7960104B2](https://patents.google.com/patent/US7960104) | Self-assembled single molecule arrays and uses thereof | Complete Genomics, Inc. | 2006-09-29 | 2005-10-07 | 2011-06-14 | Active (expiration date implies active status; explicit legal-status field not returned by source — *estimated*) | 2027-11-10 |

*(All: publicly reported, Google Patents, high confidence on the bibliographic data; claim-scope summaries below are AI-generated readings of the claims, not verified against full file histories.)*

**What they protect, in plain terms:**
- **US7910354** — two-stage amplification: rolling-circle replication of a circular DNA template into a concatemer in solution, then a second amplification step depositing/growing that concatemer on a capture-probe-coated array surface so each resulting cluster occupies one optically resolvable spot. This is the core "circle → concatemer → surface-bound cluster" logic underlying DNB formation and array loading.
- **US8445194** — single-molecule arrays built from concatemers attached to a surface via capture oligonucleotides, at defined densities (claims specify e.g. nearest-neighbor spacing exceeding 50 nm) enabling optical resolution of individual molecules — the patterned-array substrate itself.
- **US7960104** — self-assembly of polynucleotide concatemers onto a surface into an addressable array through random deposition plus decoding, rather than pre-defined lithographic placement — a broader/alternative array-construction claim set than US8445194, likely providing layered coverage over the same physical structure.

Together, these three cover the RCA-to-DNB-to-patterned-array chain end-to-end. All three remain active through 2027–2028 (utility-patent 20-year terms from their mid-2000s filing dates, undisturbed by any adjustment found in this pass).

## 2. cPAL — combinatorial Probe-Anchor Ligation (superseded chemistry, still patented)

cPAL is the original, ligation-based sequencing chemistry Complete Genomics used before the shift to the polymerase-based cPAS chemistry current DNBSEQ instruments use (see [[copyå/Research/Jack Research #2/Competitors/MGI Tech/DNBSEQ (cPAS)]] §Platform profile for the historical/discontinued framing). It remains separately patented and the patent remains active, even though the chemistry itself is no longer MGI's current product.

| Patent | Title | Assignee | Filed | Priority | Granted | Status | Anticipated expiration |
|---|---|---|---|---|---|---|---|
| [US8617811B2](https://patents.google.com/patent/US8617811B2/en) | Methods and compositions for efficient base calling in sequencing reactions | Complete Genomics, Inc. | 2009-01-28 | 2008-01-28 | 2013-12-31 | Active | 2030-08-01 |

**What it protects:** combinatorial probe-anchor **ligation** methods that distinguish the four bases using shared-label probe sets (e.g., one dye, a second dye, both together, or no label) rather than one distinct label per base — reducing reagent/optical complexity during the ligation-based read-out cycle. This is chemistry-inseparable base-calling logic (the labeling scheme is a property of the probe set, not a downstream software step), which is why it's included despite touching "base calling" in its title. *(Publicly reported, medium-high confidence on scope reading — not independently verified against full claims.)*

**Gap flagged:** a distinctly separate "cPAS-specific" patent (covering the polymerase-driven combinatorial probe-anchor **synthesis** method that replaced cPAL, roughly 2013–2015) was not isolated with a specific patent number in this research pass — it likely exists within the same Complete Genomics/MGI patent family but was not pinned down within the search budget for this note. **Label: unavailable, flagged for follow-up.**

## 3. CoolMPS — antibody-based unlabeled-nucleotide detection

| Patent | Title | Assignee | Filed | Priority | Granted | Status | Anticipated expiration |
|---|---|---|---|---|---|---|---|
| [US10851410B2](https://patents.google.com/patent/US20180223358A1/en) (published as US20180223358A1, granted as US10851410B2) | Stepwise sequencing by non-labeled reversible terminators or natural nucleotides | MGI Tech Co., Ltd. | 2018-01-04 | 2017-01-04 | 2020-12-01 | Active | 2038-06-13 |

**What it protects:** sequencing-by-synthesis using **unlabeled** reversible-terminator nucleotides (no dye attached to the nucleotide itself), with base identity read out via an affinity reagent — antibody or aptamer — that binds the incorporated, still-blocked base after incorporation, rather than via a dye cleaved from the nucleotide. This is the core CoolMPS mechanism described in [[copyå/Research/Jack Research #2/Competitors/MGI Tech/DNBSEQ (cPAS)]] §CoolMPS chemistry variant. Claims cover the nucleotide-analog structures, the affinity-detection step, and "sequential and combinatorial probe anchor sequencing methods" broadly enough that it may also provide some coverage over cPAS-style detection generally, not just the CoolMPS variant specifically — *estimated reading, not verified against full claim language*.

This is MGI's newest and longest-lived patent in this set (active to 2038, filed 2017 vs. the Complete-Genomics-era array patents filed 2005–2009), consistent with it being the newest chemistry generation. *(Publicly reported, high confidence on bibliographic data; medium confidence on the claim-scope interpretation above.)*

## 4. Illumina v. BGI / Complete Genomics / MGI patent litigation

This litigation is directly relevant to "what protects others from using" MGI's pipeline steps, because it is the one instance where a third party's (Illumina's) patents were actually asserted, tested, and ultimately resolved against MGI's own chemistry in a US court — a real-world test of the freedom-to-operate question, not just a list of who owns what. **This is a separate legal track from the BIOSECURE Act/1260H regulatory exposure already documented in [[copyå/Research/Jack Research #2/Competitors/MGI Tech/DNBSEQ (cPAS)]] §Regulatory & geopolitical positioning — that is export/procurement-control law, not patent law; the two happened to overlap in time but are legally unrelated.**

**Timeline** *(publicly reported, cross-checked across GenomeWeb, Illumina/BGI press materials, and Yicai Global reporting)*:
- **2019-06 / 2020-02**: Illumina filed patent-infringement suits in the US District Court for the Northern District of California against BGI Genomics, MGI Tech Co., Ltd., Complete Genomics Inc., BGI Americas Corp., and MGI Americas Inc.
- **2020-06**: A preliminary injunction was granted, blocking BGI/MGI-affiliated entities from distributing, promoting, or selling their sequencing instruments and reagents — including the CoolMPS chemistry specifically — in the US. The injunction was based on five Illumina Cambridge Ltd. patents (below).
- **2021-12**: A jury verdict produced a mixed result — Illumina won an infringement verdict on some claims (~$8M) while other asserted Illumina patent claims were invalidated in the same proceeding. Separate reporting (Life Sciences IP Review) describes a later/related verdict of roughly $333M in BGI's favor; **sources found in this pass do not cleanly reconcile the sequence and relationship between the $8M and $333M figures — treat both as directionally real but flag the exact procedural relationship between them as unconfirmed, medium-low confidence.**
- **2022-07**: Global settlement — Illumina agreed to pay **$325 million** to Complete Genomics/BGI, ending all outstanding US litigation (at least four district-court cases and four Federal Circuit appeals) and antitrust claims between the parties. Illumina also granted BGI a **fully paid-up license to two-color sequencing** chemistry. No admission of liability by any party. The settlement included a **three-year litigation ceasefire (no new US patent-infringement or antitrust suits between the parties or their customers) running until 2025-10-01.**
- **Post-2025-10-01 status: unavailable in this research pass.** The ceasefire's expiration date has already passed as of this note's compilation date (2026-07-19); whether either party has filed new claims since is **not confirmed** here — flagged as a priority follow-up item given its direct relevance to MGI's current US freedom-to-operate posture.

**The five Illumina patents that formed the basis of the 2020 injunction — all now expired:**

| Patent | Title | Assignee | Filed | Priority | Legal status | Expired |
|---|---|---|---|---|---|---|
| [US7541444B2](https://patents.google.com/patent/US7541444) | Modified Nucleotides | Illumina Cambridge Ltd | 2003-08-22 | 2002-08-23 | Expired | 2024-06-20 |
| [US7566537B2](https://patents.google.com/patent/US7566537) | Labelled nucleotides | Illumina Cambridge Ltd | 2005-12-13 | 2001-12-04 | Expired | 2023-01-22 |
| [US7771973B2](https://patents.google.com/patent/US7771973) | Modified nucleotides | Illumina Cambridge Ltd | 2009-06-01 | 2002-12-23 | Expired | 2023-08-22 |
| [US9410200B2](https://patents.google.com/patent/US9410200) | Labelled nucleotides | Illumina Cambridge Ltd | 2015-09-17 | 2001-12-04 | Expired (fee-related) | 2022-08-23 |
| [US10480025B2](https://patents.google.com/patent/US10480025) | Labelled nucleotides | Illumina Cambridge Ltd | 2016-07-05 | 2001-12-04 | Expired (fee-related) | 2022-08-23 |

*(All: publicly reported, Google Patents, high confidence on bibliographic/status data.)* All five cover reversible-terminator/cleavable-dye-linker nucleotide **composition of matter** — i.e., the chemical structure of a labeled or blockable nucleotide, not any one company's specific instrument architecture. **Key takeaway: regardless of how the litigation itself resolved, the specific composition-of-matter claims that were the legal basis for blocking BGI/MGI's US sales in 2020 have all independently expired by mid-2024** (most trace priority to a 2001–2002 filing, consistent with the ~20-year utility term). This means that particular patent barrier no longer exists for MGI or any other company as of this note's compilation date — though this does **not** mean MGI's current-generation chemistry (CoolMPS, cPAS) is automatically clear of *other*, newer Illumina patents not part of this specific 2020 injunction; no such newer-patent search was performed in this pass.

## Sources

- Google Patents entries for all patents listed above (patents.google.com), accessed 2026-07-19 — publicly reported, high confidence on bibliographic/legal-status data.
- GenomeWeb: "Court Grants Illumina Permanent Injunction Against BGI, Blocking Sale of Products in US"; "US Federal Court Judge Rules BGI Sequencing Chemistries Infringe Illumina Patents"; "Illumina Wins $8M Jury Verdict in BGI Patent Infringement Suit, Loses Patent"; "Illumina to Pay $325M Under Settlement With BGI Affiliates, Ending Multifront US Legal Battle" — trade press, accessed 2026-07-19.
- Illumina press releases / investor relations, 2020 (preliminary injunction announcements) — illumina.com, investor.illumina.com.
- Yicai Global, "Illumina Settles US Lawsuit by Agreeing to Pay Unit of China's BGI Group USD325 Million" — trade press.
- Life Sciences IP Review, "BGI wins $333m in DNA patent suit with Illumina" — trade press; figure not independently reconciled against the GenomeWeb $8M figure in this pass, see caveat above.
- OPUS IP, "Illumina v MGI Part 2: Has the UK lost its way on the doctrine of equivalents?" — UK patent-law commentary, referenced for awareness that a parallel UK proceeding also occurred; not detailed in this note (US-focused scope).
- MGI Tech / Complete Genomics press materials on CoolMPS licensing (Swiss Rockets AG agreement, 2025) — noted for context that MGI actively licenses CoolMPS IP to third parties, consistent with treating US10851410B2 as a commercially active, enforced asset rather than a defensive-only filing.

## Confidence summary

| Claim | Confidence |
|---|---|
| Bibliographic data (filing/priority/grant/expiration dates) for all 9 patents listed | High — sourced directly from Google Patents |
| Claim-scope plain-English summaries | Medium — AI-generated reading of claims/abstracts, not verified against full prosecution history or a patent attorney's construction |
| Litigation timeline through the 2022-07 settlement | High — cross-corroborated across multiple independent trade-press sources |
| $8M vs. $333M verdict figures and their procedural relationship | Low-medium — sources not fully reconciled in this pass |
| Post-2025-10-01 litigation-ceasefire status | Unavailable — not researched in this pass, flagged as a follow-up priority |
| Existence of a distinct cPAS-specific (vs. cPAL/CoolMPS) patent | Unavailable — not isolated in this pass, flagged as a follow-up item |
