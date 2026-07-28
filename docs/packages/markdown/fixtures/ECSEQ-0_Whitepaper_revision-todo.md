# Whitepaper Revision TODO — YC Application Pass

*Scope: [[Whitepaper]] + [[Appendix]] only, judged as the technical credibility document behind the YC application. Not a science review — [[Whitepaper Review]] already covers whether the physics is sound (verdict: it is, high-risk). This is about whether the document does its job for the reader it will actually have: a partner who skims for 5 minutes, and a technical advisor they forward it to who reads for 40.*

**The one-line summary:** the science is honest and defensible, but the document is optimized for a reviewer who wants to find holes, not for a reader deciding whether to bet. Three structural things are missing (exec summary, competitive table, accuracy roadmap), four internal inconsistencies will be caught by any careful reader, and the core narrative — *AI is the instrument, the chip is cheap and fixed* — is in CLAUDE.md but almost absent from the paper.

---

## P0 — Blocking. Fix before anyone outside the company reads this.

### 1. Add a one-page executive summary at the top
The paper is ~57 KB before the appendix. There is no place a reader gets the whole thesis with numbers in under a minute. Add, before §1:

- The claim in three sentences (label-free, wash-free, natural bases, impedance readout, neural basecaller).
- A **status table**: what is built, what is simulated, what is assumed. Three columns, ~10 rows. This single table does more for credibility than any amount of in-line hedging, and it lets you *remove* hedging from the body (see #9).
- The headline numbers: 76.7% per-event, 89.6% per-base (simulated), 2 µm pitch, ~36 min time-to-genome at full scale, 50–100 run reuse.
- One sentence on what the next experiment is and what would kill the project.

### 2. Resolve the faradaic-axis contradiction
[[Appendix]] §C header says **"not yet in the simulator"**, while §5 and §6 report a faradaic branch, a 12-point 20–90 Hz sub-band, and a full faradaic-on vs. dual-branch ablation (76.7% vs 54.5%). These cannot both be true. A technical reader hits this and stops trusting the numbers.
- Update the §C status line to reflect that the axis *is* simulated and ablated, and that what remains unvalidated is the physical band assignment and the polymerase-fidelity cost of elevated bias.

### 3. State the accuracy target and the path to it
89.6% per-base is presented with no reference point. Illumina is ~99.9% per-base. A reader who knows sequencing will assume the project is off by two orders of magnitude and stop. The whitepaper never states the ≥99% production target that CLAUDE.md does, and never explains the two mechanisms that close the gap.
- Add a short §6 subsection: **"From 89.6% to production."** Name the levers explicitly — (a) ensemble/consensus over ~1000 copies per cluster and over coverage depth, which is the standard route every platform uses and which §6 currently defers entirely to "hardware-validation stage"; (b) a fourth discrimination axis for the C↔T residual; (c) model capacity and training scale.
- Compute at least a first-order consensus estimate now, even crudely. "Per-base 89.6%, and at 30× coverage a naive independent-error consensus gives X" is a number a partner can hold onto. Leaving it uncomputed reads as avoidance.

### 4. Reconcile the three accuracy units
The document uses per-event, per-base, and per-read without ever defining them together, and the numbers across documents do not line up: §6 reports 89.6% per-base, Appendix §F.1 reports per-read ~0.54–0.65 for what appears to be the same pipeline, and [[Whitepaper Review]] states "88% is per-read."
- Define all three in [[Definitions]] and use them consistently.
- Explain why per-read is so much lower than per-base (it is the product over the read — say so), or the F.1 numbers look like a contradiction of §6.

### 5. Fix the dwell-time inconsistency
Shortest dwell is given as **66 ms** (§4D, Appendix §D.1/D.3) and **75 ms** (Appendix §B.2, §C). Both are used to derive frequency floors. Pick one, propagate it, and re-derive the 15–30 Hz and ~100 Hz floors from it.

### 6. Regenerate or remove the outdated figures
Three admitted defects, all visible to the reader:
- §5 `[!todo]`: architecture graphic is outdated.
- §4C `[!todo]`: bridge-amplification figure missing, but the caption for it is already in the text.
- §5B confusion-matrix caption: *"Figure pending regeneration; the version currently shown is the dual-branch baseline."*

Shipping a figure the caption says is wrong is worse than shipping no figure. Regenerate, or cut the figure and keep the numbers in prose.

---

## P1 — High leverage. These are what make it persuasive rather than merely correct.

### 7. Add a competitive comparison table
The comparison to Illumina, Ion Torrent, ONT, PacBio, Element, and MGI is spread across §2, §4C, §4E, and §7 as prose. There is no single place to see how ECSEQ compares. Add one table in §2 or §7:

| Platform | Readout | Labels | Wash cycles | Consumable | Accuracy | Instrument cost |
|---|---|---|---|---|---|---|

Fill ECSEQ's row with honest projections marked as such. This is the highest-ratio addition in the document — it is the table a partner screenshots.

### 8. Make the cost argument quantitative
Reuse (50–100 runs) is the actual business wedge and the paper asserts it three times without ever computing a $/genome or a per-run consumable cost. §4B even makes the sharp point that surface prep is per-run for competitors and per-reuse-cycle here — then never multiplies it out.
- Add a short cost subsection or appendix section: consumables per run, amortized surface cost, readout BOM at the chosen (N_ADC, M) operating point, and resulting $/genome under stated assumptions.
- The throughput analysis (Appendix §D) is excellent and rigorous. There is no cost analysis of comparable quality, and cost is the more load-bearing claim commercially.

### 9. Concentrate the hedging instead of distributing it
The honesty is the document's strongest asset and should not be reduced — [[Whitepaper Review]] correctly calls it out as rare. But right now nearly every paragraph in §4 carries its own caveat clause, so a skim reads as "nothing here works." Same information, better structure:
- Move every "this is a modeling assumption / untested / proposed" claim into a single **Assumption Register** table (claim, status, evidence, what would validate it, section reference).
- Body prose then states the architecture confidently and cites the register. Nothing is hidden — it becomes *more* auditable, not less, because a reader can see all the open assumptions in one place and count them.

### 10. State the AI-as-instrument thesis explicitly
This is the company's core narrative — the hardware is deliberately cheap and fixed, the model is the instrument, and every improvement in model capability improves the instrument without a new chip. It is in CLAUDE.md. It is nearly absent from the whitepaper, which reads as a sensor paper with an ML backend rather than an AI-instrument paper with a sensor front end.
- Put it in §1 as a stated design principle, and close §7 on it.
- It is also the direct answer to "89.6% isn't good enough": the number improves with model work, not with a fab cycle. That reframing is worth more than any single experimental result in the paper.

### 11. Clarify which device the numbers describe
Appendix §D computes throughput for a **900 mm² active area, 225 M pixels**. CLAUDE.md describes ECSEQ-1 as **~1.92 × 1.92 mm, ~960×960 pixels**, and the prototype as **4 pixels**. The whitepaper never states which device its numbers apply to, so a reader cannot tell whether the 36-minute genome is the product or a wafer-scale extrapolation.
- Add an explicit scaling ladder early: 4-pixel validation chip → ECSEQ-1 (~1 M pixels) → full-scale array (225 M pixels), with what each is for and which numbers belong to which.

### 12. Add simulator provenance
Every number in §6 comes from the simulator, and the paper never says where the simulator's parameters came from. [[Whitepaper Review]] flags this as near-circular, correctly. The defense is available and just isn't written down.
- Add a §6 subsection listing the simulator's key parameters, each tagged with its source: literature-derived, measured, or estimated. The count of "estimated" parameters is the honest measure of circularity, and stating it preempts the criticism far better than the current generic caveat.

### 13. Reconcile the molecular-axis band
§4D defines the molecular axis as **10–100 kHz** (Au high-frequency tail). §5B says the molecular branch spans the **full 100 Hz–100 kHz** sweep, overlapping the kinetic branch entirely. Either the model deviates from the physical decomposition on purpose — in which case say why — or one of the two is wrong.

---

## P2 — Cuts and polish.

### 14. Cut or relocate the patent-expiry survey
§4C (Clonal Amplification) spends a full paragraph on US expiry dates for bridge amplification and rolling-circle families, plus a three-caveat paragraph disclaiming it. This belongs in [[ECSEQ/IP & Patents/Patent Landscape & FTO Analysis]], not the technical paper. In the whitepaper it reads defensive and dates the document. Replace with one sentence + a link.

### 15. Compress §4C prep
Fragmentation, adapter attachment, and tagmentation are borrowed, well-characterized chemistry — the section says so itself. It currently gets more space than the electrochemical signature, which is the actual novelty. Compress to a paragraph, keep the point that prep dominates the time budget (that is a real and non-obvious finding), and move the ligation-vs-tagmentation comparison to the appendix.

### 16. Fix §3 sectioning
"then the physical origin of the base-specific impedance signature and the three axes along which it separates the bases (§4 as well)" — the roadmap paragraph points twice at §4. Split §4D into its own numbered section or fix the roadmap.

### 17. Missing number cross-reference
Appendix §D.4 refers to "the ~15% R_ct shift of §4D." §4D does not state a 15% figure anywhere. Add it there, or correct the reference.

### 18. Name consistency
"ECSEQ" and "ECSEQ-1" are used interchangeably across the vault. Decide whether ECSEQ is the method and ECSEQ-1 the product, then apply that consistently.

### 19. Add a data and code availability statement
For a company whose thesis is that AI is the instrument, publishing the simulator and the basecaller repo is a credibility multiplier and costs nothing — the code exists (`data/`, `dodgson/`). One line at the end of §6.

### 20. State the experimental read length
§6 never says how long the simulated reads were. CLAUDE.md says 100-cycle sequences, while §5C describes ~500-cycle capacity and Appendix §D assumes L = 427–500 for the throughput model. If accuracy was measured at 100 cycles and throughput assumes 500, that gap needs stating — dephasing makes accuracy read-length-dependent, so a 500-cycle accuracy number is not implied by a 100-cycle one.

### 21. Put numbers on the next experiment
§7 says the immediate future work is hardware but gives no cost, no timeline, and no thresholds. [[Risks & Kill-Criteria]] has the pre-registered go/no-go framing the review recommends — surface a summary of it into §7 as a table: experiment, cost, duration, pass threshold. "We know exactly what we're building next, what it costs, and what result would make us stop" is one of the strongest signals a technical founder can send in a YC application, and it is currently invisible in this document.

---

## What not to change

- **The epistemic posture.** Restructure the caveats (#9); do not soften them. The clear separation of measured / simulated / assumed is the most credible thing in the document and is genuinely uncommon.
- **Appendix §D (readout scaling).** It is the strongest section in either file — it takes a 34-million-front-end objection, dismantles it, and lands on a buildable design with an honest SNR tradeoff. It is the best evidence the team can do real engineering analysis. Leave it alone and consider referencing it more prominently from the body.
- **§2 Related Work.** Well-grounded, correctly positioned, and precise about what is and is not precedent.

---

# Carried engineering & regeneration debt

*Migrated 2026-07-24 from `whitepaper/plans/` before that directory was deleted. The plans' prose edits (4, 6, 11, 12, 14) were folded into [[Whitepaper]] and [[Appendix]] on this date, bringing the vault up to and past where the deleted `whitepaper.tex` had reached (measured short30-k1b: 71.2% per-base / Q5.4, 50.1% per-event, G 98.8%, T the error sink; ablation numbers withdrawn). The **vault is now the source of truth** — the plans' "source of truth is whitepaper.tex" premise is void. What remains below is everything from the plans that is NOT prose and so could not be folded in.*

## Deferred model / simulator work (do not retrain without surfacing the decision)
- **Phase-spread simulator rework (plan 1 §5).** The simulator still implements the *attrition* bound (deletes a binomial fraction of copies, survivors perfectly in phase), not the per-copy random-walk *phase spread* of [[Appendix]] §E.2. The §6 caveat states this. Reworking it and re-measuring will move the headline accuracy — this is the open retrain-adjacent item.
- **Faradaic-off ablation at L=30 (plan 4).** Required before any paired with/without-faradaic *per-event* number returns to the paper; until then §5B/§6 keep it qualitative and the old 76.7%/54.5% pair stays withdrawn.
- **Accuracy-vs-L sweep / short10 run (plan 4).** Accuracy is reported at L=30 only; a length sweep (and the fig12 accuracy-vs-L curve) awaits a short-read run at other L. STOP before any retrain.
- **CTC / transducer rewrite (plan 7 §B).** Free-running frame stream + segmenting decoder; changes the learning problem (variable output length, indel modes), post-hardware, its own retrain. §A (honest-limitation prose) already in the paper.
- **Consensus with a correlated-error model (plan 4).** Calibration is already measured (ECE 0.045, in §5D); consensus accuracy under a correlation-aware model is still to compute (§6 caveat says so).
- **Plan 1 §6 downstream:** `data/CLAUDE.md` preset read lengths, dodgson's 500-cycle transformer context, and the per-cycle CV kill-criterion.

## Number / figure regeneration (from scripts, not by hand)
- **One-run back-end converter count (plan 12).** [[Appendix]] §D.3/§D.4 currently state the ~2,200 mm² one-run back end *qualitatively* ("far larger, not buildable as described, an open architecture problem"). The specific figures the plan carried (~1.6 M converters, ~9.7×10⁸ concurrent slots, and a 29× vs 51× ratio the plan itself flagged as inconsistent) must be regenerated from `dodgson/scripts/whitepaper_throughput.py` and reconciled before any specific number is stated.
- **NovaSeq areal-rate comparison (plan 5).** Unsourced; a flow-cell area could not be verified. Verify before using it anywhere.
- **fig13-quality.png (plan 4).** Exists in the surviving `whitepaper/whitepaper/figures/` but was never promoted to `proprium-docs/attachments/whitepaper-quality.png`; promote it and embed after the "Quality scores and mappability" paragraph in §6.

## Edits to files outside Whitepaper/Appendix
- **[[Risks & Kill-Criteria]]:** add "per-base accuracy insufficient to map at the achievable read length" as an explicit kill criterion (threshold from the §6 acc^L table), plus the per-cycle-CV criterion (plan 1 §6).
- **[[ECSEQ/IP & Patents/Patent Landscape & FTO Analysis]]:** check Roswell WO2017132567A1 against the FTO analysis (plan 10 §6).
- **[[Throughput & Competitive Landscape]]:** add Ultima to the competitive landscape (plan 10 §6).

## Discretionary honesty items (were SKIP as literal errata — the wrong strings weren't in the vault)
- **Channel-count comparison (plan 11 item 3).** [[Appendix]] §D.2 says the back end is "an order of magnitude below the channel count of the largest deployed nanopore systems" — still a single-back-end-vs-aggregate-deployment comparison. Consider the honest per-flow-cell (~2,675-channel) framing or an explicit multi-flow-cell qualifier.
- **Full-spec-die single-run yield (plan 11 item 1).** The vault never held this figure. If wanted, at L=30 it is PL = 921,600 × 30 = 0.028 Gb (η=1) — a *new addition*, not an erratum.

## YC narrative (plan 13) — largely superseded
Plan 13 (draft the YC narrative from the corrected paper: lead with the compute-curve insight and the targeted-panel wedge, never lead with a genome number) was **partially realized 2026-07-24** in the business docs: [[Business Plan]] and [[YC Application (Draft)]] were reframed to the EIS-array-plus-AI-instrument thesis with short-read DNA panels as the first commercial application. Remaining YC work lives in [[YC Application (Draft)]]'s placeholders (co-founder bios, founder video, revenue math, entity/investment status).
