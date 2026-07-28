# Appendix

# A. Randles–CPE Systems

Electrodes in contact with a buffer form and electrical double layer, which is a compact Hemholtz layer and a diffuse Gouy-Chapman layer of counter-ions. To an AC stimulus the interface behaves as a double-layer capacitance in parallel with a charge transfer pathway. In series with the solution resistance this yields the Randles model.

![[appendix-randles-model.png]]

Because real electrodes are rough and have a distribution of relaxation times, the ideal capacitor is replaced by a [[Definitions|constant-phase element]]:

$$
Z_\text{layer}(\omega) = R_s + \cfrac{1}{Q\,(j\omega)^{\alpha} + \cfrac{1}{R_\text{ct} + Z_W(\omega)}}
$$

Each element is physical: R_s is the bulk electrolyte path; Q and α describe the double-layer charging; R_ct gates faradaic electron transfer across the interface; and Z_W (see [[Definitions|Warburg diffusion]]) captures the diffusion-limited tail. An incorporation event moves one or more of these elements; EIS resolves the move frequency-by-frequency.

# B. Local Incorporation

A correct dNTP incorporation is not a single instantaneous step. It is a sequence of physical changes localized at the SAM-tethered primer lawn, each of which touches the double layer:

- **Released pyrophosphate and proton.** Phosphodiester bond formation releases a pyrophosphate (PPi) anion and a proton. Both are charged species appearing within nanometers of the electrode, transiently shifting local ionic strength and the charge balance of the double layer.
- **Local charge and ionic rearrangement.** The screening cloud of counter-ions re-equilibrates around the new charge state of the primer terminus, modulating C_dl.
- **Steric / conformational change.** The [[Definitions|polymerase]] transitions open → closed fingers during catalysis ([[Definitions|dwell]]), and the incorporated nucleobase changes the steric and dielectric environment at the [[Definitions|thiol-SAM]] surface.

## B.1 Which circuit elements move, and why

- **Double-layer CPE (Q).** The dominant *observable*. Ionic rearrangement and the conformational change directly modulate double-layer charging. At the 1 µm² pixel scale the area scaling pushes R_ct very high, so the parallel combination collapses onto the CPE branch and the measurable ΔZ/Z is carried almost entirely by ΔQ. (Full area-scaling argument in the Physics document.)
- **Charge-transfer resistance (R_ct).** Faradaic — it moves when the interface actually passes electrons, e.g. base-intrinsic oxidation under bias. Negligible at benign potential, but the deliberate handle behind the faradaic discrimination axis (§4D of the [[Whitepaper]]; detailed in §C below).
- **Warburg / diffusional term (Z_W).** Moves with the transient diffusion of the released ionic species; dominates the low-frequency tail and blends into the CPE as α → 0.5.

## B.2 Why AC-EIS rather than DC

A DC measurement collapses the interface to a single number and cannot separate mechanisms that live at different timescales. AC impedance spectroscopy resolves the response across frequency, and the physical mechanisms map cleanly onto bands:

| Band | Dominant mechanism |
| --- | --- |
| Low frequency (≲ 1 kHz) | Diffusional / faradaic (Warburg, R_ct arc) — the kinetic and faradaic content |
| Mid band (100 Hz – 10 kHz) | Double-layer charging — the primary signal band, where ΔZ/Z is largest |
| High frequency (≳ 10 kHz) | Series resistance R_s baseline; molecular/dielectric content extends into this tail |

The lower bound of a usable sweep is set by the event window: the fastest base's [[Definitions|dwell]] (\~66 ms, adenine) means a frequency is only measurable if the event outlasts \~1/f, fixing a practical floor near 100 Hz. Frequency-resolution is therefore not a convenience — it is what makes the distinct physical mechanisms separable at all.

# C. Faradaic Discrimination Axis

**Status.** Implemented and enabled by default. The axis is modeled in the physics simulator as a base-dependent Au charge-transfer resistance in a 20–90 Hz sub-band, and the basecaller carries a dedicated faradaic branch that reads it; every headline accuracy figure in [[Whitepaper|§6]] is a faradaic-on result; a quantified faradaic-off ablation at the current read length has not yet been run. What remains unvalidated is physical, not computational: whether the charge-transfer arc is actually accessible in this band at ECSEQ's geometry, and what the elevated Au bias costs in polymerase fidelity. Both are objectives of single-pixel validation, and the axis is not yet present in a fabricated stack.

**Motivation.** The Pt kinetic axis reflects polymerase conformation, and A and G share overlapping dwell distributions; the Au molecular axis as currently modeled is a non-faradaic dielectric/dipole effect and does not, on its own, encode the feature that most strongly separates A from G. The faradaic axis supplies that feature, and on measured reads it works: guanine is called at 98.8% accuracy and the A↔G purine pair is essentially resolved ([[Whitepaper|§6]]). The residual error is consequently dominated not by the purine pair but by the C/T pyrimidine pair — thymine in particular — which this axis does not target by design.

**Physical basis.** The natural bases have distinct intrinsic oxidation potentials: guanine is most readily oxidized (\~+0.9 to +1.0 V vs Ag/AgCl), adenine higher (\~+1.1 to +1.2 V), and cytosine and thymine both oxidatively sluggish at higher, closely spaced potentials. Biasing the Au charge-transfer electrode toward the guanine oxidation onset makes the faradaic charge-transfer resistance R_ct base-dependent — guanine presents a smaller charge-transfer arc than adenine. This is a base-intrinsic electron-transfer signal, separate from the dielectric/dipole signal already attributed to the Au layer.

**Asymmetric axis.** This is a strong discriminator for the A/G pair because guanine and adenine differ most in oxidation potential — and on measured reads it resolves that pair almost completely (guanine 98.8%; A↔G under 0.4% of all error, [[Whitepaper|§6]]). It does little for C/T: both pyrimidines are redox-sluggish with close, high potentials, so the C/T cell is now the dominant residual confusion and the single largest error channel. Closing it needs a different handle (the thymine 5-methyl group is a steric/hydrophobic difference better seen on the dielectric axis) and is out of scope for this layer. The axis resolves the purine cell; it does not touch the pyrimidine one.

**Implementation.** The Au layer is already the charge-transfer working electrode and the DNA anchor, so no new electrode is required; the change is how it is biased and read. Hold or pulse the Au interface toward the guanine oxidation onset and resolve the low-frequency charge-transfer arc as a feature family separate from the capacitive/dielectric response. In the CPE-Randles description of §A this is a base-dependent R_ct element controlling the low-frequency arc.

**Measurement constraints.**

- *Frequency floor.* The charge-transfer arc resolves at low frequency, but the per-event dwell bounds how low the sweep can reach. At the \~66 ms shortest dwell (adenine) the floor is \~15–30 Hz, so only the high-frequency shoulder of the arc is accessible within a single incorporation, not the full sub-Hz R_ct plateau — the accessible faradaic signal is partial.
- *Operating point.* Biasing toward guanine oxidation is elevated-potential relative to the benign double-layer measurement; the cost to polymerase fidelity and DNA integrity is unquantified and must be measured on the bench. A short faradaic interrogation pulse, separate from the continuous low-bias sweep, is one way to limit enzyme exposure and should be compared against continuous biasing.
- *Mediator-free.* A solution redox mediator (for example a Ru complex shuttling guanine oxidation) would sharpen the signal but reintroduces an added reagent and breaks the label-free thesis. This axis is mediator-free by design.

