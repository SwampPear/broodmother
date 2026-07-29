![[Pasted image 20260710125837.png]]
**Status:** DRAFT — DIY component plan for a home-built DC magnetron sputter source. Grounded in The Thought Emporium's documented, working build (see [Reference build](#reference-build)); the photo above is our own reverse-engineered rig. Confirm part specs before ordering.

This is the thin-film deposition tool called out in [[Machines]], used to sputter the Ti/Pt/Au/Al layers in the [[Fabrication]] process. The goal of this page is a **buildable bill of materials**, organized by subsystem, that gets us to the [[Risks & Kill-Criteria|single-pixel validation]] — one working sensor pixel with real electrode metal on it — as cheaply as possible. We do not need production uniformity; we need a few good square millimeters of Pt and Au.

# Reference build

The most credible DIY reference is **The Thought Emporium** (Justin Atkin), who built a working magnetron from microwave and machine-shop parts and used it to sputter copper mirrors and metal-oxide films onto glass. His CAD is public and Creative Commons, so we can adapt his geometry directly rather than designing the gun from scratch.

- Video 1 — *My First Successful Metal Coating Machine (Magnetron Sputtering)*: proof of concept.
- Video 2 — *Coat ANYTHING in METAL: Magnetron Sputtering Machine Build* (Nov 2021): the refined machine, this page's basis.
- Early proof of concept — *Plasma Metal Coating… In a Jam Jar*: the minimum-viable jar chamber.
- **STEP files (CC):** `github.com/thethoughtemporium/sputteringsystem` — magnetron body, magnetic core, sputtering gun, target holder, HV passthrough, ground shield, gas manifold, and all gaskets/hardware, with McMaster part numbers embedded in the filenames.

**Two DIY takeaways that shape our BOM:**
1. **Rough vacuum is enough.** His machine sputters on a two-stage rotary-vane pump alone — no turbo or diffusion pump. Magnetron confinement lets a glow discharge strike in the tens-of-mTorr range, so the expensive high-vacuum stage in [[Machines]] is *not* on the single-pixel critical path. (Trade-off: more gas incorporation / lower film purity — acceptable for validation, revisit for production.)
2. **The HV supply is a microwave-oven transformer.** An unmodified MOT + full-bridge rectifier + microwave capacitor, throttled by a variac, gives the several-hundred-volt DC the cathode needs for well under $100.

# How it works

A magnetron sputter source deposits thin metal films by knocking atoms off a solid target with ion bombardment, inside a vacuum chamber backfilled with a low pressure of argon:

1. The chamber is pumped down, then bled back up to a working pressure (~10–100 mTorr) of Ar.
2. The target (cathode) is held at a large negative DC voltage relative to the grounded chamber; the substrate sits on the grounded baseplate (anode) facing it.
3. The voltage strikes a glow discharge. Ar atoms ionize, Ar⁺ ions accelerate into the target, and impact knocks target atoms loose.
4. Permanent magnets behind the target shape a closed magnetic field over its face. This traps secondary electrons near the target surface in a tight loop ("racetrack"), ionizing far more of the local gas than an unmagnetized (diode) source. That's why the discharge is a bright, confined ring hugging the target rather than filling the jar — the pink/violet glow directly under the target in the photo.
5. Sputtered target atoms travel in straight lines and condense on the substrate below, building up a thin film.

# Components (DIY BOM)

Grouped by subsystem. Each item notes the **cheapest path** and, where it exists, the matching part in The Thought Emporium's STEP files.

## 1. Vacuum chamber

