# Photolithography

## Overview

Pattern each metal layer's geometry into a photoresist mask so that the sputtered film lands only where wanted (defined by [[Lift-off]]). Run once per patterned layer — Pt electrode, then Au electrode/lines — using the maskless [[Photolithography Aligner]] with layer-to-layer alignment. Patterning stage of the [[Processes|single-pixel build]].

## Process (per patterned layer)

1. **Spin resist** — dispense photoresist, spin to a uniform film (speed sets thickness).
2. **Soft-bake** — hot plate, drive off solvent (per resist datasheet).
3. **Align + expose** — maskless UV aligner at ~365–405 nm; for layers after the first, register to the previous layer's alignment marks via the alignment camera.
4. **Post-exposure bake** *(if resist requires)*.
5. **Develop** — clear exposed (or unexposed) resist to open the pattern; DI rinse; N₂ dry.
6. **Inspect** — confirm feature fidelity and alignment at the sensor site under the microscope before deposition.

## Critical parameters

- **Resist thickness** set for a clean lift-off profile — aim for resist thicker than the metal to be deposited, ideally with an undercut/re-entrant profile (image-reversal or LOR underlayer) so the metal breaks at the resist wall.
- **Bake temps/times** per resist datasheet; PID hot plate held to ±1–2 °C.
- **Alignment registration** is the tight tolerance at 2 µm pitch — the prototype's 4-pixel, direct-wired layout relaxes this vs. the full array but marks still matter for Pt↔Au overlay.

## Equipment

| Item | Notes |
| --- | --- |
| Spin coater | Uniform resist. *DIY:* BLDC/PC-fan motor + vacuum chuck + speed controller. |
| PID hot plate(s) | Soft/post-exposure/hard bake, ±1–2 °C. |
| UV maskless aligner | Exposure + overlay. See [[Photolithography Aligner]]; DLP projector or laser-galvo at ~365–405 nm + alignment camera. |
| Developer + DI + N₂ | Pattern development, rinse, dry. |
| Optical microscope + camera | Feature/alignment inspection. |

## Notes / risks

- The resist sidewall profile — not the exposure itself — is what makes or breaks [[Lift-off]]; get an undercut.
- Consumables (resist, developer) are process inputs, not tooling; see [[Machines]] §4.
- Aligner SOP/lamp/alignment spec is still TBD in [[Photolithography Aligner]].
