# Illumina — Patent Landscape (Core Sequencing Biology/Chemistry)

Status: reference analysis, researched 2026-07-19. Covers patents on the biology/chemistry pipeline steps described in [[Sequencing by Synthesis (SBS)]] — bridge amplification, reversible-terminator nucleotide chemistry, patterned flow cell/ExAmp, and Tn5 tagmentation library prep. Excludes business-method, informatics/software, and instrument-mechanical patents. See [[Terminology & Metrics]] for shared definitions.

**Disclaimer: this is informational patent-landscape research for Proprium's internal awareness only. It is NOT legal advice and NOT a freedom-to-operate opinion.** Patent claim scope, legal status, and litigation outcomes change continuously (maintenance-fee lapses, reexaminations, IPRs, appeals, new continuations). Any real reliance on this for a freedom-to-operate decision requires review of current claims and full file histories by qualified patent counsel.

## 1. Bridge amplification (solid-phase clonal amplification)

| Patent | Title | Assignee | Filed | Priority | Granted | Status | Expiration |
|---|---|---|---|---|---|---|---|
| US7,115,400 B1 | Methods of nucleic acid amplification and sequencing | Illumina Inc / Illumina Cambridge Ltd | 1999-09-30 | 1998-09-30 | 2006-10-03 | **Expired** (full term) | 2019-09-30 |

- **What it covers:** the original "polony"/bridge-amplification method — template molecules with defined flanking adapter sequences hybridize to primers immobilized on a solid support (glass, silicon, beads, polymer), then repeated hybridize→extend→denature cycles build discrete clonal "colonies" (10,000–100,000/mm²) of a single template, followed by in-situ sequencing by labeled-nucleotide incorporation. This is the direct ancestor of every Illumina bridge-PCR cluster-generation step described in [[Sequencing by Synthesis (SBS)]] §3C.
- **Provenance:** traces to Adessi et al. (Nucleic Acids Research, 2000) at Mosaic Technologies/Manteia, licensed into Solexa, then Illumina. *(Publicly reported, high confidence.)*
- **Current status:** fully expired (20-year utility term from filing) — the foundational bridge-amplification method itself is now in the public domain. Illumina's ongoing protection in this area rests on the newer ExAmp/patterned-flow-cell patents below, not this original patent.

## 2. Reversible-terminator, fluorescently labeled nucleotide chemistry

| Patent | Title | Assignee | Filed | Priority | Granted | Status | Expiration |
|---|---|---|---|---|---|---|---|
| US6,787,308 B2 | Arrayed biomolecules and their use in sequencing | Solexa Ltd | 2001-01-30 | 1998-07-30 | 2004-09-07 | **Expired** (full term) | 2019-07-30 |
| US7,541,444 B2 | Modified nucleotides | Illumina Cambridge Ltd | 2003-08-22 | 2002-08-23 | 2009-06-02 | **Expired** (full term) | 2024-06-20 |
| US7,771,973 B2 | Modified nucleotides | Illumina Cambridge Ltd | 2009-06-01 | 2002-12-23 | 2010-08-10 | **Expired** (full term) | 2023-08-23 |
| US10,480,025 B2 | Labelled nucleotides | Illumina Cambridge Ltd | 2016-07-05 | 2001-12-04 | 2019-11-19 | **Expired** (fee-related lapse) | 2022-08-23 |

- **What they cover:**
  - **US6,787,308** — Balasubramanian and Klenerman's foundational Solexa patent: single-molecule arrays on planar solid supports at densities resolvable by optical microscopy, hairpin self-priming template structures, and stepwise fluorescent-nucleotide incorporation to avoid the phasing problems of earlier high-density arrays. This is the original patent filing describing the SBS concept that founded Solexa in 1998 (acquired by Illumina, 2007).
  - **US7,541,444 / US7,771,973** — the core reversible-terminator chemistry: nucleotides carrying a removable 3′-OH blocking group (allyl or acetal-based) that halts extension after one base, cleavable under mild aqueous conditions (e.g., a water-soluble palladium catalyst for allyl removal) to regenerate a free 3′-OH for the next cycle — precisely the mechanism in [[Sequencing by Synthesis (SBS)]] §3D step 22.
  - **US10,480,025** — labeled-nucleotide chemistry specifically: a base linked to a detectable fluorescent label via a cleavable linker (acid-labile, photolabile, or disulfide), sized to also block further incorporation, with practical incorporation/cleavage demonstrated using Klenow polymerase.