IP positioning for this axis — prior-art distinctions and the unclaimed white space it occupies — is in the [[ECSEQ/IP & Patents/Patent Landscape & FTO Analysis]] (Novel Claim Axes, item 7) and the [[ECSEQ/IP & Patents/Provisional Patent Application No. 1 — Draft]].

# D. Scaling Readout

**Status.** Everything in [[Whitepaper|the whitepaper]] up to §7 concerns a single pixel — the smallest fundamental unit of this architecture that can be validated. Everything in this section depends on that validation succeeding first, and covers proposed, experimentally testable work.

The massive throughput improvements EIS sequencing can provide require a similarly massive parallelization of the readout, and are only as massive as that parallelization. At the 2 µm pixel pitch over the full 900 mm² active area, the array holds enough pixels to write on the order of a human genome's worth of bases per pass at the supported read length — the capacity below is quoted at the $L = 500$ ceiling for reference, and §D.3 derates it to the read length the sensing physics permits, at which one run over 900 mm² does not close a genome and the single-run configuration needs a larger array. Pixel count is not the constraint on throughput; reading that many pixels out fast enough is.

| Quantity | Value |
| --- | --- |
| Active area | 900 mm² |
| Pixel pitch | 2 µm / 4 µm² |
| Capacity at read length 500 | 112.5 Gb/run (~35× human genome) |

## D.1 Channel-Count Problem

To call a base, a pixel's chemistry-window spectrum must be captured during the incorporation window. The shortest window is adenine at ~66 ms. One multisine acquisition at the 100 Hz measurement floor takes ~10 ms (a 100 Hz component cannot be measured faster than its own 10 ms period). Reading all 225 M pixels at the ~15 Hz frame rate (the inverse of adenine's 66 ms incorporation window) implies $3.4\times10^{9}$ spectra/s (1 spectrum/pixel/frame × 225 M pixels × 15 frames/s). A single time-shared front-end delivers on the order of 100 spectra/s, which puts the naive requirement at ~34 million independent front-ends. That is not effectively manufacturable, taking into account the cost-effectiveness of the passive array architecture.

## D.2 Multiplexing Removes the Channel-Count Wall

Multiplexing breaks the one-pixel-per-front-end assumption. Drive many pixels simultaneously with orthogonal excitations (distinct carrier frequencies, or Hadamard codes across rows), sum the responses onto a shared sense line, and demultiplex digitally after one fast ADC. This is standard practice in SQUID/MRI arrays, radio astronomy, and large capacitive sensors. One ADC then carries $M$ pixels concurrently, where $M \approx$ ADC bandwidth / per-pixel bandwidth.

Let $S = N_{\text{ADC}}\,M$ be the number of concurrent measurement slots. Serving the whole array at cadence requires $S = 3.4\times10^{9}/100 = 3.4\times10^{7}$ slots:

| Scheme | ADCs $N_{\text{ADC}}$ | Mux depth $M$ | Slots $S$ | Buildable? |
| --- | --- | --- | --- | --- |
| Naive (no mux) | 19 M | 1 | 19 M | no |
| FDM, 100 MSPS ADCs | ~38,000 | ~500 | 19 M | yes — many boards |
| **FDM, 1 GSPS ADCs** | **~3,800** | **~5,000** | **19 M** | **yes, comfortably** |
| Information floor (1.5 Tbit/s ÷ ADC bitrate) | ~1,700 | — | — | hard limit |

**~3,800 fast ADCs** is a serious but ordinary data-acquisition back end — comparable in channel count to a single high-density nanopore flow cell rather than to an aggregate multi-flow-cell installation. The SNR-safe corner of §D.4, at $M = 600$, costs roughly 32,000 converters for the same coverage; that is still buildable and is the operating point to quote. The 19-million naive figure was never a hard wall; it was an artifact of assuming no multiplexing. The pixels themselves remain fully passive throughout — multiplexing is entirely a peripheral-circuit decision. The end-to-end simulation of §D.8 adopts code-division (Hadamard) multiplexing rather than the frequency-division assumed in the table above, for the crest and demultiplexing reasons given there.

## D.3 Metrics Modelling

The preceding sections establish that the array is data-rich and that a sufficiently multiplexed back end can service it. We can use those facts to calculate a wall-clock figure: how long does one 30× human genome actually take?

The answer turns on one observation. **Read length does not appear in the base rate at all.** It enters only through the run count $R$ — through how many times the fixed per-run overhead $T_{\text{prep}}$ must be paid. A short read is therefore compensable by pixel count, and the only condition for a one-run genome is

$$
\eta P L \ \ge\ B
$$

where $\eta$ is the occupancy yield. This matters because §4C of the [[Whitepaper]] states plainly that unpatterned random deposition caps single-occupancy near 37% by Poisson statistics; using the un-derated $P$ overstates capacity by 2.7×. We carry $\eta$ symbolically, defaulted to 0.37, with active-bias loading control as the upside case rather than the assumption.

Consider the duty cycle, $L\,t_{\text{base}}/(T_{\text{prep}} + L\,t_{\text{base}})$: at the supported $L = 30$, sequencing occupies **under 0.2%** of wall-clock time, and even at a read an order of magnitude longer it stays under 3%. Sample preparation dominates by hundreds of times. Whenever $R = 1$, therefore, $T_{\text{genome}} \approx T_{\text{prep}}$, and the sub-hour genome is a *prep-time and array-area* claim rather than a read-length claim.

Two corrections also apply to the time-sharing gain. $T_{\text{acq}}$ cannot be 10 ms if the 20 Hz faradaic sub-band is swept on every event, since a 20 Hz tone cannot be resolved faster than its own 50 ms period. Running that sub-band on a pulsed 1-in-4 schedule gives an average $T_{\text{acq}} = 20$ ms and $d = 3.3$, against 6.6 for a main-sweep-only acquisition and 1.32 for continuous faradaic interrogation.

Capacity at the read lengths §E actually supports:

| $L$ | $PL$ | $\eta P L$ ($\eta = 0.37$) | Runs for 96 Gb |
|---|---|---|---|
| 10 | 2.25 Gb | 0.83 Gb | 116 |
| 30 | 6.75 Gb | 2.50 Gb | 39 |
| 100 | 22.5 Gb | 8.33 Gb | 12 |
| 500 | 112.5 Gb | 41.6 Gb | 3 |

**At 900 mm² the single-run genome does not close** — $\eta P L \ge B$ would require $L \ge 1{,}150$. It requires a larger array or a finer pitch. The area that does close it at a supportable read length follows from the same inequality:

