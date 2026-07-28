# Roche — Sequencing-Pipeline Patent Landscape

Status: reference research, compiled 2026-07-19. Covers patents on the core **biology/chemistry** of Roche's three sequencing technologies — [[Sequencing by Expansion (SBX)]] (current), 454 pyrosequencing (discontinued 2016), and Genia nanopore technology (2014 acquisition) — not business-method, software, or unrelated Roche IP. Confidence and source labels follow the vault convention: *(publicly reported / independently verified / calculated from reported data / estimated / unavailable)*.

**Disclaimer: this is informational patent-landscape research for Proprium's internal awareness only. It is NOT legal advice and NOT a freedom-to-operate opinion.** Patent status, claim scope, and ownership can change (maintenance-fee lapses, reexamination, IPR, litigation, continuations). Any actual freedom-to-operate or design-around decision must go through patent counsel review of current file histories and claims — see [[Patent Plan]] for Proprium's own filing process.

## 1. SBX / Xpandomer (current — AXELIOS 1)

Originated at **Stratos Genomics, Inc.** (Seattle), acquired by Roche in 2020 and folded into Roche Sequencing Solutions. See [[Sequencing by Expansion (SBX)]] §3 for the corresponding pipeline steps (X-NTP polymerization → Xpandomer synthesis → nanopore readout).

| Patent | Title | Filing date | Priority date | Grant date | Assignee (current) | Status | Anticipated expiration | What it covers |
|---|---|---|---|---|---|---|---|---|
| **US 7,939,259 B2** | High Throughput Nucleic Acid Sequencing by Expansion | 2008-06-19 | 2007-06-19 | 2011-05-10 | Roche Sequencing Solutions Inc (reassigned from Stratos Genomics 2023-11-01) | **Active** | **2029-01-03** | The foundational SBX patent — template-directed synthesis of a DNA copy using tethered "expandable" nucleotide subunits (X-NTPs), selective cleavage to expand the constrained copy into a linear, spatially-decompressed "Xpandomer," and detection (including nanopore-based) of the reporter-coded Xpandomer. This is the core claim covering the pipeline step "convert DNA into an Xpandomer and read it." |
| **AU 2020224663 B2** / **US 17/445,284** (family incl. **CA 3131115A1**, **EP 3927869A4**) | Methods, Compositions, and Devices for Solid-State Synthesis of Expandable Polymers for Use in Single-Molecule Sequencing | 2020-02-20 (AU); US application filed 2021-08-17 | 2019-02-21 | AU granted 2022-12-08 | F. Hoffmann-La Roche AG (originally Stratos Genomics Inc, reassigned 2023-11-23) | **Active** (AU granted); **US application status: pending/active as of this research pass — not yet confirmed granted** | AU: **2040-02-20** (anticipated) | A second-generation, narrower patent covering *how the Xpandomer is manufactured on a solid substrate* rather than the base chemistry: surface-grafted linker chemistry (maleimide/alkyne on polyolefin substrates), "end-capping" to select full-length Xpandomer copies, and tandem "mirrored library" copies within one Xpandomer molecule to improve accuracy. This is the patent most likely to cover AXELIOS 1's actual manufacturing process, as opposed to the 2011 patent's broader foundational chemistry claim. |

**Confidence note:** these two are the clearest, most citable finds; Stratos Genomics/Roche almost certainly holds additional continuation and improvement patents (detection-hardware, reporter-code chemistry variants, basecalling) not exhaustively catalogued here — labeled **unavailable** pending a full assignee-name patent-database search, which was outside this pass's budget.

## 2. 454 Pyrosequencing (discontinued 2016) — now expired, informative baseline

454 Life Sciences Corporation (founded by Jonathan Rothberg, acquired by Roche 2007) combined emulsion-PCR bead amplification with luciferase-based pyrophosphate detection. See the [[Sequencing by Expansion (SBX)]] note §8 for the discontinuation history.