- **Current status:** **all four are now expired.** The foundational reversible-terminator/cleavable-label chemistry that defines classic SBS is in the public domain as of 2024. This matters directly for anyone evaluating freedom-to-operate on reversible-terminator-style chemistry — though newer, later-filed formulations of the same general chemistry (e.g., disulfide-linker variants, XLEAP-generation nucleotides, see §4) may still be under active, later patents even though these founding patents have lapsed.
- **Litigation relevance:** US7,541,444, US7,771,973, and US10,480,025 were the three patents Illumina asserted against BGI/MGI/Complete Genomics in 2019–2020 (see §5) — i.e., these are not just paper patents, they were the actual subject of adjudicated infringement findings before their terms ran out.

## 3. Patterned flow cell manufacturing / exclusion amplification (ExAmp)

| Patent | Title | Assignee | Filed | Priority | Granted | Status | Expiration |
|---|---|---|---|---|---|---|---|
| US8,895,249 B2 | Kinetic exclusion amplification of nucleic acid libraries | Illumina Inc | 2013-03-01 | 2012-06-15 | 2014-11-25 | **Active** | 2033-03-01 |

- **What it covers:** the ExAmp mechanism that underlies Illumina's current patterned flow cells (NovaSeq X, NextSeq 1000/2000, MiSeq i100 — see [[Sequencing by Synthesis (SBS)]] §4): simultaneously transporting library molecules to fixed amplification sites while amplifying faster than new molecules can arrive ("kinetic exclusion"), which suppresses multiple templates from seeding one site and achieves a super-Poisson (>37%) useful-site occupancy versus purely random seeding — directly explaining why patterned flow cells solved the density-vs-purity tradeoff noted in the technology note. A large continuation-patent family exists under the same title (at least US10,808,277; US11,254,976; US11,661,627; US9,758,816; US12,503,726 were identified in this pass but not individually verified — **flagged as unavailable/unverified**, likely later-filed continuations extending protection further into the 2030s–2040s).
- **Current status:** **active**, with roughly 7 years of term remaining as of this research date (2026-07-19). This is the single most commercially load-bearing patent identified in this pass — it protects the specific cluster-generation mechanism Illumina's entire current flagship product line depends on, and it will not expire until 2033. Given the unverified continuation family, actual protection in this specific area plausibly extends well beyond 2033; this should be treated as a floor, not a ceiling, on Illumina's ExAmp-related exclusivity.

## 4. Current-generation (XLEAP-SBS) chemistry

- Illumina's own 2022 launch materials state the NovaSeq X Series/XLEAP-SBS chemistry represents "more than five years of development and more than 40 patent filings" *(publicly reported, Illumina press materials, medium confidence — a round PR figure, not independently itemized)*. No single, clearly-identified core XLEAP-SBS patent was located in this research pass.
- One candidate worth flagging: **US11,085,076 B2** ("Synthesis of novel disulfide linker based nucleotides as reversible terminators for DNA sequencing by synthesis") — filed 2016-09-28, priority 2015-09-28, granted 2021-08-10, **active**, expiring **2037-12-16**. Its assignee is **Columbia University**, not Illumina — this is academic-origin IP (the Ju lab at Columbia has been a long-running source of reversible-terminator and nucleotide-labeling chemistry licensed into the NGS industry, historically to Helicos/Intelligent Bio Systems and others in addition to Illumina). Whether Illumina holds a license to this specific patent, and whether it is actually the chemistry underlying XLEAP-SBS, is **unconfirmed in this pass — label: estimated/unavailable, low confidence.**
- **This whole section should be treated as a known research gap**, not a confirmed absence of newer Illumina-owned chemistry patents — the >40-filing figure strongly implies substantial IP exists that simply wasn't individually surfaced by the searches run in this pass.

## 5. Tn5 transposase tagmentation (library prep)

