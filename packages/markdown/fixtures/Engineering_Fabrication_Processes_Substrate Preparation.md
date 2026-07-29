# Substrate Preparation

## Overview

Cleave the Si/SiO₂ wafer to die size and get an atomically clean, particle-free, activated surface before the first patterning step. Everything downstream (adhesion, resist wetting, lift-off yield) depends on this being done right. First process in the [[Processes|single-pixel build]].

- Substrate: Si with thermal SiO₂ (the SiO₂ is the base isolation under the stack; see [[Whitepaper]] §2.1)
- Prototype target: one die large enough for 4 direct-wired pixels + bond pads

## Process
1. **Cleave** the wafer to target die size — diamond scribe + breaking bar.
2. **Solvent clean:** acetone → IPA → DI rinse → N₂ dry.
3. **UV-ozone descum / activate:** 185/254 nm, 15–20 min in a sealed enclosure (also grows a clean hydrophilic oxide top for resist wetting).
4. **Optical inspection:** no particles, streaks, or residue at the intended sensor site before proceeding.

## Critical parameters
- Handle only by the edges; never touch the active face
- Run steps back-to-back, do not let a cleaned die sit exposed to air/particulate before resist coat
- UV-ozone doubles as the resist-strip / re-clean step between failed layers

## Equipment

| Item | Notes |
| --- | --- |
| Diamond scribe + breaking bar | Cleave to die size. *DIY.* |
| Solvent set (acetone, IPA) + DI water | Bench clean |
| N₂ blow-off gun | Dry |
| UV-ozone cleaner | 185/254 nm ozone-producing UVC bulb, sealed enclosure. *DIY.* |
| Optical microscope + camera | Particle/defect inspection. ~50–1000×. |