| $L$ | Area for $R=1$ @ 2 µm | @ 1 µm | @ 0.5 µm |
|---|---|---|---|
| 10 | 104,000 mm² | 26,000 mm² | 6,500 mm² |
| 30 | 34,600 mm² | 8,650 mm² | 2,160 mm² |
| 100 | 10,400 mm² | 2,600 mm² | 650 mm² |

At a supportable $L = 30$ and 0.5 µm pitch a one-run genome needs roughly 2,200 mm² — about 2.4× the 900 mm² panel, and within the reticle-stitched area of a single 300 mm wafer. Under that configuration $T_{\text{genome}} = 35\ \text{min} + 30 \times 0.1175\ \text{s} \approx 35$ min. The sequencing term has become negligible: **3.5 seconds against a 35-minute prep.** Shortening the read from 427 bases to 30 changed the wall-clock answer by under a minute. What it changed instead is the array area required — a fabrication and cost variable, not a physics one, and one that scales with pitch.

For configurations that do not satisfy $\eta P L \ge B$, the same genome is reachable at $R > 1$ with proportionally more time, since each run pays $T_{\text{prep}}$ again. At $R = 39$ (900 mm² at $L = 30$), $T_{\text{genome}} \approx 23$ h, essentially all preparation. Reducing $T_{\text{prep}}$ through tagmentation-based library prep is therefore the single highest-leverage improvement available, and it is entirely independent of the sensor.

$$
T_{\text{genome}} = R\left(T_{\text{prep}} + L\,t_{\text{base}}\right), \qquad
R = \left\lceil \frac{B}{\min(P,\, d\,S)\,L} \right\rceil
$$

The per-run cost $T_{\text{prep}} + L\,t_{\text{base}}$ is a one-time sample prep followed by $L$ sequential incorporations at the polymerase rate $t_{\text{base}}$. The run count $R$ divides the $B$ bases the genome needs by the usable bases one run yields — $\min(P, dS)$ pixels read, each contributing $L$ bases. The $\min(P, dS)$ gates the number of active pixels between the number the backend can cover and the architectural maximum. $S = N_{\text{ADC}}\,M$ is the number of pixels the backend can sample at the same instant, its concurrent slots, where $N_{\text{ADC}}$ denotes the number of downstream ADCs and $M$ is the number of input lines. The factor $d = T_{\text{chem,min}}/T_{\text{acq}}$ is the time-sharing gain within one incorporation window. Because the shortest chemistry window is ~6.6× longer than one acquisition, a single slot can visit ~6.6 pixels before the window closes.

| Symbol | Meaning | Value |
| --- | --- | --- |
| $B$ | bases needed (30× of 3.2 Gb) | 96 Gb |
| $P$ | pixels | $2.25\times10^{8}$ |
| $t_{\text{base}}$ | per-base polymerase time | 0.1175 s |
| $S = N_{\text{ADC}}\,M$ | concurrent measurement slots | design variable |
| $T_{\text{prep}}$ | one-time sample prep + amplification | ~35 minutes |
| $T_{\text{chem,min}}$ | shortest incorporation time (base A) | 66 ms |
| $T_{\text{acq}}$ | one acquisition at the 100 Hz floor | 10 ms |
| $d = T_{\text{chem,min}}/T_{\text{acq}}$ | pixels served per slot per frame (= 66 / 10) | 6.6 |

*Fig. Inputs to the time-to-genome model.*

The back end must read every active pixel each frame: with $S = N_{\text{ADC}}\,M$ concurrent slots and a time-sharing gain $d = 6.6$, covering all $P = 2.25\times10^{8}$ pixels requires $dS \ge P$. At the SNR-safe multiplex depth §D.8 recommends ($M \approx 512$) that is $\approx 4.4\times10^{5}$ converters; the throughput-maximal corner ($M = 5{,}000$, $N_{\text{ADC}} \approx 6{,}800$, $S = 3.4\times10^{7}$) reaches the same coverage with far fewer converters, but at a multiplex depth the SNR budget forbids (§D.4). Read length does not change this wall-clock answer: a one-run genome closes in $T_{\text{prep}} + L\,t_{\text{base}}$ whatever $L$ is — 35 min plus 3.5 s at $L = 30$ against 35 min plus 50 s at $L = 427$ — because prep dominates by hundreds of times either way. What read length sets is the array area needed to satisfy $\eta P L \ge B$ in one run (tabulated above); a smaller or cheaper back end leaves the per-run time unchanged and instead reduces the pixels served per run, so the same genome takes $R > 1$ runs and proportionally longer, as noted above.

### The Sub-Hour Genome, Restated

The preceding subsections fix the configuration: at $L = 30$ and 0.5 µm pitch, $\eta P L \ge B$ closes a 30× genome in a single run over ~2,200 mm², at which point $T_\text{genome} \approx T_\text{prep} \approx 35$ min. The sub-hour genome therefore survives every correction in §E, but it is no longer a speed claim or a read-length claim — it is an **array-area claim gated on per-base accuracy**. Two requirements come with that configuration, and they are not equally hard.

The back end is expensive but ordinary in kind. The one-run configuration needs far more concurrent converter channels than the 900 mm² panel, and at the SNR-safe multiplex depth of §D.4 that channel count is a serious, unresolved architecture problem rather than a solved one — pulsed faradaic acquisition ($d = 3.3$) relaxes it only at the margin, because SNR forbids deeper mux. A subsequent end-to-end simulation of the readout chain (§D.8) eases this tension in principle — an analog baseline nuller makes the SNR-safe depth buildable and relocates the binding constraint to the front-end noise — but the resolution is simulated and gated on the same single-pixel measurement, so the channel count is not yet resolved on silicon.

Accuracy is the binding constraint. A read is only useful if it maps, and at the measured 71.2% per-base a 30-base read carries ~8.6 errors, so seed-and-extend placement against a 3.2 Gb reference is hopeless and no amount of array area substitutes for it (the $\text{acc}^L$ mapping gate is tabulated in [[Whitepaper|§6]]). The claim is therefore that the sub-hour genome is reachable at ~2,200 mm² and 0.5 µm pitch, conditional on Q20 basecalling and on a back end that §D.8 sizes as SNR-safe in simulation ($M \approx 512$) but hardware has not yet confirmed — every term named and bounded.

## D.4 SNR Under Multiplexing

The analysis below treats multiplex depth as the binding SNR constraint and lands on an SNR-safe sweet spot of $M \approx 100$–600. **§D.8 refines this with an end-to-end simulation of the readout**: it finds the analog front-end, not multiplex depth, the limiting term, and an analog baseline nuller that lifts the dynamic-range ceiling the amplitude-sharing penalty imposes here — so the depth-limited picture that follows is what motivates the nuller, not the final verdict on the back end.