| Patent | Title | Assignee | Filed | Priority | Granted | Status | Expiration |
|---|---|---|---|---|---|---|---|
| US9,005,935 B2 | Methods and compositions for DNA fragmentation and tagging by transposases | **Agilent Technologies Inc** | 2012-05-11 | 2011-05-23 | 2015-04-14 | **Active** | 2032-05-11 |
| US10,920,219 B2 | Tagmentation using immobilized transposomes with linkers | Illumina Cambridge Ltd / Illumina Inc | 2018-02-20 | 2017-02-21 | 2021-02-16 | **Active** | 2038-12-16 |

- **What they cover:**
  - **US9,005,935** — the core Tn5-tagmentation cofactor/reaction-condition improvements (Mn²⁺/Mg²⁺ cofactor mixes, use of naturally-occurring *Vibrio harveyi*-family transposases at practical concentrations, dual-recognition-sequence tagging, low-salt reaction conditions) that made hyperactive-Tn5 tagmentation commercially practical — this is the mechanism in [[Sequencing by Synthesis (SBS)]] §3B step 5. **Important flag: current USPTO assignee-of-record is Agilent Technologies, not Illumina.** This traces to the technology's Epicentre Biotechnologies origin; Illumina acquired Epicentre in 2011, but this particular patent's chain of title shows Agilent as current owner — meaning Illumina's rights here (license vs. ownership) were **not confirmed in this pass** and should not be assumed to be exclusive Illumina IP. Flag for follow-up.
  - **US10,920,219** — a newer, Illumina-owned refinement: transposome complexes immobilized on a solid support via cleavable (uracil-containing) linkers, reducing off-target contamination and improving insert-size consistency during on-flow-cell tagmentation workflows.
- **Current status:** both active. US10,920,219 (Illumina-owned outright) runs the longest, to 2038.

## 6. Litigation and enforcement history (biology/chemistry-relevant only)

**Illumina v. BGI Genomics / MGI Tech / Complete Genomics / BGI Americas (N.D. Cal., multiple suits 2019–2021)** — *not* an ITC action (correcting an initial assumption going into this research); this was U.S. district court litigation.