| Patent | Title | Filing date | Priority date | Grant date | Assignee | Status | Expiration | What it covers |
|---|---|---|---|---|---|---|---|---|
| **US 7,323,305 B2** | Methods of Amplifying and Sequencing Nucleic Acids | 2004-01-28 | 2003-01-29 | 2008-01-29 | 454 Life Sciences Corporation | **Expired** | **2024-11-12** | The integrated pipeline patent: single-stranded library prep (fragmentation, end-polishing, adapter ligation), bead-emulsion clonal amplification (>3,000 microreactors/µL), and pyrophosphate sequencing on a "PicoTiter plate" (75 pL wells) read by CCD camera. This is the core patent that once covered the entire 454 pipeline end-to-end. |
| **US 8,012,690 B2** | Bead Emulsion Nucleic Acid Amplification | 2007-10-31 | 2003-01-29 | 2011-09-06 | 454 Life Science Corp | **Expired** | **2024-01-28** | Narrower continuation covering the water-in-oil emulsion clonal-amplification step specifically (one template + one bead per microreactor, magnetic bead enrichment, >1,000,000 clonal copies/bead) — the same "bead emulsion" mechanism Ion Torrent's Ion Sphere Particles and (with a different amplification chemistry) other bead-based platforms also had to design around or license. |

**Key finding: both core 454 patents are now expired** (as of late 2024) — the foundational emulsion-PCR-plus-pyrosequencing pipeline is in the public domain. This is a directly actionable data point: it means the *specific* claimed mechanisms in these two patents (that exact bead-emulsion/pyrophosphate combination) no longer constrain new entrants, though any given new platform's actual bead-amplification implementation should still be checked against its own risk (e.g., Ion Torrent's Ion Sphere Particle patents are separate — see the Thermo Fisher/Ion Torrent note in this vault) rather than assumed clear by analogy.

## 3. Genia Nanopore Technology (2014 acquisition, current status: patents active but no announced product)

Genia Technologies, Inc. (Mountain View, CA, founded 2009) developed a semiconductor-integrated nanopore array using "NanoTag" chemistry — a cleavable, tagged-nucleotide approach where a label (not the growing DNA strand itself) transits the pore, developed in part from research at UC Santa Cruz (Mark Akeson's lab) and Columbia/Harvard collaborators. Roche acquired Genia in 2014 for $125M cash plus up to $225M in milestones. See [[Sequencing by Expansion (SBX)]] §8 — the existing note flags Genia's ultimate product fate as unclear; **this patent research resolves the IP side of that question, though not the product side.**

| Patent | Title | Filing date | Priority date | Grant date | Assignee (current) | Status | Anticipated expiration | What it covers |
|---|---|---|---|---|---|---|---|---|
| **US 9,377,437 B2** | (Nanopore-based single-molecule characterization: acquiring/holding/progressing electrical stimulus to trap and ratchet a molecule through a nanopore, recording ionic-current signatures, reverse-stimulus "rewind" for repeat reads) | 2014-10-14 | 2010-02-08 | 2016-06-28 | Roche Sequencing Solutions, Inc. (transferred from Genia Technologies Inc via merger, 2023-09-22) | **Active** | **2030-02-08** | Genia's core nanopore-trapping/ratcheting mechanism — voltage-controlled capture and controlled translocation of a molecule through a nanopore with reverse-stimulus re-reads. Structurally the same category of claim (electrical control of translocation speed) that Roche's own SBX design deliberately engineers around by using a discrete, voltage-paced Xpandomer instead of raw DNA — worth noting as a plausible reason SBX's translocation-control approach differs from Genia's. |

**Litigation/ownership history (materially affects how "settled" this IP actually is):** The Regents of the University of California sued Genia co-founder Roger Chen and Genia Technologies (N.D. Cal. Case No. 3:16-cv-07396), alleging Chen developed the core nanopore-trapping inventions as a UC Santa Cruz graduate student in Mark Akeson's lab and was contractually obligated to assign them to UCSC, not Genia — naming four patents and one pending application (US 8,324,914; US 8,461,854; US 9,041,420; US 9,377,437; and application 15/079,322) as improperly assigned. *(Publicly reported, high confidence — GenomeWeb, IPWatchdog, and UC's own reporting.)* The parties reached a settlement (reported by Science/AAAS, 2017); this research pass could not independently access the full settlement terms (the source article returned an HTTP 403), but **the fact that US 9,377,437 is confirmed still assigned to Genia→Roche as of the 2023 merger indicates the settlement did not strip Genia/Roche of ownership** — treat this as the practical outcome, with the precise terms **unavailable**, confidence medium.