- **Chamber enclosure** — an inverted glass jar / desiccator over a flat metal baseplate (rough-vacuum only, so a purpose-made bell jar is overkill). *TE parts:* `Chamber`, `Vacuum Chamber`, `Bell Jar Gasket`. *Cheapest:* a heavy-wall glass jar or a short section of steel/aluminum tube with a viewport.
- **Baseplate** — flat machined plate that doubles as the grounded anode and the vacuum flange; the substrate sits directly on it, in line with the target. *TE part:* `Ground Plate`.
- **Seal** — flat gasket or O-ring sized to the chamber mouth. *TE parts:* `Bell Jar Gasket`, `9263K548` (Buna-N O-ring). Nitrile/silicone is fine at these pressures.
- ⚠️ **Implosion shield** — a glass jar under vacuum can implode; cage or tape it. See [Safety](#safety).

## 2. Vacuum + gas handling

- **Two-stage rotary-vane pump** — the only pump needed for single-pixel. Must reach the low-mTorr range. *Cheapest:* a used HVAC service pump.
- **Vacuum gauge** — thermocouple or Pirani gauge to read chamber pressure into the mTorr range. A cheap analog gauge only confirms rough-out, not working pressure — get a TC/Pirani.
- **Argon supply** — Ar cylinder + two-stage regulator (welding-grade Ar is adequate for validation).
- **Needle valve** — fine control of the Ar bleed to hold working pressure during a run. *TE part:* the gas path uses `Manifold` + `Barbed Fittings` + `5357K31` (barbed hose fitting) + `tubes`.
- **Manifold / valves** — tee the chamber between the pump and the Ar bleed so the pump can be isolated once roughed out. *TE part:* `Manifold`.

## 3. Magnetron (cathode / sputter gun)

This is the part that makes it a *magnetron* rather than a plain diode sputterer, and the part most worth copying wholesale from TE's STEP files.

- **Gun body** — the machined housing that holds the magnets, target, and cooling. *TE parts:* `Magnetron Body`, `Sputtering Gun`, `Sleeve`.
- **Magnet array** — NdFeB magnets as a center pole + surrounding ring of opposite polarity behind the target, forming the closed racetrack field. *TE part:* `Magnetic Core`.
- **Target** — disc of the metal being deposited. For us: **Pt and Au** (plus a **Ti** disc for the 5 nm adhesion layer), 99.99%. *TE part:* `Target` (defines the disc geometry the gun accepts). Small discs are fine for single-pixel; a few mm² of coverage is all we need.
- **Water-cooled base** — the magnets lose field (and can be permanently demagnetized) if they overheat, which kills the racetrack confinement. TE runs a liquid-cooled base; a small pump + water loop or even a Peltier block suffices at our low duty cycle.
- **Ground / dark-space shield** — a grounded shroud gapped closer than the plasma sheath thickness around the target's sides and back, so the discharge can only strike the target *face* and can't sputter the holder or arc to the feedthrough. *TE parts:* `Ground shield cover`, `Ground Stem`, `Ground Stem pt 2`, `Ground Plate`.

## 4. Electrical (HV)

- **HV DC supply** — negative output to the cathode, ~300–800 V under load, current-limited to tens–low-hundreds of mA. *TE recipe (recommended):* unmodified **microwave-oven transformer + full-bridge rectifier + microwave capacitor**, with a **variac** in front of the MOT primary to set power. Alternatives: neon-sign transformer + bridge rectifier, or a flyback + driver board.
- **HV feedthrough** — insulated, vacuum-sealed passthrough carrying the negative HV lead to the cathode, rated well above operating voltage. *TE parts:* `High Current Passthrough`, `High Current Passthrough Nut`, `High Current Rod`, `High Current Insulator`, `Contact Rod`, `Gasket 1/2 High Current`, plus PTFE insulators (`PTFE Gasket`, `PTFE Grommet`, `Teflon washer`, `Stem grommet`).
- **Ground strap** — bond baseplate/chassis to the supply return and to earth ground. *TE part:* copper braid to the `Ground Plate`.

## 5. Substrate side

- **Substrate holder** — for single-pixel, just the grounded baseplate itself, with the die placed in line with the target face. No motion stage or shutter needed at this scale (TE's `Rotary Passthrough` / `Baffle` parts are for larger-area uniformity — skip for now).
- **Shadow mask (optional, DIY alternative to lift-off)** — a thin metal stencil clamped over the die can define the electrode geometry directly during sputtering, sidestepping the photoresist/lift-off flow in [[Fabrication]] for a first pixel. Coarse, but fast.

# Minimum path to single-pixel

The absolute smallest rig that produces a testable pixel:

- [ ] Glass-jar chamber + machined baseplate + O-ring
- [ ] Two-stage rotary-vane pump + TC/Pirani gauge (**no turbo**)
- [ ] Ar cylinder + regulator + needle valve
- [ ] TE-derived magnetron gun (`Magnetron Body` + `Magnetic Core` + `Target`) with a small water/Peltier cooling loop
- [ ] Ground/dark-space shield around the gun
- [ ] MOT + bridge rectifier + microwave cap + variac; HV feedthrough
- [ ] Ti, Pt, Au target discs (99.99%)
- [ ] Shadow mask *or* the full resist/lift-off flow from [[Fabrication]]

Everything else in [[Machines]] §2 (turbo pump, QCM thickness monitor, large-area uniformity) is deferred until after the pixel validates.

# Operating sequence

1. Load a target into the cathode holder; place the substrate on the baseplate, in line with the target face.
2. Seat the jar on the gasket, pump down to base pressure, and confirm the seal holds.
3. Isolate the pump; bleed in Ar via the needle valve to working pressure (~10–100 mTorr).
4. Bring up the HV slowly (variac) until the glow discharge strikes — look for a tight, bright ring hugging the target face, not a diffuse glow filling the jar (diffuse = magnetic confinement not working).
5. Hold for the deposition time needed for target thickness (calibrate by rate × time; a QCM later tightens this).
6. Power down, discharge the supply, vent to atmosphere, and remove the coated substrate.
7. Swap the target (Ti → Pt, or Ti → Au) and repeat per the layer stack in [[Fabrication]].

# Safety

- **High voltage.** The cathode sits at several hundred volts DC and the microwave-cap supply stores a lethal charge. Treat the feedthrough, HV lead, cap, and supply as live whenever powered, and **bleed the capacitor** and discharge before opening the chamber.
- **Implosion risk.** A glass jar under vacuum can implode; cage it or wrap it (blast shield / heavy tape / mesh) rather than trusting the glass alone.
- **Ventilation.** Vent pump exhaust and purge gas to a ventilated area.
- **Heat.** The magnets degrade if the gun overheats — keep the cooling loop running through every deposition.
