# Peripheral Device

**Status: PROPOSAL / DRAFT — 2026-07-08.** No multiplexed readout hardware has been built; the four-pixel prototype is direct-wired. This page is the engineering realization of the readout architecture argued in [[Whitepaper|§4.1]] and [[Throughput & Competitive Landscape|§1.4]] — read those first for the *why*; this page is the *how*.

![[peripheral-device-render.png]]

*Render placeholder — not a real board layout.*

## What it is

The ECSEQ-1 chip is a **passive matrix**: an Au/Pt electrode array with no per-pixel transistor ([[Whitepaper|§2.1]]). That passivity is the cost-and-yield bet the whole company rests on — but it means the chip does nothing on its own. Every intelligent readout function lives **off-chip, in the peripheral device**: excitation generation, analog front-end, analog-to-digital conversion, demultiplexing, and host hand-off. The peripheral is what turns a functionalized wafer into a readable instrument.

Concretely, the peripheral device is an external PCB (or stack of boards) that:
1. **Excites** selected pixels with an EIS multisine sweep (100 Hz–100 kHz, [[Whitepaper|§2.3]]).
2. **Senses** the resulting currents off shared column/row lines through the on-chip analog mux (`mux_on_resistance_ohm = 50 Ω`, `simulator/config/noise.yaml`).
3. **Digitizes** them on an ADC bank.
4. **Demultiplexes** concurrent pixels digitally and streams spectra to the host running [[Whitepaper|dodgson]].

The chip stays passive; the peripheral carries all the complexity. This is deliberate — it means readout capability scales by redesigning a board, not a wafer.

## The problem this device exists to solve — "massive readout"

The future-considerations item is the **channel-count wall** ([[Whitepaper|§4.1.2]]). Restated:

- To call a base, a pixel's spectrum must be captured *during* its incorporation window. Shortest window (base A) ≈ 66 ms; one multisine acquisition at the 100 Hz floor ≈ 10 ms.
- A single time-shared front-end delivers ~100 spectra/s. Reading all 225 M pixels of the full-spec chip at cadence needs $3.4\times10^{9}$ spectra/s → **~34 M independent front-ends** if naively one-per-pixel.
- 34 M front-ends is unbuildable *and* would reintroduce the per-pixel circuitry §2.1 exists to avoid.

The resolution is **not on the chip** — it is this device. Drive many pixels **simultaneously** on orthogonal excitations, sum their responses onto a shared sense line, digitize with one fast ADC, and separate them again in software. Standard practice in SQUID/MRI arrays, radio astronomy, and large capacitive touch panels; new here only in being applied to a thin-film electrochemical array. One ADC then carries $M$ pixels at once, and the buildable back end collapses from 34 M front-ends to a **few thousand fast ADCs** ([[Whitepaper|§4.1.3]]).

## The design space: one plane, two knobs

Everything the peripheral can be is a point on

$$S = N_{\text{ADC}} \times M, \qquad \text{time-to-genome} \propto \frac{1}{\min(P,\ d\,S)}, \quad d \approx 6.6\ \text{(pixels served / slot / frame)}$$

- **$N_{\text{ADC}}$ — number of ADC channels.** Buys speed with silicon/BOM. Scales ~linearly in cost. SNR-neutral.
- **$M$ — multiplex depth (pixels per sense line/ADC).** Buys speed for free in BOM, but *spends per-pixel SNR*: each pixel loses ~$\log_2 M$ bits of a 16-bit ADC's headroom, against a ~15% R_ct signal that already needs ~2.7 bits just to represent ([[Whitepaper|§4.1.5]]).

The full trade tables (time-to-genome vs $M$ at fixed ADC bank; vs $N_{\text{ADC}}$ at SNR-safe $M$) are in [[Whitepaper|§4.1.5]]. The engineering takeaway for *this device*: **prefer $N_{\text{ADC}}$ over $M$ until BOM forces the trade.** A defensible target design sits at $M \approx 100$–300 (workable-to-marginal SNR) with $N_{\text{ADC}}$ sized to the throughput the product tier needs — e.g. $M\approx300,\ N_{\text{ADC}}\approx40{,}000$ lands a ~2 h 30× genome at marginal-not-reckless SNR.

## Signal chain (block by block)

| Stage | Function | Prototype (4 px) | Scale-out (proposal) |
| --- | --- | --- | --- |
| **Excitation** | Generate orthogonal multisine carriers, 100 Hz–100 kHz | 1 DDS/DAC, single sweep, no orthogonality needed | DAC bank / DDS synthesizing $M$ frequency- or Hadamard-code-orthogonal excitations per sense line |
| **Analog front-end** | Transimpedance / charge amp per sense line; sets noise floor | 4 discrete low-noise TIAs, direct-wired (no mux) | Integrated TIA array at the array edge, one per column/sense line |
| **Mux** | Route pixels onto shared sense lines | **none — direct-wired** | On-chip passive analog mux (row/col select) + FDM/CDM overlay |
| **ADC** | Digitize summed sense lines | 1–4 × 16-bit, ≥1 MSPS bench ADC | Bank of 16-bit RF-sampling ADCs; ~30 MSPS (cheap regime, low $M$) up to ~1 GSPS (aggressive $M\approx5{,}000$) |
| **Digital demux** | Recover per-pixel spectra (FFT for FDM, correlation/Hadamard un-mix for CDM) | trivial (1 pixel/line) | FPGA/ASIC doing streaming FFT or matched-filter demux, one demux engine per ADC |
| **Host I/O** | Stream spectra to dodgson | USB/PCIe, negligible rate | PCIe 5.0 / multiple links; see egress below |

