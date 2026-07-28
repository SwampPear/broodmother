## Biology

### Polymerase

An enzyme that synthesizes a new DNA strand by incorporating nucleotides complementary to a template, extending from the free 3′ end of a primer. ECSEQ uses Bst 2.0 WarmStart, a strand-displacing DNA polymerase run isothermally at 65 °C. Each incorporation is a binding → closed-fingers catalysis → translocation cycle, and the timing of the catalytic step (the dwell) is the primary base-discriminating signal.

### Template Bound Primer

A short oligonucleotide hybridized to a complementary region of the single-stranded template, presenting a free 3′ end from which the polymerase extends. In ECSEQ the primers are thiol-anchored to the gold surface as a dense lawn, so the growing strand — and every incorporation event on it — sits directly at the sensing electrode.

### Dwell

The time the polymerase spends in the catalytic closed-fingers state during a single incorporation. Dwell is base-dependent (mean ordering G \> C \> T \> A for Bst 2.0) and sets the amplitude and duration of the interfacial impedance perturbation, making it the primary kinetic discrimination axis. Its distribution is broad (modeled as gamma-distributed) and overlaps between bases, which is why single events are ambiguous and sequence context is required. The optical analogue in PacBio is the inter-pulse duration (IPD).

### Sequencing-by-Synthesis

Sequencing with readout from the act of a polymerase incorporating nucleotides onto a template-bound primer. The sequence is inferred from which base is added at each step, rather than from cleaving or hybridizing to the strand. This distinguishes it from sequencing-by-ligation and nanopore translocation.

### Sequencing-by-Ligation

Sequencing with base identity inferred from the action of a DNA ligase joining short labeled oligonucleotide probes to a growing strand, exploiting the ligase’s sensitivity to correct base-pairing at the ligation junction. The readout comes from which fluorescently labeled probe ligates. Each probe encodes specific base(s) at known positions and degenerate/universal bases elsewhere, and competes for ligation against the template. Only a probe matching the template at the interrogated position(s) ligates efficiently, and its label reports the base. The strand is then typically cleaved and the cycle repeated, often with offset primers so that each position is interrogated multiple times in different probe contexts, which gives the method high raw accuracy because base calls are cross-checked across rounds.

### Nanopore Translocation

Sensing mechanism underlying nanopore sequencing in which base identity is read from the electrical signal generated as a single native DNA strand passes through a nanometer-scale pore via a motor protein under an applied voltage. The protein channel the strand passes through carries an ionic current and each base passing through has a distinct characteristic ion flow disruption, the resulting signal over time encodes the sequence.

### Cyclic Sequencing

Cyclic sequencing refers to synthesis that proceeds in discrete, repeated ‘add reagent, detect base, reset reagent’ patterns rather than continuous sequencing. This is what structurally entails the wash step and makes fluidics that rate-limiter.

### Bridge Amplification

An isothermal, surface-bound amplification that clonally copies a single landed template into a dense local cluster. The tethered strand arches over to hybridize with an adjacent surface-bound primer (the "bridge"), is extended, and denatured; repeated cycles build \~1,000 copies within a \~1 µm spot. The clonal cluster is what lets ECSEQ read an ensemble signal far stronger than any single molecule. It is a shared upstream primitive borrowed from existing platforms, not a differentiator.

### Ensemble Sequencing

Sequencing with detected single originating from a clonal cluster, such as that produced by bridge amplification. Each of the clonal colonies is synthesized in parallel during sequencing so that there summed signal is stronger than that of any one colony.

---

## Chemistry

### Electrical Double Layer

The structured arrangement of charge that forms at any electrode/electrolyte interface: the charged electrode surface draws a counter-balancing population of solvated ions from solution. It comprises a compact inner region (the Helmholtz layer) and a diffuse outer region (the Gouy-Chapman layer), and behaves electrically like a capacitor. Molecular events that disturb its charge or geometry are what ECSEQ transduces.

### Helmholtz Layer

The compact inner region of the electrical double layer: roughly a single sheet of solvated counter-ions held against the electrode surface, a few ångströms thick. It dominates the double-layer capacitance and behaves like a parallel-plate capacitor with molecular-scale plate separation.

### Gouy-Chapman Layer

The diffuse outer region of the electrical double layer, where counter-ion concentration decays gradually with distance from the electrode under the competition between electrostatic attraction and thermal motion. Its characteristic thickness (the Debye length) shrinks as electrolyte concentration rises, contributing a concentration-dependent capacitance in series with the Helmholtz layer.

### Double-Layer Capacitance

The capacitance of the electrical double layer (C_dl) — how much interfacial charge shifts per unit change in electrode potential. It is non-faradaic: charge is stored, not passed across the interface. At ECSEQ's small electrode areas and benign potentials it is the dominant observable, since incorporation events modulate C_dl and that change carries most of the measurable impedance signal.

### Charge Transfer Pathway

The faradaic route by which electrons actually cross the electrode/electrolyte interface through a redox reaction, parameterized by the charge-transfer resistance R_ct (high R_ct ⇒ electron transfer is slow or blocked). At benign potential ECSEQ's interface is nearly purely capacitive (R_ct very high); the proposed faradaic discrimination axis deliberately biases the electrode so that R_ct becomes base-dependent and therefore informative.

### Warburg Diffusion

