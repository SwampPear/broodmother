# GeneMind Biosciences — Patent Landscape (Sequencing Biology/Chemistry)

Status: reference analysis, researched 2026-07-19. Covers patents on the core sequencing **biology/chemistry pipeline** only (amplification, nucleotide chemistry, detection/imaging) — not business-method, software, or corporate patents. See [[SURFseq (Patterned-Array SBS)]] for the technology/pipeline context this note assumes.

**Disclaimer:** this is informational patent-landscape research for Proprium's internal awareness only. It is **not legal advice** and **not a freedom-to-operate opinion**. Patent claims, file histories, and legal status change; any real reliance for Proprium's own design or FTO decisions requires review by patent counsel of the current, complete claim language and prosecution history — not this summary.

## 1. Licensed-technology background (now mostly lapsed)

GeneMind was founded in 2012 as **Direct Genomics**, renamed to GeneMind Biosciences in 2019. Its foundational SURF-seq method (single-molecule sequencing via total internal reflection fluorescence [TIRF] microscopy, surface amplification, and reversible-terminator chemistry) was **originally licensed from Caltech** — the same academic lineage used by the now-defunct Helicos BioSciences. A GeneMind executive is quoted stating "the patents we licensed mostly have already expired." *(Publicly reported, medium confidence — GenomeWeb interview quote; exact licensed patent numbers and expiration dates were not independently confirmed in this research pass — label: unavailable for the specific licensed patent numbers.)* [GenomeWeb, "China's GeneMind Eyes International Market With Fleet of Sequencing Platforms"](https://www.genomeweb.com/sequencing/chinas-genemind-eyes-international-market-fleet-sequencing-platforms)

## 2. GeneMind's own patent portfolio (scale)

GeneMind states it holds **~270–300 patents globally** (mainland China, Hong Kong, Europe, and the US) covering its single-molecule/SBS sequencing technology, with **~20 US patents** issued between 2019 and October 2022 per USPTO records cited in trade press. *(Publicly reported, medium confidence — company-stated portfolio size, not independently counted patent-by-patent in this pass.)* [GenomeWeb](https://www.genomeweb.com/sequencing/chinas-genemind-eyes-international-market-fleet-sequencing-platforms)

## 3. Specific patents identified and verified (Google Patents)

| Patent | Title | Assignee | Filing date | Priority date | Type | Status | Anticipated expiration |
|---|---|---|---|---|---|---|---|
| [US11384390B2](https://patents.google.com/patent/US11384390B2) | Method for controlling base sequence determination, base sequence determination system and control device | Genemind Biosciences Co Ltd | 2017-12-27 | 2016-12-30 | Utility | **Active** | 2037-12-27 |
| [US11512106B2](https://patents.google.com/patent/US11512106B2) | Nucleoside analogue, preparation method and application | Genemind Biosciences Co Ltd | 2020-05-26 | 2017-11-30 | Utility | **Active** | 2038-11-29 (as computed by Google Patents; note this is later than a simple filing+20yr calc, likely reflects a continuation/divisional priority chain not fully resolved in this pass) |
| [US2019/0011365A1](https://patents.google.com/patent/US20190011365A1) (granted 2019-11-19; granted US patent number not independently confirmed this pass) | Total internal reflection fluorescence imaging system and sequencing device | Genemind Biosciences Co Ltd | 2016-09-06 | 2015-09-07 | Utility | **Active** | 2036-09-06 |

All three: *(publicly reported, high confidence for the bibliographic/status data — sourced directly from Google Patents, which mirrors USPTO records; medium confidence for the claims summaries below, which are this research pass's own plain-English reading of machine-summarized claim text, not a full independent legal claim-construction.)*

### What each protects (plain English, tied to pipeline steps)

- **US11384390B2 — sequencing instrument control/scheduling.** Not a chemistry patent — it claims a *system-level method* for running the fluidics ("fluid device") and imaging ("optical device") on separate reaction components in parallel/staggered fashion, so the expensive camera/optics subsystem stays busy while chemistry runs on another chip region. This overlaps with pipeline step "cycle-by-cycle sequencing-by-synthesis" (§C/D in the parent note) at the level of *instrument scheduling*, not the chemistry itself.
- **US11512106B2 — reversible-terminator-style nucleoside analogues.** Claims modified nucleoside compounds carrying a group that blocks further polymerase extension until removed (reversible termination), pre-attached to fluorescent dyes (Alexa Fluor/ATTO/Texas Red families) and/or biotin affinity tags. This is squarely GeneMind's own composition-of-matter claim on the labeled nucleotide chemistry used in the SBS cycle (pipeline step: "sequencing-by-synthesis cycle," fluorescent labeled nucleotide + terminator).
- **US2019/0011365A1 — TIRF multi-laser imaging optics.** Claims the physical optical architecture (multiple independent laser light paths at different wavelengths, shared camera, autofocus via a secondary LED path) used to image single-molecule/clustered fluorescent signal at each cycle. Pipeline step: "detection" (imaging).

## 4. The nearby risk this note was specifically asked to check: Illumina overlap

The existing [[SURFseq (Patterned-Array SBS)]] note already flags that GeneMind's chemistry is architecturally close to Illumina's bridge-amplification SBS, and speculates about IP risk without evidence. This pass looked for two kinds of evidence and found:

- **No confirmed Illumina v. GeneMind litigation.** A targeted search for "Illumina GeneMind patent lawsuit litigation" returned no matches naming GeneMind; the only sequencing-industry Illumina patent suits that surfaced were **Illumina v. Element Biosciences** (US and German actions, flow-cell/fluid-storage/instrument-design patents; Element won a German ruling against Illumina) — a different company, not GeneMind. *(Publicly reported, medium-high confidence in the negative finding, but absence of a hit in this search pass is not proof no dispute exists — GeneMind is a smaller, more China-domestic company than Element, and a dispute confined to Chinese courts might not surface in English-language trade press search.)*
- **Illumina does hold a current, live bridge-amplification patent that is broad enough in subject matter to matter here.** [US11667953B2](https://patents.google.com/patent/US11667953B2), "Methods and compositions for cluster generation by bridge amplification," assignee **Illumina Cambridge Ltd**, filed 2019-12-03, priority 2018-12-05 — i.e., a *recent* filing, not an old expiring one, likely enforceable into the late 2030s. This is illustrative of the general risk category (Illumina actively continues to file new bridge-amplification patents, not just rely on its original 2000s-era Solexa patents), not proof that this specific patent reads on GeneMind's HyEND process — a real infringement determination requires comparing this patent's actual claims against GeneMind's actual process, which is outside the scope of this research pass. *(Publicly reported bibliographic data, high confidence; the risk inference itself is reasoned/estimated, not a legal conclusion — low-medium confidence as an FTO signal.)*

**Net read:** unresolved. GeneMind's own patents found in this pass (§3) cover its labeled-nucleotide chemistry and imaging optics, not the bridge/cluster-amplification step itself — no GeneMind-owned patent was found specifically claiming its patterned-array bridge/"HyEND" amplification method. Combined with Illumina's continuing pattern of filing new bridge-amplification patents, this leaves the amplification step as the most plausible area of latent overlap risk, but with **no evidence of it having been tested in litigation** as of this research pass.

## 5. Gaps and things not found

- No patent specifically covering "HyEND" surface-amplification chemistry by name was located and confirmed as GeneMind-assigned in this pass — GeneMind's marketing material states the >80% well-utilization/2× cluster-density claim but does not cite a patent number, and the general patent-portfolio searches surfaced GeneMind's control-system, nucleotide-chemistry, and optics patents but not one explicitly matching "HyEND" by title. Labeled **unavailable**, not confirmed absent.
- Full ~270–300-patent portfolio was not enumerated patent-by-patent (out of scope for the search budget available); the three patents in §3 are representative, verified examples, not an exhaustive list.
- Chinese (CNIPA)-only filings, which likely make up the bulk of GeneMind's portfolio given its China-domestic base, were not systematically searched in this pass beyond what English-language Google Patents indexing surfaced — jurisdiction matters because a CNIPA-only patent is not independently enforceable against a US entity absent a corresponding US family member.

## Sources

- [GenomeWeb, "China's GeneMind Eyes International Market With Fleet of Sequencing Platforms"](https://www.genomeweb.com/sequencing/chinas-genemind-eyes-international-market-fleet-sequencing-platforms) — portfolio size, Caltech licensing history, Direct Genomics rename. Trade press, medium-high confidence.
- [GenomeWeb, "China's GeneMind Biosciences Launches GenoCare 1600 Single-Molecule Sequencer"](https://www.genomeweb.com/sequencing/chinas-genemind-biosciences-launches-genocare-1600-single-molecule-sequencer) — company/product background.
- Google Patents: [US11384390B2](https://patents.google.com/patent/US11384390B2), [US11512106B2](https://patents.google.com/patent/US11512106B2), [US20190011365A1](https://patents.google.com/patent/US20190011365A1), [US11667953B2](https://patents.google.com/patent/US11667953B2) — primary bibliographic/legal-status source for all patent data in this note.
- WebSearch results for "Illumina GeneMind patent lawsuit litigation" (no GeneMind-specific matches found; Element Biosciences litigation surfaced instead — see [Element Responds to Illumina Patent Litigation](https://www.elementbiosciences.com/element-biosciences-responds-to-illumina-patent-litigation) and [GenomeWeb coverage of the German ruling](https://www.genomeweb.com/sequencing/element-biosciences-scores-win-against-illumina-german-patent-lawsuit), included here only as evidence of what *was* found when checking for GeneMind-specific disputes).

## Confidence summary

| Claim | Confidence |
|---|---|
| Caltech licensing origin, "mostly expired" quote, Direct Genomics → GeneMind rename | Medium-high — single trade-press source |
| Portfolio size (~270–300 global, ~20 US) | Medium — company-stated, not independently counted |
| Bibliographic/legal-status data for the 3 patents in §3 | High — Google Patents primary source |
| Claims summaries (plain-English) for the 3 patents | Medium — this pass's own reading of claim/abstract text, not full independent claim construction |
| No confirmed Illumina–GeneMind litigation | Medium — absence of a hit in this search pass, not a confirmed negative |
| Illumina's US11667953B2 as a general overlap-risk signal | Low-medium — illustrative, not a claim-by-claim infringement analysis |