Multiplexing does not create information, it trades the solved channel-count problem for an SNR problem. Stacking pixels onto one line and ADC shares the converter's dynamic range — each pixel keeps $16-\log_2 M$ effective bits of a 16-bit ADC ($M = 5{,}000 \Rightarrow$ ~4 bits) — and crosstalk/intermodulation leaks carriers into each other. The signal that must survive is not a single quantity, and the two must not be conflated. The ~15% charge-transfer shift is the *molecular*-axis perturbation of [[Whitepaper|§4D]], the always-on dielectric signal every event carries; it is not the faradaic discriminant. Biasing toward the guanine oxidation onset collapses $R_{ct}$ from its SAM-blocked baseline by two orders of magnitude, roughly 99%, and that collapse fires on every biased event regardless of base. What actually discriminates is the base-dependent *ratio* riding on top of it — about 1.67× between guanine and the pyrimidines. The converter must therefore span the full oxidation-onset swing, roughly $\log_2(100{,}000/555) \approx 7.5$ bits, before spending the further $\log_2(1.67) \approx 0.7$–1 bit that carries base identity. That is a materially harder budget than the ~2.6 bits a single-perturbation treatment implies, and it tightens rather than loosens the multiplexing tradeoff below. Per-event SNR at a 1 µm² pixel is already the highest-ranked hardware risk in [[Risks & Kill-Criteria]] before any multiplexing, so deeper mux compounds the top risk rather than adding a new one.

This fixes the tradeoff the section turns on. Time-to-genome depends only on $S = N_{\text{ADC}}\times M$ (§D.3), while SNR headroom depends only on $M$ — so the same speed can be bought two ways: deepen the mux (raise $M$ — fast and cheap, but headroom falls as $16-\log_2 M$), or add converters (raise $N_{\text{ADC}}$ at fixed $M$ — same speed at fixed SNR, BOM scaling ~linearly since each converter then needs only ~tens of MSPS).

![[whitepaper-throughput-envelope.png]]

*The readout operating plane. Diagonals are equal time-to-genome ($S = N_{\text{ADC}}\times M$ const; up-right is faster, down to the ~36-min floor); horizontal bands are per-pixel SNR headroom (eff. bits $= 16-\log_2 M$). The two dotted sweeps are the two levers — deepen mux (vertical) trades SNR for speed, add converters (horizontal) trades cost for speed. Marked: the SNR-reckless single-run corner, a balanced ~2 h point, and an SNR-safe slow one.*

The single-run 36-minute genome sits at the most SNR-hungry corner ($M \approx 5{,}000$, ~3.7 bits) and is the least safe bet; holding $M$ SNR-safe instead costs ~37× the readout back-end for the same speed. The plausible sweet spot is $M \approx 100$–600 — marginal-to-workable SNR at a full 30× genome in hours-to-a-day on one reusable chip; e.g. $M \approx 300$, $N_{\text{ADC}} \approx 40{,}000$ lands ~2 h at marginal-not-reckless SNR. Every point down to a few thousand ADCs fits within one surface's 50–100-run life.

Those figures are for the 900 mm² array. The one-run genome of §D.3 requires the ~2,200 mm² array, whose concurrent-slot count is far larger, and the same SNR-safe corner scales with it: the converter count it demands is not buildable as described, and raising $M$ to shrink it is precisely what the SNR budget forbids — a budget tighter still, since the faradaic requirement is ~7.5 bits rather than ~2.6. The SNR-safe single-run back end is therefore an open architecture problem, not a solved one; pulsed faradaic acquisition ($d = 3.3$) helps at the margin but does not close the gap. §D.8 revisits this with an end-to-end simulation of the readout chain: an analog baseline nuller makes the SNR-safe multiplexed back end feasible in simulation, moving the binding constraint from multiplex depth to the front-end noise — a modelled result gated on a single-pixel hardware measurement, not a demonstrated one.

A fourth risk sits underneath all of these and is specific to the faradaic axis. Because guanine oxidation is irreversible (§C), every previously interrogated guanine still resident inside the Debye sensing envelope of §E.1 continues to present a low-$R_{ct}$, guanine-like contribution at every subsequent cycle. Within a 9–26 base envelope at GC-neutral composition the expected count of such residents is $n_G \approx 2$–6, and simulation at the working envelope gives a mean of 2.9. The marginal signal attributable to the newest incorporation is therefore diluted roughly as $1/(1 + n_G)$ — a factor of three to four — against a background of its own prior bases. This is distinct from the positional dilution of §E.4: that spreads signal across the wrong positions, this buries it under correctly positioned but chemically spent ones, and the two compound. Both push the same way as the geometric ceiling, since $n_G$ grows with envelope length, and a short read is where this term is smallest.

## D.5 Passive-Matrix Interconnect Limits

The multiplexing analysis above treats the problem entirely at the converter. It says nothing about the wires, and at panel scale the wires are a second bandwidth constraint independent of, and additive to, the ADC-sharing one.

A 900 mm² array at 2 µm pitch is roughly 30 mm on a side, so a single row or column line runs 30 mm and carries about 15,000 pixel taps. The array is passive by design — no per-pixel buffer or amplifier, which is what makes the chip cheap and reusable — so every unselected pixel loads the shared sense node with its own parasitic capacitance, and the thin-film interconnect contributes distributed series resistance over the full run. The resulting RC network has a corner frequency that falls as the line lengthens, competing directly with the 100 kHz top of the main sweep, which is precisely where the molecular axis has its signal.

Two features make this worth separating from the ADC-sharing risk. It scales with *array size* rather than mux depth, so the large, shallow-mux configurations that resolve the dynamic-range problem do not avoid it and may worsen it. And it is a property of the passive-array choice itself: an active-matrix design would buffer each pixel and largely remove it, at the cost of a transistor per site and the fabrication simplicity the platform depends on. We have not modelled line resistance, per-line capacitance, or the resulting bandwidth derating at any scale, and the prototype's 4-pixel direct-wired geometry cannot exhibit the effect. It is an unquantified risk. See [[Risks & Kill-Criteria]].

## D.6 Measurement Frequency as a Sensing-Depth Lever

The readout band is conventionally treated as a signal-quality choice. It is also a lever on the geometric read-length ceiling of §E.1, and the cheapest one available, because it is a peripheral-electronics decision rather than a chemistry one.

Ionic screening is not instantaneous. Below roughly 1 MHz, ions have ample time to screen normally [58], and ECSEQ's present sweep tops out at 100 kHz — squarely inside the regime where the full screening penalty applies. Detection beyond the quasi-static screening length has been reported above 1 MHz [63], and a CMOS nanocapacitor array measuring per-pixel interfacial impedance has shown sensing depth extending measurably as sampling rises toward 50 MHz [62].

Two caveats bound this. The characteristic ionic relaxation rate scales as $D/\kappa^{-2}$, which for $D \approx 10^{-9}$ m²/s and $\kappa^{-1} \approx 1$ nm places the true crossover in the hundreds of MHz — far above the 1 MHz results, whose mechanism is better described as nonlinear mixing with molecular dipoles than as outrunning the ion cloud. And those results have not been independently replicated. We therefore treat extension of the readout band toward the MHz decade as an identified and inexpensive lever to test on single-pixel hardware, not a solved path. It carries a second consequence: simulation of high-frequency operation suggests the observable itself changes character, tracking analyte volume and dielectric contrast rather than charge — a different physical quantity from the one the signal model and simulator currently represent.

