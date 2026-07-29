# Risks & Kill-Criteria

*Ranked failure analysis and the single-pixel go/no-go design for [[Whitepaper]]. Companion to [[Whitepaper Review]]. Primary sources in [[References]].*

---

## The one question that matters

Everything downstream — the array, the cost thesis, the ML — rests on a single empirical fact that no amount of simulation can establish:

> **Does one natural-base incorporation, in a clonal cluster on a 1 µm² Au/Pt pixel, produce a reproducible, base-*discriminating* impedance signature above the noise floor?**

The whitepaper is right that §3.2 (single-pixel validation) gates the whole program. The purpose of this document is to name the specific ways the answer could be "no," ranked, and to convert the first experiment from "does signal exist?" into a set of **pre-registered pass/fail thresholds**.

## Ranked failure modes

### 1. Cluster dephasing caps read length (highest risk)
With all four dNTPs present and **no synchronizing wash**, the ~1000 clonal copies over a pixel do not step in lockstep. Stochastic per-molecule kinetics, plus homopolymer runs, spread the population across positions within a handful of cycles. The ensemble signal the design depends on is only coherent while the cluster is roughly in phase. Controlled-cycle SBS (Illumina-style) exists *precisely* to prevent this via terminators + wash — the two things ECSEQ-1 removes. The simulator models dephasing, but simulated dephasing will almost certainly flatter real dephasing with a strand-displacing polymerase over hundreds of cycles.
- **Why it's first:** it can be fatal even if per-event SNR and base separation are both fine. It attacks read length, which is a product-defining metric.
- **What would falsify the concern:** measured phase coherence (autocorrelation of the ensemble step signal) staying usable out to a target read length on a known template.

### 2. Per-event SNR at 1 µm² (very high risk)
Reading a small ΔC_dl from a single incorporation against ionic-strength fluctuation, thermal drift at 65 °C, nonspecific adsorption, and 1/f electrode noise. Two of the physical signatures live on very different timescales: the PPi/proton charge release is a transient that diffuses away on sub-ms scales, while the informative conformational **dwell** is tens of ms. The harder-to-catch pathway carries much of the base information. Ion Torrent succeeds by integrating a *bulk* pH change over many synchronized incorporations in a well; a per-event impedance transient is a materially harder measurement.
- **What would falsify the concern:** a per-event ΔZ/Z distribution whose mean clears the measured per-event noise σ by a comfortable margin (target SNR set below, before the run).

### 3. The Au dielectric/dipole axis is under-grounded (high risk, load-bearing)
§2.3 leans on nucleobase dipole/dielectric coupling to the thiol-SAM giving a "dwell-independent, base-intrinsic amplitude" that "cleanly separates purines from pyrimidines." That a base-to-base dielectric difference is measurable as a distinct, reproducible double-layer perturbation at this scale is essentially unestablished in the literature — it does the most work of any claim in the doc and has the least precedent. If this axis is weak, cross-group (purine↔pyrimidine) separation collapses onto kinetics alone.
- **What would falsify the concern:** an Au-channel amplitude that separates purines from pyrimidines *independent of* dwell in the single-pixel data.

### 4. Sweep-vs-kinetics timing is tight (moderate risk)
The [[Appendix]] honestly derives a ~100 Hz floor from the ~75 ms shortest dwell — meaning barely one 50-point sweep fits inside one incorporation while the enzyme keeps moving. The proposed faradaic axis ([[Appendix|Appendix C]]) is worse: at ~75 ms dwell only the high-frequency shoulder of the charge-transfer arc is reachable, not the full R_ct plateau. The learned frequency selector helps but, as the whitepaper states, cannot manufacture separability that is not physically present. Note this is a *signal-quality* constraint, not a throughput one — the sweep still adds no wall-clock, so [[Throughput & Competitive Landscape]] correctly counts per-base time as polymerase-limited; the tightness caps how much can be read per event, not how fast.

### 5. Simulated accuracy is near-circular (interpretation risk, not physics)
The 88% figure comes from a network trained on the author's own physics simulator and evaluated against that same model. Recovering the signal is close to guaranteed by construction; the "confusion structure matches physical intuition" result shows the simulator is *self-consistent*, not that nature cooperates. The whitepaper acknowledges this — the danger is letting the number drift into slide decks as if it were external evidence. **Treat 88% as an internal sanity check with near-zero predictive weight for on-chip performance.**

### Minor flags
- The clean Bst dwell ordering (G > C > T > A) in [[Definitions]] is asserted as a large, readable separation. Real base-dependent kinetic differences (PacBio IPD) are subtle and typically need heavy averaging even optically; whether they are large enough to read electrically per-event is itself an assumption to measure, not assume.
- Surface reusability (50–100 runs via the thiol-Au anchor) is a cost-thesis input that is untested and secondary — park it until signal exists.