The impedance contribution from diffusion-limited transport of species to and from the electrode. It carries a characteristic −45° phase and a magnitude that falls as ω\^(−½), dominating the low-frequency end of the spectrum. In the equivalent circuit it sits in series with the charge-transfer resistance and blends into constant-phase behavior as the CPE exponent approaches 0.5.

---

## Physics

### Capacitance

The ratio of stored charge to applied voltage (C = Q/V) for a system that separates charge without passing it. A capacitor's impedance is 1/(jωC): it decreases with frequency and carries a −90° phase, opposing changes in voltage rather than current. The electrode double layer behaves as a (non-ideal) capacitor, which is the basis of ECSEQ's non-faradaic readout.

### Impedance

The frequency-dependent generalization of resistance: the opposition a circuit element presents to an AC current, carrying both a magnitude and a phase. Unlike pure resistance it captures energy storage (capacitive and inductive behavior) as well as dissipation, so it fully describes how an interface responds to a small AC stimulus.

### Complex Impedance

Impedance written as a complex number, Z(ω) = Z′ + jZ″, equivalently a magnitude \|Z\| and phase ∠Z. The real part is the resistive (in-phase) component; the imaginary part is the reactive (out-of-phase) component. ECSEQ measures Z at each swept frequency and feeds the per-event perturbation — as Δlog\|Z\| and Δφ — to the base-caller.

### Electrical Impedance Spectroscopy

A technique that applies a small-amplitude AC voltage across a range of frequencies and records the complex impedance at each, resolving processes that occur on different timescales (double-layer charging, charge transfer, diffusion) into different frequency bands. ECSEQ sweeps \~50 points from 100 Hz to 100 kHz per pixel per cycle, and the resulting spectrum is the sole input to the base-caller. Abbreviated EIS.

### Constant Phase Element

A circuit element used in place of an ideal capacitor to model real, non-ideal electrode interfaces, with impedance Z = 1/\[Q(jω)\^α\]. The exponent α (0 \< α ≤ 1) interpolates between a pure resistor (α = 0), an ideal capacitor (α = 1), and Warburg diffusion (α = 0.5); Q sets its magnitude. The non-ideality arises from surface roughness and a distribution of interfacial relaxation times. (In the ECSEQ simulator Q and α are written Y₀ and n.)

### CPE-Randles Model

The equivalent-circuit model of the electrode/electrolyte interface used throughout ECSEQ: a solution resistance R_s in series with the parallel combination of the double-layer constant-phase element and the faradaic branch (charge-transfer resistance R_ct in series with the Warburg term). It is the standard Randles cell with the ideal double-layer capacitor replaced by a CPE. Each incorporation event perturbs one or more of its elements, and EIS resolves the perturbation across frequency.

### Zero Mode Wave Guide

A sub-wavelength optical nanostructure — a metal-clad well tens of nanometers across — that confines illumination to a zeptoliter volume at its base, small enough to optically isolate a single polymerase even in a relatively concentrated labeled-nucleotide solution. It is the detection-confinement structure underlying PacBio SMRT sequencing, cited by ECSEQ as a contrasting, fabrication-intensive optical transduction approach.

---

## Platform

### EIS Sensor Array

The core of the ECSEQ platform: a high-density array of microelectrodes each performing localized electrochemical impedance spectroscopy on its own surface. The array is passive and application-general — the same hardware transduces any surface electrochemistry (base incorporation, hybridization, redox binding) that a decoder is trained to read — with per-pixel geometry (pitch, active-site size) chosen to match the target analyte. DNA sequencing is the array's first and most demanding application, not its definition.

### Passive Matrix

An electrode array addressed over shared row and column lines with no active device — transistor, buffer, or amplifier — at each pixel. Every unselected pixel loads the shared sense line only through its own passive impedance, and all intelligent readout (excitation, front-end, multiplexing, digitization, demultiplexing) lives off-chip in the peripheral device. Passivity is what makes the array cheap, dense, and reusable, and is the design choice the platform's cost argument rests on; its cost is the readout-scaling and interconnect problems of [[Appendix]] §D.

### Retrainable Decoder

The learned model that turns the array's per-pixel impedance signal into an application output — for sequencing, the two-stage per-event encoder plus temporal transformer that calls bases. Because discrimination lives in the decoder rather than the fixed hardware, the same array serves a different assay by retraining or swapping the decoder, and the instrument improves with model capability without refabricating the chip. This decoupling — fixed passive sensor, application-specific trained model — is the platform's central design principle.

---

## Evaluation

### Per-Event Accuracy

The fraction of individual incorporation events the per-event encoder classifies correctly in isolation, before any temporal context (a four-class problem, chance 25%). It measures the raw separability of a single EIS spectrum and is intrinsically limited because one event is ambiguous; the encoder reaches ~50% per-event on the L = 30 reads.

### Per-Base Accuracy

The fraction of sequence positions the temporal stage calls correctly, each read in the context of its neighbours across the cluster (a four-class problem, chance 25%). This is the headline accuracy unit of the paper (71.2%, Phred Q5.4, at L = 30) and is always at least the per-event figure, because temporal context resolves ambiguity that single events cannot.

### Per-Read Accuracy

The probability that an entire read of length L is called end-to-end with no error, approximately $\text{acc}^L$ when per-base errors are independent. It falls off steeply with length (at 71.2% and L = 30, roughly $3.7\times10^{-5}$) and is deliberately not a quantity the platform optimizes: a read need only carry enough correct bases to map, not be error-free. The paper reports per-event and per-base only; per-read appears solely in the $\text{acc}^L$ mapping-gate analysis of §6.