## D.7 Data and Compute Budget

The central architectural claim is that removing the label and the wash moves the bottleneck from fluidics onto readout electronics and compute. That is only checkable if the paper states how many bits per second leave the array and how much arithmetic turns them into bases. Both figures below are generated from the model definition (`dodgson/scripts/whitepaper_compute.py`) rather than asserted, and both are projections at array scales that have not been built.

**Base rate.** The architecture-independent figure of merit is $\eta P / t_{\text{base}}$. At panel scale with $\eta = 1$ this is $1.9\times10^{9}$ bases/s, or about $2.1\times10^{6}$ bases/s/mm² of active area. Unlike read length, this survives every correction in §E: it depends only on pixel count and polymerase turnover.

**Front-end data rate.** Each event yields one 62-point complex spectrum, or 124 values. At panel scale and 16-bit resolution that is ~475 GB/s off the array; post-demodulation at 8 bits, ~237 GB/s. The reduction chain matters more than either number — raw converter samples are demodulated per tone at the front end, reduced to the 124-value perturbation vector, and only then leave the instrument. That reduction must happen in acquisition hardware, not on a host.

**Basecalling compute.** The per-event encoder costs 19.3 MMAC (38.7 MFLOP) per spectrum; the temporal stage adds 6.5 MFLOP per base at a 30-base read. Together, 5.4 M parameters.

| Scale | Bases/s | Basecalling |
|---|---|---|
| ECSEQ-1 prototype (4 px) | 34 | 1.5 GFLOP/s |
| ECSEQ-1 full-spec die | 7.8×10⁶ | 354 TFLOP/s |
| Panel scale | 1.9×10⁹ | 86 PFLOP/s |

The middle row is the one that matters. **The full-spec demonstrator basecalls in real time on a single contemporary GPU server.** Scaling the instrument means scaling compute, which sits on a cost-and-capability curve that fluidics does not.

Panel scale should not be glossed. At 86 PFLOP/s sustained, real-time basecalling implies on the order of a hundred to a few hundred accelerators depending on utilisation — substantial, though far short of the datacenter the raw figure suggests. Three levers reduce it: reduced-precision inference, a smaller encoder, and the band selector of §F, which by retaining 32 of 62 tones roughly halves encoder cost (38.7 → 19.4 MFLOP) and at 20 tones reaches 31% of full. Offline basecalling relaxes it further.

The tradeoff is deliberate: **ECSEQ buys simple, cheap, reusable hardware by spending compute.** Every improvement in model efficiency or accelerator cost improves the instrument without touching the chip.

## D.8 Readout Feasibility: an End-to-End Simulation Study

The preceding subsections size the readout back end but leave two questions open: whether a shared-converter chain actually preserves the basecall once every non-ideality is included, and whether the SNR-safe multiplex depth §D.4 treats as an open problem is reachable at all. A first-principles simulation study of the full readout chain (`READOUT/` in the repository) addresses both. It models the electronics between the pixel and the basecaller as five stages — array substrate, excitation (drive), front-end (sense), code-division multiplex, and digital demux — each allocated a slice of an end-to-end error budget and graded in one currency (effective bits) against the only metric that matters: does the recovered $(\Delta\log|Z|,\ \Delta\varphi)$ vector still separate the bases. Every result is simulation — exact NumPy behavioural models, no hardware — and the basecaller seam is stubbed, so accuracy is graded by a data-domain separability lower bound rather than the trained model. The study de-risks the design around the single-pixel measurement of [[Whitepaper|§4A]]; it does not replace it.

**The array substrate behaves as modeled.** The first stage (Stage 0) extracts the crossbar's array-emergent physics — sneak-path crosstalk, shared-bath noise correlation, line RC, and bias uniformity — from small physics tiles and confirms none of it breaks the readout: post-demultiplex neighbour crosstalk stays ≤0.9%, the shared-bath spatial-noise correlation ($\rho \approx 0.5$) leaves per-pixel SNR unchanged (Hadamard column orthogonality makes the recovered per-pixel variance correlation-independent, so $\rho$ reshapes only the cross-pixel error covariance), and the shared-electrode bias is uniform enough for 100% guanine-onset coverage. One constraint is carried forward: the thin-film line dielectric must stay above a few hundred nm — a 15 nm layer would inject ~0.26 rad of in-band phase — which is the interconnect parasitic §D.5 flags.

**The composed chain preserves the basecall.** End to end, the recovered perturbation is 0.88 effective-bit against a 1.39-bit budget, degrading per-event separability (NCM) by 0.022 and consensus-at-30× by 0.009, with no disproportionate cross-group error. Every stage lands within its allocation, and one dominates: the analog front-end and quantization carry ~0.70 bit — about 80% of the composed budget and an order of magnitude above any other stage. The binding constraint on the whole readout is therefore the **front-end noise at the acquisition integration time**, not multiplex depth, excitation, or demux.

**The $\sqrt{M}$ multiplex advantage does not materialize — and was never the load-bearing claim.** A Hadamard-coded readout carries a Fellgett $\sqrt{M}$ SNR advantage only when the pixel is detector-noise-limited. The ECSEQ pixel is not: its ~$10^{10}\,\Omega$ interface is overwhelmingly source/Johnson-noise-limited (the thermal floor exceeds the converter floor by ~$10^{5}$–$10^{6}\times$), so the recovered advantage is ≈1 at every depth — ≈1.6× once the shared front-end is counted detector-side, still far below $\sqrt{M}$. Multiplexing is thus SNR-neutral: it buys fewer converters, not better SNR. This corrects an earlier framing in both directions — there is no $\sqrt{M}$ bonus to bank ($\approx 22\times$ at $M=512$), and equally none to lose — but it leaves the architecture intact, since the value of multiplexing here is converter-count reduction, not signal gain.

**The analog nuller is what makes a shared converter buildable.** The dynamic-range penalty §D.4 books ($16-\log_2 M$ bits) assumes the converter must span the full ~$10^{10}\,\Omega$ baseline. An analog baseline nuller — the inverted quiescent comb subtracted before digitization, standard in SQUID-FDM readouts — cancels that baseline and reclaims ~4.85 bits, so the ADC digitizes only the ~2.7-bit perturbation. (This ~2.7-bit figure is the benign-potential molecular/impedance perturbation the readout study grades; the ~7.5-bit faradaic oxidation-onset swing of §D.4 is a separate, biased interrogation carrying its own dynamic-range budget that this study does not model — a different measurement, not a conflicting estimate of the same one.) With it, the buildable depth set by ADC dynamic range rises to ~7,100 pixels per converter; without it, it collapses to ~250. The nuller is therefore a precondition, not an optimization, and its binding real-world requirement is a recalibration cadence holding baseline drift to ≤0.52% between calibration and event.

