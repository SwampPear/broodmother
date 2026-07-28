## Overview
Remove the patterned photoresist along with the metal on top of it, leaving metal only in the openings. Runs immediately after deposition, once per patterned metal layer (Pt, then Au). Patterning-completion stage of the [[Processes|single-pixel build]].

## Process (per patterned layer)
1. **Soak** the die in acetone (resist solvent) until the resist under the metal begins to dissolve.
2. **Light sonication** to break and float off the metal sitting on the resist — brief, low power.
3. **Rinse** IPA → DI; **N₂ dry**.
4. **Inspect** — metal remains only in the intended geometry; no bridging flakes or torn features at the sensor site.

## Critical parameters
- **Resist profile is everything** — an undercut/re-entrant sidewall (set in [[Photolithography]]) leaves a break in the metal at the resist wall so solvent can get under it. Conformal metal over a positive slope will not lift cleanly.
- **Sonication low and short** — too aggressive tears the wanted features off with the unwanted metal; too gentle leaves flakes that redeposit as shorts.
- Fresh acetone; don't let lifted metal flakes settle back onto the die.

## Equipment
- ultrasonic bath for lift-off + cleansing
- Acetone / IPA / DI for solvent, rinse
- N₂ blow-off gun for drying
- PL/Microscope machine for post-lift-off inspection