**Excitation orthogonality** is the crux of the scheme and the peripheral's main design freedom:
- **FDM (frequency-division):** each of the $M$ pixels on a line is probed on a distinct carrier comb; separated by FFT after one ADC. Simple, maps cleanly onto the EIS multisine we already use, but $M$ carriers share the sense line's dynamic range.
- **CDM (code-division):** drive rows with orthogonal Hadamard codes, un-mix by correlation. Better noise-averaging (each pixel benefits from the full sequence length), at the cost of more excitation-generation complexity.

Both are pure peripheral-circuit decisions — the pixels never change.

## Prototype device (buildable now)

The [[Whitepaper|§3.2]] four-pixel prototype needs **none of the multiplexing** above — its entire point is to *avoid* the shared-line SNR risk and validate the single-pixel signal first. The prototype peripheral is deliberately minimal:

- 4 dedicated low-noise TIA front-ends, one per pixel, direct-wired (no mux, no FDM/CDM).
- Single multisine excitation source, swept 100 Hz–100 kHz.
- Off-the-shelf 16-bit bench ADC / potentiostat-class front end.
- USB to host; dodgson runs on a laptop.

This board's job is to produce clean, un-multiplexed single-pixel spectra so the SNR of the *raw* signal is characterized before any dynamic-range is spent on multiplexing.

## The multiplexed test rig (the decisive next device)

Between the 4-pixel prototype and any product tier sits **one gating experiment** ([[Whitepaper|§4.1.7]]): measure real per-pixel SNR when pixels genuinely share a line and front-end. That determines the maximum $M$ the *real* signal (not the simulator) tolerates — the single number that turns §4.1 from "architecture permits" into "architecture does."

Proposed rig: a small array (e.g. 8–64 pixels) on **one shared sense line + one ADC**, with FDM excitation, sweeping $M$ from 2 upward and measuring the R_ct-shift recoverability per pixel as headroom shrinks. Cheap to build, and it de-risks every product-scale decision on the $S=N_{\text{ADC}}\times M$ plane.

## Data egress — the one hard I/O floor

At full-cadence full-array readout, the peripheral must move **~2.7 Tbit/s ≈ 340 GB/s** off the ADC bank to the host ([[Whitepaper|§4.1.6]]). This is GPU/HBM-class I/O — real, but ordinary in modern data-acquisition. It sets a floor on host interconnect (multi-lane PCIe 5.0 / dedicated links) and on where demux happens: **demultiplex on the FPGA before egress**, so the host receives per-pixel spectra, not raw summed lines. Lower product tiers (higher $R$, fewer slots) egress proportionally less.

## What is fixed vs. what this device can move

- **Fixed — no peripheral cleverness beats these:** the ~10 ms acquisition floor (100 Hz physics, [[Appendix|B.2]]); prep as the ~35-min single-run wall-clock floor (Amdahl — [[Throughput & Competitive Landscape|§1.4a]]); accuracy (a model/signal property, not a readout one).
- **What the peripheral moves:** number of concurrent slots $S$, hence runs $R$, hence total time-to-genome — down to the single-run/prep floor. And the SNR-vs-time operating point, via the $M$ knob.

## Open questions

1. **Max tolerable $M$ on real silicon** — the test-rig measurement above. Everything downstream is gated on it.
2. **FDM vs CDM** — which orthogonalization gives better recovered-SNR per unit of excitation complexity on *this* electrode chemistry.
3. **Front-end integration** — discrete TIAs (prototype) vs an edge-integrated TIA/AFE array once column counts reach $10^3$–$10^4$.
4. **Where demux lives** — FPGA now; a demux ASIC only if a product tier's egress/power makes it worth it.
5. **Panel-scale** — the genome-in-one-run panel (~24 M synchronized channels, [[Throughput & Competitive Landscape|§1.4]]) exceeds a single panel's driver budget and resolves to *many peripheral boards across many panels*, not one device. Out of scope until a single-panel peripheral is proven.

---

**Sources.** Multiplexing scheme, channel-count math, time-to-genome, and SNR trade tables: [[Whitepaper|§4.1]]. Readout ceiling and Amdahl framing: [[Throughput & Competitive Landscape|§1.4]]. Mux on-resistance, ADC bits/full-scale/quantization noise: `propriumbioscience/dodgson/simulator/config/noise.yaml`. Kinetics windows and acquisition floor: `simulator/config/kinetics.yaml`, `simulator/electrochemical.py`. Data-egress, prep time, and nanopore channel-count comparison are engineering estimates, to be measured on the bench.