**Buildable operating point.** The study's recommended configuration is $M \approx 512$ pixels per 16-bit converter under Hadamard code-division multiplexing — which lands inside the SNR-safe sweet spot ($M \approx 100$–600) §D.4 independently identified, and well below the ~7,100 dynamic-range ceiling. At that depth the full $2.25\times10^{8}$-pixel array needs $\approx 4.4\times10^{5}$ converters, a ~512× reduction from one-per-pixel. Code-division is chosen over the frequency-division of §D.2's tables because the flat ±1 code envelope carries no peak-to-average penalty (frequency-division loses up to ~24× crest-limited SNR at this depth), spends the converter's full range on signal every frame, and demultiplexes exactly by a Walsh–Hadamard transform. The excitation (62-tone multisine, ~12.5 dB crest managed by sub-banding the acquisition), the faradaic-bias potentiostat (+0.95 V, phase margin 61°, 0.72 ms settling, in a separate ~30 Hz window inside the 66 ms dwell), and the FPGA demux (16-bit block-floating-point FFT) all compose comfortably within budget.

**What this changes for §D.3–§D.4.** The SNR-safe multiplexed back end those subsections call an open architecture problem is, in simulation, feasible: the nuller resolves the dynamic-range wall, code-division removes the crest penalty, and the recommended depth is SNR-safe by the whitepaper's own criterion. The binding constraint moves from "can the back end be built at a safe multiplex depth" to a single hardware measurement — the front-end noise at the real acquisition integration time, with the nuller drift cadence as the second — which the single-pixel and small coded-tile experiments of [[Whitepaper|§4A]] and [[Risks & Kill-Criteria]] are designed to make. Until that measurement exists the feasibility is simulated, not demonstrated, and the $\sqrt{M}$-absent, front-end-limited result is a claim about first-principles models graded against a separability lower bound, not about silicon.

## D.9 Cost Structure

The throughput analysis sets time-to-genome; the cost argument is separate, and commercially at least as load-bearing. It rests on one structural difference from every competing platform: the sensing surface is reusable, so the chip is a durable instrument, not a consumable.

Optical and most electronic platforms sequence on a single-use flow cell, chip, or SMRT cell — substrate, surface preparation, and fluidic consumable are paid in full every run. ECSEQ's thiol-Au primer lawn is regenerated between runs by a denaturing strip that leaves the anchor intact (§4B), so the chip is paid for once and amortized over its 50–100-run reuse life; the per-run consumable is then the borrowed short-read library prep (§4C), not the chip.

Two properties lower the amortized cost further. The chip is not sequencing-specific — it is a general-purpose EIS array ([[Whitepaper|§1]]), so its fabrication cost spreads across every application it serves, not sequencing runs alone: a chip that also runs molecular panels or continuous monitoring between sequencing runs amortizes over a far larger denominator. And it is passive and label-free — no per-pixel transistors, optics, fluorophores, or wash hardware — so its bill of materials is a thin-film electrode array plus the off-chip reader (§D.8), and the reader is reused across every chip.

We state the claim qualitatively rather than as a fabricated figure: to first order the per-genome cost is $C_\text{chip}/N_\text{reuse} + C_\text{prep}$, both terms small and neither a single-use flow cell. A quantified bill of materials — fabrication cost, reader BOM at the §D.8 operating point, reagent cost per run — is an engineering estimate for once a device exists. The structural point survives whatever those numbers turn out to be: ECSEQ moves the dominant sequencing consumable from a per-run cost to a per-reuse-cycle cost, and puts the chip's cost onto a durable, multi-application instrument rather than a disposable.

# E. Read-Length Limits: Interfacial Geometry and Cluster Coherence

Every figure in the throughput analysis rests on a read length $L$, and $L$ is not a free parameter. Two independent mechanisms bound it:

$$
L_{\max} = \min\left(L_{\text{geom}},\ L_{\text{coh}}\right),
\qquad
L_{\text{geom}} \approx \frac{3\kappa^{-1}}{(0.34\,\text{nm/bp})\sin\theta}
$$

$L_{\text{geom}}$ is the interfacial sensing horizon: the polymerase active site must remain inside the electrode's sensing volume for a base to be discriminated at all, and that volume is bounded by the Debye screening length $\kappa^{-1}$. $L_{\text{coh}}$ is the cluster-coherence horizon: the copies must stay in positional register for their summed signal to resolve one incorporation per position.

Under any buffer that supports an active polymerase, $L_{\text{geom}} \ll L_{\text{coh}}$ — **geometry binds first, and coherence is not currently the limiting term.** §E.1 derives the geometric horizon and §E.2 surveys what is known about moving it. §E.3 and §E.4 then give the coherence horizon, which is correct and becomes binding the moment the geometric one is lifted. Both remain unmeasured; both are single-pixel validation targets.

## E.1 Geometric Sensing Horizon

The sensing thesis of this paper is that the incorporation event perturbs the interfacial impedance. That perturbation is only observable while the polymerase active site sits inside the region where the electrode's field is not yet screened by mobile ions. For a symmetric electrolyte, $\kappa^{-1} = 0.304/\sqrt{I}$ nm with $I$ in mol/L, and the usable envelope is roughly $3\kappa^{-1}$.

A working Bst 2.0 buffer runs at roughly 50 mM monovalent salt plus 10 mM Mg²⁺, so $I \approx 0.09$ M. At the B-form contour rise of 0.34 nm/bp and vertical anchoring, the envelope converts directly into a base count.

| $I$ | $\kappa^{-1}$ | $3\kappa^{-1}$ | Bases in envelope |
|---|---|---|---|
| 90 mM (working) | 1.0 nm | 3.0 nm | ~9 |
| 50 mM | 1.4 nm | 4.1 nm | ~12 |
| 10 mM (dilute) | 3.0 nm | 9.1 nm | ~26 |
| 1 mM | 9.6 nm | 28.8 nm | ~85 (no polymerase activity) |

The operating range is therefore **roughly 9 to 26 bases**, with buffer ionic strength as the tunable and polymerase activity as the floor. Two obvious levers both fail at fixed sensing chemistry. Extending the depth to reach 500 bp means 170 nm of active-site travel, requiring $\kappa^{-1} \approx 55$–85 nm and therefore $I \approx 26\ \mu$M — effectively deionized water, in which Bst 2.0 does not turn over at all, since two-metal-ion phosphoryl transfer requires millimolar Mg²⁺. Flattening the strand to fit 500 incorporations inside a 9 nm envelope requires an average rise below 0.018 nm/bp, about 5% of contour, holding the duplex within roughly one degree of the surface plane for all 500 bases; the ~50 nm persistence length of dsDNA guarantees excursions exceeding 9 nm long before base 500. Neither is a tolerance to be tightened.

One candidate lever does *not* help. Operating at 65 °C does not extend the envelope: $\kappa^{-1} \propto \sqrt{\varepsilon_r T}$, and the rise in $T$ from 298 to 338 K is very nearly cancelled by the fall in water's relative permittivity from about 78 to 64, leaving $\kappa^{-1}(65\,°\mathrm{C}) \approx 0.98\,\kappa^{-1}(25\,°\mathrm{C})$. Temperature is not a lever.

