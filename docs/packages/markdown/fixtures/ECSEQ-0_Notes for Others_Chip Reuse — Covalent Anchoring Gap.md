# Chip Reuse — Covalent Anchoring Gap

**2026-07-22** · found while working through the between-run regeneration mechanism with Jack. Not legal advice.

**Severity: 🔴 — undermines the reuse/cost thesis, which the whitepaper calls a cost lever ~unique to ECSEQ ([[Whitepaper|§2.2]]).**

## What

[[Whitepaper|§2.2]]'s between-run regeneration describes reuse as: a denaturing strip (dilute NaOH or formamide) that "removes the amplified DNA... while leaving the thiol-Au anchor and backfill layer intact," resetting the surface to its pre-loading state for the next run.

This doesn't hold as written. Bridge amplification means every strand in a cluster grows directly off a surface-tethered primer — the primer *becomes* the covalent 5′ end of the new strand. Extension is attachment; there's no separate step where the strand merely hybridizes on rather than growing on. A denaturing wash only melts base-pairing (hydrogen bonds) between the two strands of a duplex — the same thing that already happens mid-amplification every "denature → re-anneal → extend" cycle. It does not, and cannot, break the covalent phosphodiester backbone connecting the extended strand back to its primer.

So after a strip, every primer on the lawn is still covalently attached to last run's (now single-stranded) synthesized strand — not bare, not hybridization-ready. The surface isn't actually reset to "pre-loading state," contrary to what the current text claims.

**Precedent that surfaces the fix, and its limit:** Illumina's actual surface-release mechanism isn't a denaturing wash at all — it's a chemically cleavable base built into the primer (e.g. uracil + USER enzyme, or a periodate-cleavable diol), positioned mid-primer, that gets cut on purpose. But mid-primer placement (Illumina's placement) removes the primer's own 3′ hybridization tail along with the released strand — that specific primer molecule can't rehybridize a new library fragment afterward. Fine for Illumina (used once or twice per flow cell, then discarded); not sufficient on its own for ECSEQ's 50–100-run reuse claim, which needs the *same* primer molecule to survive many independent load/strip cycles.

## Potential solutions surfaced so far

1. **Exonuclease digestion with a protected stub.** A processive exonuclease loaded onto the free end of the extended strand chews back toward the surface; a nuclease-resistant backbone modification (e.g. phosphorothioate linkages) placed near the primer's anchor-proximal end stalls digestion there, leaving a defined, hybridization-ready stub. Mild aqueous conditions, no exotic reagents, plausibly tens of minutes. Precedented technique class (phosphorothioate exo-protection is standard).
2. **Junction-positioned cleavable linker.** Same concept as Illumina's cleavable base, but moved to the very last position before synthesis starts (the primer/extension junction) rather than mid-primer. Cleaving there releases the entire synthesized amplicon while leaving the *whole* original hybridization-competent primer intact — no lost tail. Reuse then only needs a light "re-cap" step (enzymatically or chemically re-installing one fresh cleavable terminal base) rather than full re-priming. Never touches the Au–S bond, so — if it works — it wouldn't consume any of the thiol-anchor's own 50–100-run survival budget; reuse count would instead be gated by however many times the cap-and-cleave chemistry itself degrades (uncharacterized).
3. **Photocleavable spacer at the same junction position, UV-triggered instead of enzyme/reagent-triggered.** Commercially available photocleavable phosphoramidite spacers exist for this. Preferred over a reducing-agent-triggered linker (e.g. disulfide + DTT/TCEP) because DTT/TCEP-class reducing agents are *already* flagged elsewhere in the whitepaper ([[Whitepaper|§2.2]]) as thiol-competing conditions that can strip monothiol primers off gold — a reducing-agent cleave-trigger would fight anchor stability unless paired with a multidentate anchor (see below). UV avoids that conflict: no added reagent that can touch the Au–S bond, and fast (seconds–minutes).
4. **Ruled out:** centrifugation (no mechanism to rupture a single covalent bond), heat (backbone-cleavage temperatures are far above where the Au–S bond and primer sequence itself degrade), cold (no activation energy supplied), bulk sonication (real cleavage mechanism, but random-position, imprecise, and risks damaging the array).

None of 1–3 are qualified on ECSEQ's actual stack — all untested, same status as the rest of the reuse mechanism.

## Practicality caveat, separate from the physics gap

Even a working cleave mechanism needs to be weighed against *why* reuse is attractive at all. Back-of-envelope (not vault-sourced — no chip fab cost or reagent cost is documented anywhere yet): a redeposition-style regeneration runs ~2.5–4 hrs wall clock (mostly passive SAM-formation/backfill incubation) and ~$35–150 in labor, dominated by tech time, not reagent cost (reagents run cents to a few dollars per cycle — a single custom thiol-oligo synthesis order covers hundreds of chip-equivalents). If new chips end up priced in the tens-of-dollars range (plausible, given the whitepaper's own flat-panel/display-fab cost-class comparison, not CMOS), the *dollar* case for reuse is marginal — and the *throughput* case cuts against it outright for any customer buying ECSEQ specifically for its sub-hour-genome turnaround speed. The junction-cleave approaches above are attractive partly *because* they'd cut that 2.5–4 hr regen window down to a light cap-and-cleave step — worth scoping the actual turnaround time of options 1–3 against a full redeposition cycle once any of them is bench-qualified, since that turnaround is what decides whether reuse is worth marketing broadly or only to a throughput-tolerant, cost-sensitive segment (e.g. core facilities running batches overnight) rather than to everyone.

## Multidentate / trithiol anchor — related, already proposed, cross-referenced here

Separate issue, same section of the whitepaper: independent of whether the covalent-DNA-clearing gap above gets solved, the *anchor bond itself* (Au–S) has its own finite reuse budget — a monothiol primer forms one Au–S bond per strand, and losing that one bond releases the whole strand. [[Whitepaper|§2.2]] already proposes (dated 2026-07-19, `Status: PROPOSAL`) swapping to a **multidentate (trithiol) anchor** — a primer terminated in two or three thiol groups that chelate the gold at multiple points, so one bond failure doesn't release the strand — citing precedent of trithiol-capped oligonucleotides surviving thiol-competing conditions (e.g. DTT) that strip monothiol-anchored strands. Also tracked in [[Patent Plan]] (surface-reuse claims are explicitly gated on bench chemistry qualification) and [[ECSEQ/IP & Patents/Patent Landscape & FTO Analysis]].

Flagging it here because it interacts directly with item 3 above: if a reducing-agent-triggered cleavable linker is ever chosen over the photocleavable route, it should be paired with the trithiol anchor upgrade, not the monothiol baseline — otherwise the cleave-trigger reagent itself becomes a second, independent anchor-failure mode on top of ordinary thiolate desorption/oxidation. Nothing new to propose on the anchor itself here — just noting the two open items aren't independent and should be qualified together, not separately, once hardware is available.

## Do this

**Owner: whoever owns bench chemistry qualification (unassigned as of this note).** Before the reuse claim is written into anything customer- or investor-facing beyond its current `PROPOSAL`/"mechanism, not yet a measurement" framing: (1) confirm the between-run strip does *not* actually reset primers to a bare, hybridization-ready state as currently described, and correct [[Whitepaper|§2.2]]'s language; (2) scope and bench-test at least one of the junction-cleave options above against a plain redeposition cycle, on both turnaround time and reuse-count-per-chip; (3) if a reducing-agent-based cleave trigger is chosen, qualify it jointly with the trithiol anchor upgrade rather than the monothiol baseline.

---

*Internal working notes, confidential. Not legal advice. See [[Notes for Others]].*