**Product-status caveat:** despite this active, unencumbered-looking patent estate, no Genia-branded or Genia-derived product has shipped under Roche as of this research date — Roche's shipping nanopore-adjacent product is SBX (a chemically distinct approach, §1 above), not Genia's NanoTag mechanism. Whether Roche is actively practicing the Genia patents, holding them defensively, or has quietly discontinued that program is **unavailable** from public sources in this pass.

## Sources

- [US7939259B2, Google Patents](https://patents.google.com/patent/US7939259B2/en) — accessed 2026-07-19.
- [AU2020224663A1, Google Patents](https://patents.google.com/patent/AU2020224663A1/en) — accessed 2026-07-19.
- [Patents Assigned to Stratos Genomics, Inc., Justia](https://patents.justia.com/assignee/stratos-genomics-inc) — accessed 2026-07-19.
- [US7323305B2, Google Patents](https://patents.google.com/patent/US7323305) — accessed 2026-07-19.
- [US8012690B2, Google Patents](https://patents.google.com/patent/US8012690B2/en) — accessed 2026-07-19.
- [US9377437B2, Google Patents](https://patents.google.com/patent/US9377437B2/en) — accessed 2026-07-19.
- [GenomeWeb, "University of California Files Suit Against Genia Cofounder"](https://www.genomeweb.com/sequencing/university-california-files-suit-against-genia-cofounder) — accessed 2026-07-19.
- [IPWatchdog, "University of California seeks assignment of nanopore patents from former grad student"](https://ipwatchdog.com/2017/03/26/university-california-assignment-patents-former-grad-student/id=79687/) — accessed 2026-07-19.
- [Science/AAAS, "Companies settle gene technology patent fight that was shrouded in mystery"](https://www.science.org/content/article/updated-companies-settle-gene-technology-patent-fight-was-shrouded-mystery) — headline/existence confirmed via search snippet; full article returned HTTP 403, content not independently verified.
- [BioProcess Online, "Roche Acquires Genia Technologies For DNA Sequencing Platform"](https://www.bioprocessonline.com/doc/roche-acquires-genia-technologies-for-dna-sequencing-platform-0001) — accessed 2026-07-19.

## Confidence summary

| Claim | Confidence |
|---|---|
| US7939259B2 dates, assignee, active status, 2029 expiration | High — Google Patents primary record |
| AU2020224663 family dates/status/2040 expiration; US 17/445,284 application number | Medium — Google Patents primary record for AU; US application grant status not confirmed |
| 454 patents (US7323305, US8012690) now expired | High — Google Patents primary record, both independently confirmed expired |
| US9377437B2 dates, Roche/Genia assignment chain, 2030 expiration | High — Google Patents primary record, explicitly shows 2023 merger reassignment |
| UC Regents v. Genia/Chen lawsuit occurred, patents named | High — multiple independent trade-press/legal sources |
| Settlement terms and practical resolution | Medium — settlement's occurrence is well-reported, exact terms unavailable; ownership outcome inferred from current assignee record, not the settlement text itself |
| Genia/NanoTag current product status under Roche | Low — no primary source found confirming active vs. dormant program |
