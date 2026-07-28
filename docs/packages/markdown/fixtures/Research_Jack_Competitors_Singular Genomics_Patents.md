# Singular Genomics — Patent Landscape (Pipeline Biology/Chemistry)

Status: reference analysis, researched 2026-07-19. Covers patents on the core sequencing biology/chemistry described in [[Sequencing by Synthesis (G4)]] and [[In Situ Sequencing (G4X)]] — reversible-terminator SBS chemistry, cycle mechanics, flow-cell amplification, and in situ multiomic detection. Excludes business-method, UI/software, and non-pipeline instrument patents. Confidence and source labels follow the vault convention: *(publicly reported / independently verified / calculated from reported data / estimated / unavailable)*.

**Disclaimer:** This is informational patent-landscape research for Proprium's internal awareness only. It is **not legal advice** and **not a freedom-to-operate (FTO) opinion**. Patent status (active/expired/lapsed), claim scope, and litigation outcomes change and can only be reliably assessed by patent counsel reviewing current file histories, maintenance-fee status, and claim construction. Do not rely on this note for any filing, design-around, or FTO decision without counsel review — see also [[Patent Plan]].

## 1. Patents assigned to Singular Genomics Systems, Inc.

| Patent | Title | Filed | Priority date | Granted | Status | Est. expiration |
|---|---|---|---|---|---|---|
| [US 11,225,688 B2](https://patents.google.com/patent/US11225688B2/en) | Methods for long read sequencing | 2020-12-18 | 2019-12-23 | 2022-01-18 | Active *(publicly reported)* | 2040-12-18 (calculated, 20 yr from filing) |
| [US 11,591,647 B2](https://patents.google.com/patent/US11591647B2/en) | Nucleic acid sequencing-by-synthesis (SBS) methods that combine SBS cycle steps | 2018-03-06 | 2017-03-06 | 2023-02-28 | Active *(publicly reported)* | 2038-11-25 as stated by Google Patents — earlier than a simple filing+20yr calc would give, likely reflecting an earlier-filed parent application in the same family; not independently reconciled, medium confidence |
| [US 12,258,623 B2](https://patents.google.com/patent/US20230203570A1/en) (from published application US2023/0203570A1) | Multiomic analysis device and methods of use thereof | 2023-03-02 | 2021-05-05 | 2025-03-25 | Active *(publicly reported)* | 2042-05-04 (as stated by Google Patents) |

All three: utility patents *(publicly reported, high confidence — patent type is stated on each record)*.

**What each protects, tied to the pipeline (§9 in [[Sequencing by Synthesis (G4)]]):**

- **US 11,225,688 — long-read method.** Protects alternating "sequencing cycles" (labeled reversible-terminator incorporation + imaging) with "dark"/limited-extension cycles (unlabeled reversible-terminator nucleotides added without imaging, to advance multiple bases at once), plus the reagent kits (nucleotides with cleavable label + reversible 3′ block) and reaction mixtures needed to run this alternating scheme. This is squarely a claim on *how G4 extends effective read length* beyond a naive one-base-imaged-per-cycle SBS process — a direct pipeline-step patent, not a peripheral one.
- **US 11,591,647 — combined-cycle-step method.** Protects overlapping/combining what are normally sequential SBS cycle sub-steps (base incorporation, imaging, and "chase" completion of unextended strands) so cycle time drops from a conventional ~5–30 min to a claimed ~1–20 min. This is the mechanism behind G4's marketed "<3 minutes per SBS cycle" figure (see [[Sequencing by Synthesis (G4)]] §Platform profile) — i.e., the patent appears to cover the specific engineering reason G4 can run faster cycles than a conventional reversible-terminator instrument.
- **US 12,258,623 (app. US2023/0203570A1) — multiomic device.** Protects an integrated in situ device/method for parallel RNA + protein detection within intact tissue while preserving spatial/morphological context, including microplate-format reaction-chamber hardware paired with optical detection. This is the closest Singular-owned patent to the G4X in situ pipeline (§ padlock-probe hybridization → RCA → cyclic imaging → spatial reconstruction in [[In Situ Sequencing (G4X)]]), though it claims the *device/system-level integration* of RNA+protein detection rather than the padlock-probe/RCA chemistry itself (see §3 below — that underlying chemistry is decades-old, expired, external IP).

## 2. Notable third-party patent this pipeline may implicate

| Patent | Title | Assignee | Filed | Priority date | Granted | Status | Est. expiration |
|---|---|---|---|---|---|---|---|
| [US 8,895,249 B2](https://patents.google.com/patent/US8895249B2/en) | Kinetic exclusion amplification of nucleic acid libraries | **Illumina, Inc.** | 2013-03-01 | 2012-06-15 | 2014-11-25 | Active | 2033-03-01 |
| [US 11,254,976 B2](https://patents.google.com/patent/US11254976B2/en) | Kinetic exclusion amplification of nucleic acid libraries (same family) | **Illumina, Inc.** | 2019-08-19 | 2012-06-15 | 2022-02-22 | Active | 2033-09-28 |

**Why this is flagged here rather than under Illumina's own patent note:** [[Sequencing by Synthesis (G4)]] §Platform profile states, quoting Singular's own technical materials, that G4's on-flow-cell clonal amplification uses **"kinetic exclusion amplification of nucleic acid libraries"** — which is not a generic scientific term but the exact title and claimed mechanism of Illumina's US 8,895,249 patent family (the same technology Illumina markets as "ExAmp" and uses on NovaSeq X, see [[Research/Jack Research/Competitors/MGI Tech/DNBSEQ (cPAS)]] and [[Sequencing by Synthesis (SBS)]] for cross-references). Whether G4's actual amplification chemistry falls inside these claims, uses a licensed variant, or is a non-infringing design-around cannot be determined from public marketing language alone — that requires claim-by-claim analysis of Singular's actual reaction chemistry against the granted claim language, which is outside the scope of this research pass. **Flagged explicitly as a claim-overlap risk signal, not a finding of infringement — low-medium confidence, reasoned from vocabulary match rather than technical/legal analysis.**

**Related competitive-intelligence signal (not about Singular directly):** Illumina sued **Element Biosciences** in Delaware (2023) alleging infringement of flow-cell and imaging patents — a different company with an architecturally different (avidity-based) chemistry, but it shows Illumina actively enforces its flow-cell/amplification patent estate against new entrants in this exact competitive tier. No Singular Genomics–Illumina litigation was found in this research pass — *absence of evidence, not evidence of absence*; confidence low that this means no dispute exists or will arise. See [[Instrument & Market Comparison]] and the forthcoming Element Biosciences patent note for the Illumina v. Element case detail.

## 3. Foundational prior art underlying G4X (now expired — public domain)

| Patent | Title | Original assignee | Priority date | Granted | Status | Expiration |
|---|---|---|---|---|---|---|
| [US 7,074,564 B2](https://patents.google.com/patent/US7074564B2/en) | Rolling circle replication of padlock probes | Ulf Landegren (Uppsala) → Landegren Gene Technology AB → Olink AB → Sigma-Aldrich | 1998-03-25 | 2006-07-11 | **Expired** | 2020-02-20 |

**Why this matters:** the core padlock-probe hybridization + circularization + rolling-circle-amplification mechanism that G4X's in situ chemistry is built on (see [[In Situ Sequencing (G4X)]] §Pipeline, steps 5–7) traces to foundational academic work from the Landegren lab in the late 1990s, commercialized through Olink and eventually acquired into Sigma-Aldrich's IP estate. **That foundational patent expired 2020-02-20 and is now public domain** — meaning the base padlock/RCA mechanism itself is broadly freely usable industry-wide (which is consistent with multiple companies — Singular/G4X, 10x Genomics' in situ products, academic labs — independently building on it without a common license). Singular's own patentable contribution here is the specific device/system integration (§1, US 12,258,623) and any G4X-specific probe-design or multiomic-combination methods, not the base chemistry.

## 4. Company/IP lineage note

Singular Genomics Systems, Inc. appears in some older patent-assignment records under the earlier name **Singular Bio, Inc.** *(publicly reported — a distinct "Singular Bio Inc." assignee entry exists in patent databases; treat as the company's pre-rename entity pending independent confirmation, medium confidence)*. Several Singular co-founders and named inventors (including CEO/founder-level personnel) previously worked at Illumina — a background fact relevant to interpreting §2's terminology overlap as plausibly originating from shared technical lineage/know-how rather than coincidence, though this is **reasoning, not a documented legal finding** about any specific patent or license.

## 5. What was not found in this research pass

- No confirmed Singular Genomics–Illumina litigation (patent infringement suit, IPR, or license announcement) — *unavailable*.
- No independent (non-Google-Patents, non-Justia) verification of the exact claim scope for any patent above — claim summaries here are drawn from AI-assisted reads of the public patent record, not from a patent attorney's claim chart. **Treat all "what it protects" language as directional, not authoritative.**
- Reversible-terminator *chemistry* (the specific nucleotide/dye/blocking-group compounds G4 uses, as opposed to the *cycle-method* patents in §1) was not conclusively identified as Singular-owned or third-party-licensed in this pass — a plausible but unconfirmed candidate family exists (Singular-assigned nucleotide-chemistry applications were referenced in search results but not individually verified); flagged as a gap for future research rather than included here unverified.

## Sources

- Google Patents records: [US11225688B2](https://patents.google.com/patent/US11225688B2/en), [US11591647B2](https://patents.google.com/patent/US11591647B2/en), [US20230203570A1 / US12258623B2](https://patents.google.com/patent/US20230203570A1/en), [US8895249B2](https://patents.google.com/patent/US8895249B2/en), [US11254976B2](https://patents.google.com/patent/US11254976B2/en), [US7074564B2](https://patents.google.com/patent/US7074564B2/en) — all accessed 2026-07-19, publicly reported, high confidence for the dates/status/assignee fields as displayed on each record.
- [Justia Patents — Patents Assigned to Singular Genomics Systems, Inc.](https://patents.justia.com/assignee/singular-genomics-systems-inc) — accessed 2026-07-19, used to identify the broader portfolio (imaging systems, modified polymerases, sample-handling devices) not individually detailed above as outside the pipeline-biology scope of this note.
- ip fray / GenomeWeb / GEN, "Illumina Sues Element Biosciences...," 2023 coverage — used only as competitive-intelligence context in §2, not as a source about Singular directly.

## Confidence summary

| Claim | Confidence |
|---|---|
| Singular-owned patent dates, status, assignee (§1) | High — primary Google Patents records |
| Plain-English claim summaries (§1, §2, §3) | Medium — AI-assisted reading of claims/description, not a legal claim chart |
| "Kinetic exclusion amplification" terminology match to Illumina's patent (§2) | Medium — vocabulary/mechanism match is clear; whether G4's actual chemistry falls within the claims is unconfirmed |
| No Singular–Illumina litigation found | Low-medium — absence of evidence in this search pass, not a confirmed clean bill |
| Padlock-probe/RCA foundational patent expired 2020 (§3) | High — stated directly on the patent record |