## Architectural mitigations for the dephasing risk (#1)

Dephasing is the highest-ranked killer, and the cleanest place to attack it is the architecture rather than the basecaller — a model can only recover a signal that survives to the electrode. Options, ordered from least to most invasive to the wash-free thesis:

1. **Per-molecule (single-molecule) readout instead of clonal ensembles.** The root cause of dephasing is *averaging over molecules at different positions*. If a pixel reads one polymerase, there is no ensemble to dephase — the phase problem disappears by construction, and this is exactly why PacBio and nanopore are single-molecule. The cost is [[Risks & Kill-Criteria|failure mode #2]]: one molecule gives far less signal, so this trades the dephasing risk for a harder SNR problem. Worth scoping as the "if clusters won't hold phase" fallback, since it preserves the wash-free, label-free, natural-base thesis intact.
2. **Kinetic phase-tracking in software, kept in the model.** Rather than assume the cluster steps in lockstep, treat position as a latent variable and let the transformer infer per-cluster phase spread from the data (a learned alignment / HMM-style state over incorporation index). This does not stop physical dephasing but can extend the usable read by *modeling* it instead of fighting it. Cheap to try, bounded upside — it buys cycles, not unlimited read length, and degrades as the phase distribution broadens past recovery.
3. **Slow the polymerase to widen the per-event window.** Lower temperature, reduced dNTP concentration, or a slower/engineered polymerase variant stretches each dwell, which both eases the sweep-vs-kinetics floor ([[Appendix]]) and reduces how fast the population fans out per unit time. Directly compatible with the current design; the cost is throughput, which is a core selling point — a tunable knob for the validation phase, not necessarily the product.
4. **Light re-synchronization without a full wash.** A periodic, brief synchronizing step — a short terminator/deprotection pulse or a controlled-nucleotide sub-cycle every *N* bases — re-aligns the cluster before phase spread accumulates. This is the highest-performance option for read length but it partially reintroduces the fluidic step the whitepaper is built to eliminate, so it is a deliberate compromise: "mostly wash-free with a resync tick" rather than strictly wash-free. Frame it explicitly as a thesis trade-off if adopted.

**Recommendation.** Keep option 3 (slow kinetics) as a free validation-phase knob, build option 2 (phase-tracking) into Dodgson regardless since it is cheap and strictly helps, and treat option 1 (single-molecule) as the principled fallback if KILL-1 fails — it is the only one that removes the dephasing mechanism rather than delaying it, at the price of moving the fight to SNR. Reserve option 4 for last, since it costs the wash-free claim. Whichever is chosen, it should be decided *before* the single-pixel run so KILL-1's threshold is set against the intended architecture, not the default one.

## Single-pixel go/no-go design (§3.2, made decisive)

Set every threshold **before** the run. The experiment follows the whitepaper's calibration chain; the additions here are the explicit decision rules.

1. **Blank-chip EIS baseline** — fit R_s, Q, α per pixel; record baseline noise σ_Z(f) across the sweep. *This defines the noise floor every later threshold is measured against.*
2. **Post-functionalization EIS** — confirm the thiol-SAM primer lawn shifts the interface reproducibly (a functionalization QC, not a base signal).
3. **Load + bridge-amplify a known template** — phiX 174 or a defined E. coli fragment; independently confirm cluster formation/occupancy.
4. **Run the wash-free loop, all four dNTPs**, recording per-cycle spectra.

**Decision rules (all pre-registered):**
- **KILL-1 (dephasing):** ensemble step-signal phase coherence must remain usable to ≥ [target] cycles on the known template. Below that → redirect to controlled-cycle or synchronization strategy before any array work.
- **KILL-2 (SNR):** per-event ΔZ/Z mean must exceed measured σ by ≥ [target SNR]. Below → sensor/area redesign before scale-up.
- **KILL-3 (discrimination):** the per-event spectra must carry base-dependent structure whose **confusion pattern matches the simulator** (cross-group near zero; residual within A↔G, C↔T). Structure present but *wrong* pattern → the simulator's physics is mis-specified; stop and re-derive before fine-tuning Dodgson.
- **PASS:** all three cleared → measured parameters recalibrate the simulator, Dodgson fine-tunes from checkpoint onto real data, and scaling becomes an engineering problem rather than an open scientific question.

Bracketed targets ([target], [target SNR]) are intentionally left for the team to set from the baseline noise measurement in step 1 — setting them *after* seeing the data is how a kill-criterion quietly becomes unfalsifiable.

## One-line summary

The physics is not obviously wrong, but it is unverified where it counts; the fastest path to knowing is one honestly-instrumented pixel with its kill-thresholds written down in advance.