- Illumina asserted (among other claims) infringement of **US7,541,444**, **US7,771,973**, and **US10,480,025** — i.e., exactly the reversible-terminator/labeled-nucleotide chemistry patents in §2 above — against BGI's standard sequencing chemistry and its CoolMPS antibody-based chemistry (see [[Research/Jack Research/Competitors/MGI Tech/DNBSEQ (cPAS)]]).
- **June 2020:** U.S. District Court for the Northern District of California granted Illumina a preliminary injunction blocking BGI/MGI/Complete Genomics/BGI Americas/MGI Americas from launching or supplying their sequencing instruments and reagents (including CoolMPS) in the US.
- A jury subsequently awarded Illumina **$8 million** in infringement damages, while also reaching a finding adverse to Illumina on at least one of the asserted patents (reporting characterizes this as "wins jury verdict, loses patent" — the exact patent and invalidity basis were **not independently confirmed in this pass**, but US10,480,025's Google Patents record shows an anomalous "expired — fee-related" status in 2022, notably early relative to its nominal term, which is consistent with, but not confirmed proof of, that patent being weakened or abandoned post-verdict). **Label: estimated/unconfirmed connection, low-medium confidence.**
- A permanent injunction followed, cementing the block on US sales.
- **July 2022 — full settlement:** Illumina agreed to pay Complete Genomics (BGI subsidiary) **$325 million**, resolving all US litigation and appeals. Cross-licensing was part of the deal: BGI granted Illumina a fully paid-up license to six patents/five applications covering BGI's "2-channel" sequencing prep technology; Illumina granted BGI a fully paid-up license to three "image mix" patents/applications. The parties also agreed to a **three-year litigation-peace period** (no new US patent-infringement or antitrust suits against each other or their customers) — on its face this peace period would have lapsed around **mid-2025**, i.e., **it has likely already expired as of this vault's 2026-07-19 research date**, meaning either side is free to resume litigation now. **This is worth actively monitoring, not treating as settled indefinitely.**
- **Separately noted, out of scope for this note but flagged for whoever writes the Element Biosciences patent note:** search results surfaced a distinct, apparently more recent suit, "Illumina Sues Element Biosciences, Alleging Infringement of Flow Cell, Imaging Patents" — not researched further here since Element is a different company's note.

## Confidence summary

| Claim | Confidence |
|---|---|
| Patent numbers, filing/priority/grant dates, legal status, expiration dates (§1–3, §5) | High — pulled directly from Google Patents records, which source USPTO/PAIR data |
| Claims-summary plain-English descriptions | High for mechanism match to the technology note; medium for exhaustiveness (patents have many claims, only independent-claim gist summarized) |
| Continuation-family scope beyond the single verified ExAmp patent (§3) | Low — numbers identified but not individually fetched/verified |
| XLEAP-SBS-specific patent identification (§4) | Low — no confirmed core patent found; Columbia University patent's relevance to Illumina/XLEAP is speculative |
| Agilent (not Illumina) current ownership of US9,005,935 | High for the ownership fact itself (direct from Google Patents); low-medium for what it implies about Illumina's actual freedom to use it (license terms unknown) |
| BGI/MGI litigation timeline, injunction, $325M settlement, cross-license terms | High — corroborated across GenomeWeb, BusinessWire, PYMNTS, Yicai Global |
| Jury verdict "loses patent" connection to US10,480,025's early fee-related expiration | Low-medium — plausible but not directly confirmed in one source |
| Litigation-peace-period lapse (~mid-2025) implication for current (2026-07-19) freedom to sue | Medium — arithmetic from a publicly reported 3-year term is straightforward; whether either party has since acted on it was not researched |

## Sources

1. [US7115400B1 — Google Patents](https://patents.google.com/patent/US7115400B1/en)
2. [US6787308B2 — Google Patents](https://patents.google.com/patent/US6787308B2/en)
3. [US7541444B2 — Google Patents](https://patents.google.com/patent/US7541444B2/en)
4. [US7771973B2 — Google Patents](https://patents.google.com/patent/US7771973B2/en)
5. [US10480025B2 — Google Patents](https://patents.google.com/patent/US10480025B2/en)
6. [US8895249B2 — Google Patents](https://patents.google.com/patent/US8895249B2/en)
7. [US9005935B2 — Google Patents](https://patents.google.com/patent/US9005935B2/en)
8. [US10920219B2 — Google Patents](https://patents.google.com/patent/US10920219B2/en)
9. [History of Illumina Sequencing & Solexa Technology — Illumina](https://www.illumina.com/science/technology/next-generation-sequencing/illumina-sequencing-history.html)
10. [10th anniversary story: Solexa — Cambridge Enterprise](https://www.enterprise.cam.ac.uk/10th-anniversary-story-solexa/)
11. [Illumina Inc. Announces U.S. Federal Court Issues Preliminary Injunction Against BGI Companies — Illumina press release, 2020-06-16](https://www.illumina.com/company/news-center/press-releases/2020/0be08dbc-b1a0-4db8-86a7-32d9bb661420.html)
12. [Court Grants Illumina Permanent Injunction Against BGI — GenomeWeb](https://www.genomeweb.com/sequencing/court-grants-illumina-permanent-injunction-against-bgi-blocking-sale-products-us)
13. [Illumina Wins $8M Jury Verdict in BGI Patent Infringement Suit, Loses Patent — GenomeWeb](https://www.genomeweb.com/sequencing/illumina-wins-8m-jury-verdict-bgi-patent-infringement-suit-loses-patent)
14. [Illumina to Pay $325M Under Settlement With BGI Affiliates — GenomeWeb](https://www.genomeweb.com/sequencing/illumina-pay-325m-under-settlement-bgi-affiliates-ending-multifront-us-legal-battle)
15. [Illumina Settles US Lawsuit by Agreeing to Pay Unit of China's BGI Group USD325 Million — Yicai Global](https://www.yicaiglobal.com/news/china-mgi-gains-usd325-million-as-illumina-settles-gene-sequencer-dispute-in-us)
16. [Illumina Introduces Multiple Breakthrough Sequencing Innovations at Inaugural Genomics Forum — PRNewswire, 2022](https://www.prnewswire.com/news-releases/illumina-introduces-multiple-breakthrough-sequencing-innovations-at-inaugural-genomics-forum-301637320.html)
17. [US11085076B2 — Google Patents](https://patents.google.com/patent/US11085076B2/en)
