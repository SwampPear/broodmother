# Poisson Loading Occupancy Cap — Main Fix + Fallbacks

**2026-07-22** · consolidates [[Whitepaper ↔ Patent Draft Discrepancies|Discrepancy #2]] with the loading-mechanism discussion from 2026-07-21/22. Not legal advice.

**Severity: 🔴 — directly cuts the flagship throughput number if unaddressed.**

## What

Unpatterned random loading — dilute library flowed over the array, hoping for sparse single-fragment landing — is capped by Poisson statistics at **~1/e ≈ 37% single-occupancy**, no matter how dilute the library gets; the rest of the pixels come up empty or polyclonal and get excluded downstream. [[Whitepaper ↔ Patent Draft Discrepancies|Discrepancy #2]] already flagged that [[Whitepaper|§4.1.4]]'s throughput math was treating all ~225M pixels as usable — corrected, usable ≈ 83M px, which drops the flagship "~36-minute genome" to **~72 minutes** at a single pass.

## Current main solution — active-bias loading

Apply a transient bias at a target pixel during loading to locally increase capture rate there, reusing the same row/column addressing already built for EIS readout ([[Provisional Patent Application No. 1 — Filing Copy|patent claim 19]]; [[Whitepaper|§2.3]]). Framed as close to zero-incremental-component since no new hardware block is required.

**Status: untested.** [[Patent Plan]]'s IP tracking table already carries this exact line: *"Active-bias loading protocol... Untested — capture-rate gain at ECSEQ's geometry/ionic strength and its interaction with the SAM are unknown."* Gated on single-pixel hardware validation, same as everything else load-bearing.

**Key physical risk, surfaced 2026-07-21/22:** Debye screening. In a bridge-amplification-strength buffer (tens–100+ mM salt), the Debye length is ~0.3–1 nm — a DC/quasi-static bias's field reaches almost no distance at all. That's fine for a *simple on/off capture* behavior at a single pixel (well-precedented — electrophoretic DNA deposition onto electrodes is a mature technique), but the patent's own claim language — bias "relative to unbiased neighboring pixels" — implies *fine steering* between neighbors ~2 µm apart, which the same screening physics makes much less likely to work as a simple DC bias. These are two different bars, and the mechanism hasn't been tested against either yet.

## Fallbacks under consideration

**Status: PROPOSAL, dated 2026-07-22 — neither is in the whitepaper yet, both need vetting before being written in.**

1. **Dedicated low-ionic-strength loading buffer**, used only during the loading step, buffer-exchanged to full amplification strength afterward (the design already has a comparable exchange step — the between-run denaturing strip). Lower salt → longer Debye length → field reaches farther. Tradeoff to check: DNA hybridization efficiency and secondary structure both degrade at very low ionic strength, so there's presumably a workable range rather than "as dilute as possible," and nobody has scoped it.
2. **Switch from DC/electrophoretic bias to AC dielectrophoresis (DEP).** Avoids the electrolysis risk of sustained DC in an ionic buffer (bubbles, pH shift, electrode damage — on the same surface meant to be reused 50–100 times), and gives a frequency-tunable capture mechanism. Mostly reuses the existing AC signal generator/addressing chain already built for the EIS sweep, so electronics cost is modest — but DEP needs field *gradients*, which usually wants sharper/shaped electrodes than the current flat ~1 µm² pad, and single-DNA-molecule DEP (vs. the cells/beads DEP is usually used on) is its own less-mature regime. Real engineering work, not a free swap.

## Do this

**Owner: whoever runs the single-pixel loading experiment.** Decide up front whether active-bias loading is being validated against the *simple on/off capture* bar or the *pixel-to-pixel discrimination* bar the current claim language implies — they have very different odds of working as a plain DC bias, and the experiment and the claim should agree on which one is being tested.

---

*Internal working notes, confidential. Not legal advice. See [[Notes for Others]].*