## E.2 Extending the Sensing Horizon

The Debye length is not a constant of the system, and treating the horizon above as a wall would misstate the literature. $\kappa^{-1}$ derives from the linearized Poisson–Boltzmann model, whose assumptions — small surface potentials, thermodynamic equilibrium, point-charge ions with no steric crowding — are all violable by design, and a substantial body of work reports label-free electrical detection at physiological ionic strength by doing so [58].

Four approaches are established enough to name. Dense polyelectrolyte multilayers raise the entropic cost of confining ions inside the film and have been reported to extend the effective screening length from 0.8 to about 10 nm at physiological ionic strength [59]. Biomolecule-permeable polymer coatings achieve detection in 150 mM buffer where unmodified devices fail above 10 mM [60,61]. Non-equilibrium high-frequency operation drives the interface faster than the ion cloud can respond; a CMOS nanocapacitor array architecturally close to ECSEQ's own has shown sensing depth extending past $\kappa^{-1}$ as measurement frequency rises toward 50 MHz [62,63] — a readout-electronics lever rather than a chemistry one, developed in §D. Finally, concave electrode topography restricts the volume in which double layers can form [64]; ECSEQ's planar array is the worst case on that axis, and recessed pixel geometry is an unexplored, purely fabrication-side option.

One approach that has worked well elsewhere is structurally unavailable here, and it is the field's most successful. Aptamers, nanobodies, and antibody fragments overcome screening by shrinking the recognition element so the transduced event falls inside the existing envelope [65,66]. ECSEQ cannot shrink its recognition element: Bst large fragment is a ~66 kDa protein roughly 5–6 nm across with the active site necessarily buried inside it. The receptor-engineering route is closed, which is why the Debye-volume and frequency routes are the ones that matter here.

What has *not* been demonstrated, anywhere we can find, is any of this over a catalytically active enzyme. Every result above was obtained on a static binding event, in monovalent buffer or at most 2 mM Mg²⁺, at room temperature. ECSEQ needs 10 mM Mg²⁺ at 65 °C with a strand-displacing polymerase and a growing duplex moving through whatever layer is doing the screening extension — and divalent cations screen far more effectively per mole and can collapse polyelectrolyte films, while polymer brushes can dehydrate on heating and lose the volume fraction the mechanism depends on. Nor is there data on such a layer surviving 50–100 regeneration cycles. This is simultaneously the largest unquantified risk in the platform and a genuine novelty claim. See [[Risks & Kill-Criteria]].

The nearest precedent is instructive about the size of the gap. Single-molecule electronic recordings of DNA polymerase I processing have been obtained in 10 mM Tris / 50 mM NaCl / 10 mM MgCl₂ — essentially ECSEQ's ionic strength — resolving individual incorporations over more than 10,000 bond-forming events [67]. That work does not discuss screening at all, because the enzyme is conjugated directly to the transducer and the standoff distance is approximately zero. **The engineering problem this paper poses is therefore not to defeat the Debye limit; it is to reproduce that demonstrated result at a standoff of a few nanometres rather than none.**

**The bounded research bet.** The target is far smaller than the read-length ceiling suggests. A read does not need to be long; it needs to be *mappable*. Unique placement against a 3.2 Gb reference needs roughly 20–25 bases (§7), so the objective is to extend the effective sensing horizon from its nominal ~9 bases to that floor — a factor of ~3, not the three orders of magnitude that would put ECSEQ in competition with translocation sequencing on read length. A 3× extension is a tractable engineering bet; matching nanopore read lengths is not, and pursuing it would trade away the architecture's differentiation. The kill-criterion is measurable: if single-pixel validation cannot extend the horizon across the mapping floor at a polymerase-compatible ionic strength, the whole-genome application is closed and the platform remains a targeted-panel device.

**Active sensing-depth extension.** The most architecture-native lever is a measurement strategy, not a chemistry one, and it is where ECSEQ's frequency-domain method distinguishes it most sharply from translocation sequencing. Ionic screening is not instantaneous: driven faster than the double layer can reorganize, the interface is not screened to its quasi-static Debye length (§D). Extending the readout band toward the MHz decade *actively* extends the sensing volume to reach the climbing active site — without moving the DNA, threading a pore, or cleaving the strand. Where nanopore fixes a sensing constriction and translocates the molecule through it, ECSEQ holds the molecule in place and drives the *measurement* to reach it: an ensemble, frequency-resolved impedance readout against a single-channel DC ionic current. Both envelope-extension routes (the polymer/gel layer, which changes the screening; the high-frequency drive, which changes the observable) share the property that neither beats electrostatic screening with a screened field — which is why a purely electrophoretic pull-down of the strand cannot work: the field that would pull the terminus into range is attenuated over the same Debye length that limits the sensing, so its reach and the sensor's reach are one and the same.

## E.3 Attrition Bound

The remaining two subsections derive $L_{\text{coh}}$, the secondary ceiling. It binds only if the geometric horizon of §E.1 is lifted, but is derived in full because the mechanisms that would lift the geometric one leave it untouched.

Treating dephasing as memoryless per-cycle attrition gives the optimistic limit. We define cluster coherence as the fraction of copies still contributing to the in-phase ensemble signal at cycle $n$:

$$
C(n) = \frac{N_{\text{active}}(n)}{N_0}
$$

where $N_0$ is the initial number of strand copies within the clonal cluster. Since the incorporation perturbation is an ensemble average, the base-dependent change in interfacial impedance, $\Delta Z(\omega)$, scales linearly with the number of in-phase copies, $\Delta Z \propto N_{\text{active}}$. Second, the dominant noise terms are set by the electrode and readout electronics and are independent of copy count. The per-event signal-to-noise ratio is therefore proportional to coherence,

$$
\text{SNR}(n) \propto N_{\text{active}} = N_0\,C(n)
$$

Each cycle a copy leaves the in-phase population with probability $r$ (the per-cycle dephasing rate), so $N_{\text{active}}(n) \sim \text{Binomial}(N_{\text{active}}(n-1), 1-r)$ and coherence decays geometrically,

$$
\mathbb{E}[C(n)] = (1-r)^n \approx e^{-rn}
$$

Solving $C(N_{\max}) = C_{\min}$ for a coherence floor $C_{\min}$ set by the basecaller's discrimination threshold gives the read-length limit in closed form,

$$
N_{\max} = \frac{\ln C_{\min}}{\ln(1-r)} \approx \frac{-\ln C_{\min}}{r}
$$

Read length falls only logarithmically as the floor tightens, so under this model the horizon is forgiving of a strict $C_{\min}$ and sensitive only to $r$. That sensitivity is the problem. The value $r = 0.002$ cycle⁻¹ carried by the current simulator is a hand-set placeholder rather than a rate derived from or measured against the incorporation kinetics, and the figures it produces — $N_{\max} \approx 500$ cycles at $C_{\min} = e^{-1}$, approximately 347 at a stricter $C_{\min} = 0.5$, approximately 1150 at a permissive $C_{\min} = 0.1$ — are quoted here only to retire them.

