# Machines

Sub-pages:

- [[Photolithography Aligner]]
- [[Magnetron]]

---

## DIY Equipment — 4-Pixel Prototype

Full tooling set to fabricate and run the 4-pixel ECSEQ-1 prototype, grouped by process phase. The build is intentionally DIY-grade (Zeloof-style): passive thin-film, no per-pixel transistors, defect-tolerant — so most tooling can be home-built or bought cheaply. Process steps these map to are in [[Fabrication]]. Items marked (run) are for operating/validating the chip rather than fabricating it.

### 1. Substrate prep & patterning

- **Wafer scribe / cleave tool** — cleave the Si/SiO₂ wafer to die size. *DIY:* diamond scribe + breaking bar.
- **Spin coater** — apply a uniform photoresist layer. *DIY:* BLDC or PC-fan motor + vacuum chuck + speed controller.
- **UV maskless aligner** — expose the resist pattern (no physical masks). See [[Photolithography Aligner]]; modified DLP projector or laser-galvo at \~365–405 nm, plus an alignment camera for layer-to-layer registration.
- **Hot plate(s)** — resist soft-bake / hard-bake and curing. *DIY:* PID-controlled hot plate (±1–2 °C).
- **UV-ozone cleaner** — descum, surface activation, and resist strip; swapped in for an O₂ plasma asher to skip the vacuum-chamber/RF cost. *DIY:* 185/254 nm ozone-producing UVC bulb in a sealed enclosure.

### 2. Thin-film deposition (vacuum)

- **Vacuum chamber** — host sputtering and plasma. *DIY:* bell jar or KF/CF-flanged chamber.
- **Roughing pump** — rough vacuum. *DIY:* rotary-vane pump.
- **High-vacuum pump** — reach base pressure \~10⁻⁵–10⁻⁶ Torr for sputtering. *DIY:* turbomolecular or oil-diffusion pump.
- **DC magnetron sputter source + power supply** — deposit Ti, Pt, Au, and Al. *DIY:* home-built magnetron + DC supply. See [[Magnetron]].
- **Sputter targets** — source metal: Ti, Pt, Au, Al (99.99% purity).
- **Argon supply + flow control** — sputter working gas. *DIY:* Ar cylinder + needle valve or mass-flow controller.
- **Film-thickness monitor** *(optional)* — quartz-crystal microbalance during deposition; otherwise calibrate thickness by deposition rate × time.

### 3. Insulation — anodization

- **DC power supply (0–100 V, current-limited)** — anodize sputtered Al into Al₂O₃.
- **Anodization cell** — beaker + Pt or graphite counter electrode + stir plate + oxalic-acid electrolyte.
- **Chiller / cold bath** — hold the bath at \~15–20 °C for denser, more controlled oxide. *DIY:* ice bath.
- Full recipe in [[Anodization]].

### 4. Wet processing & cleaning

- **Fume hood / wet bench** — safe handling of solvents, developer, etchants, and acids. *DIY:* ventilated, chemical-resistant bench.
- **Ultrasonic bath** — lift-off and cleaning steps.
- **DI water source** — rinses. *DIY:* deionizer cartridge or purchased DI water.
- **N₂ supply + blow-off gun** — drying.
- *Consumables (not machines):* acetone, IPA, photoresist, developer, oxalic acid, chemical etchants, PBS buffer.

### 5. Inspection & metrology

- **Optical microscope + camera** — inspection, alignment, defect and step-coverage checks. *DIY:* metallurgical scope, \~50–1000×.
- **Profilometer** *(optional)* — verify film thicknesses and step heights at the sensor site. *DIY:* stylus or optical; otherwise infer from deposition calibration.
- **Multimeter (DMM)** — DC resistance pad-to-ground and continuity checks.

### 6. Electrical test & EIS readout

- **Potentiostat / impedance analyzer** — the core measurement instrument: CV sweep in PBS for post-fab verification, and the actual EIS sequencing readout (100 Hz–100 kHz complex impedance). *DIY:* AD5940 / ADuCM355-based potentiostat, or a commercial unit.
- **Reference + counter electrode** *(run)* — Ag/AgCl reference + Pt counter in the buffer to complete the EIS cell.
- **Lock-in amplifier** *(optional)* — low-noise impedance at fixed frequencies, as a supplement to the potentiostat.
- **Readout PCB** — for the 4-pixel prototype: direct-wired (no multiplexer) to a 16-bit ADC + microcontroller for serialization to the host.

### 7. Packaging & interconnect

- **Probe station / micromanipulators** — probe individual pixels and place interconnects. *DIY:* manual micromanipulators under a microscope.
- **Bonding setup** — connect the four pixels to a carrier PCB. *Prototype:* silver epoxy via a fine dispenser + cure (per Fabrication notes); wire bonding is the scale-up path.
- **Carrier PCB** — mounts the die and routes its bond pads to the readout.

### 8. Running the prototype (run)

- **65 °C temperature controller / heat block** — isothermal bridge amplification and Bst 2.0 WarmStart sequencing. *DIY:* Peltier or resistive heat block with PID control.
- **Fluid cell / flow chamber** — hold the sequencing buffer over the chip and house the reference/counter electrodes. *DIY:* small gasketed well sealed to the die.
- **Micropipettes + reagent handling** — load template, primers, dNTPs, and buffer.