Working backwards makes the placeholder's implicit claim explicit. Holding a cluster coherent for 500 cycles requires a per-cycle timing coefficient of variation below $1/\sqrt{500} \approx 0.045$, which is an incorporation composed of roughly 500 to 2,000 sequential rate-limiting steps. The kinetics in §E.4 give 0.485, an order of magnitude larger, and the numbers derived there supersede these.

## E.4 Phase-Spread Model

Dephased copies do not vanish. Leading and lagging strands continue to contribute signal at the wrong position, appearing as inter-symbol interference rather than a clean loss of amplitude. The faithful account models each strand's incorporation index as a random walk: copies drift independently, so the ensemble's positional distribution has standard deviation

$$
\sigma_n = \sqrt{D\,n}\ \text{bases}
$$

with $D$ the per-cycle phase-step variance (in base²). Contrast between adjacent positions survives only while $\sigma_n$ stays below roughly one base, giving $N_{\max} \approx 1/D$.

$D$ follows from the per-copy cycle-time distribution, which the simulator's kinetics configuration already fixes. One cycle is three sequential sub-steps:

| Sub-step | Distribution | Mean | Variance |
|---|---|---|---|
| Search | Exp(0.10 ms⁻¹) | 10 ms | 100 ms² |
| Chemistry | Gamma($k = 2.78$), base-dependent | 66–116 ms (mean 87.5) | 2754 ms² |
| Translocation | Exp(0.05 ms⁻¹) | 20 ms | 400 ms² |
| **Cycle** | | **117.5 ms** | **3254 ms²** |

The cycle mean reproduces the $t_{\text{base}} = 0.1175$ s used throughout §D exactly, so the timing model is self-consistent; it was only the dephasing model that was not. The per-cycle standard deviation is $\sigma = \sqrt{3254} = 57.0$ ms, a coefficient of variation $\text{CV} = 57.0/117.5 = 0.485$. A copy advances one base per cycle, so the CV is the positional step jitter measured in bases, and

$$
D = \text{CV}^2 = 0.235\ \text{base}^2/\text{cycle},
\qquad
\sigma_n = 0.485\sqrt{n}\ \text{bases}
$$

$\sigma_n$ crosses one full base at $n \approx 4$; by $n = 100$ it is 4.9 bases, and by the 427 cycles a single-run 30× genome would need it is 10 bases. The criterion $N_{\max} \approx 1/D$ therefore gives $N_{\max} \approx 4$ on the nominal kinetics, two orders of magnitude below the attrition bound.

![[whitepaper-coherence-decay.png]]

The chemistry sub-step carries 85% of the cycle variance and is the obvious target, but tightening it does not recover a long read. Make chemistry perfectly deterministic, removing all 2754 ms², and the two exponentially distributed sub-steps alone still leave 500 ms², $\sigma = 22.4$ ms, $\text{CV} = 0.190$, and a one-base crossing at $n \approx 28$. Read length is bounded to tens of bases by search and translocation regardless of how tightly the chemistry step is controlled. Extending it is a question of changing the kinetics themselves — an engineered polymerase whose incorporation cycle is composed of many low-variance steps — not of tightening a tolerance on the current one.

## E.5 Convergent Ceilings

Phase spread is not the only mechanism pointing at a short read, and the others are physically independent of it. The Debye screening length at the operating ionic strength bounds the distance over which a growing strand stays visible to the electrode at all, and the $1/n$ dilution of one incorporation's contribution against an $n$-base duplex already synthesized erodes the marginal signal as the read extends. Both land in the same range of roughly ten to a few tens of bases. This is agreement rather than a set of alternatives to take a minimum over, and the agreement is the stronger statement: three separate arguments — from ensemble timing, from electrostatics, and from signal bookkeeping — independently give the same answer. ECSEQ is a short-read architecture, and the read length, the basecaller's context window, and the throughput model should all be built around that rather than around a 500-cycle figure.

The measurement that decides it is the per-copy cycle-time distribution for Bst 2.0 at 65 °C in ECSEQ's buffer, specifically its coefficient of variation rather than its mean, since everything above is a function of CV alone. It is a single-pixel — or even a bulk single-molecule kinetics — measurement, and it sits at the top of the validation list. See [[Risks & Kill-Criteria]].

# F. Learned Frequency-Band Selector (Proposed)

**Status.** Refinement to the [[Whitepaper|§5]] encoder; prototyped on synthetic data (see §F.1), with deployment as a hardware acquisition strategy gated on single-pixel validation.

The per-cycle encoder sweeps the full 62-point spectrum on every branch. A learned frequency-band selector is a differentiable mask trained jointly with the encoder that collapses this sweep to the subset of frequencies actually carrying basecalling signal, rather than sweeping all 62 points on every event [46,47].

The payoff is concrete on two fronts. Fewer swept frequencies per event is a direct acquisition-time win on hardware — a narrower sweep shortens the multisine acquisition window, which is one of the fixed floors identified in §D. The learned weighting also doubles as a diagnostic instrument, showing where separability actually lives in the spectrum rather than assuming it is spread evenly across the 100 Hz–100 kHz band.

The limit is the same one that runs through every synthetic-side model result in this paper: the selector cannot manufacture separability that is not physically present in the signal. It can only find and exploit separability the hardware actually produces, so it is only worth committing to on hardware once single-pixel validation establishes that a real pixel produces a signal worth narrowing in on — narrowing the real acquisition earlier would optimize against the simulator's assumptions rather than against measured physics.

## F.1 How many tones?

A first prototype trained jointly with the tri-branch encoder on synthetic data (`dodgson-faradaic-bandsel`) sweeps how few tones the basecall actually needs. This is a smaller, separately-trained prototype run: its absolute accuracies sit below the headline pipeline's (0.673 per-event and 0.541 per-base at the full sweep, against 0.501 and 0.712 in §6; the prototype's own levels are from a separate, pre-retrain `dodgson-faradaic-bandsel` run and are not directly comparable), so only the trend across K is the result here, not the levels. Truncating the 62-point sweep to the K highest-scored tones and retraining, accuracy holds — and slightly improves — down to K ≈ 32 (per-base 0.645 vs. 0.541 at the full sweep, pruning upper-frequency tones the temporal stage would otherwise integrate noise through), then falls off sharply below K ≈ 16 once the mask is forced to abandon the low-frequency faradaic sub-band: at K = 8 the lowest retained tone jumps from ~20 Hz to ~113 Hz and per-event accuracy collapses toward chance, the same A↔G failure the signal model predicts when the faradaic axis is removed. The reading is a synthetic-side diagnostic, not a hardware target — roughly half the sweep is redundant and the low-frequency tones are load-bearing, both to be confirmed against a real pixel.

![[whitepaper-band-selector-mask.png]]

*Learned keep-probability (stems) over the 62-point sweep, against the per-axis separability curves and the 20–90 Hz faradaic sub-band: separability concentrates at the low-frequency end, where the faradaic axis lives.*
