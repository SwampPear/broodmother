# Post-Fab Verification

## Overview

Acceptance test on the finished die *before* any wet-lab prep: confirm the electrodes are geometrically sound, correctly thick, electrically isolated, and electrochemically alive. This is fabrication QC — distinct from the science experiment, whose go/no-go thresholds live in [[Risks & Kill-Criteria]]. Gate at the end of the [[Processes|single-pixel build]] fabrication chain; a die that fails here never enters [[Surface Functionalization]].

## Process

1. **Optical inspection** — no shorts, no bridging flakes, no torn features at the sensor site (Pt↔Au and line↔line).
2. **Thickness / step height** — verify Pt, Au, and Al₂O₃ thicknesses and step heights at the sensor site. *Profilometer if available; else infer from [[Sputter Deposition]] rate calibration.*
3. **DC isolation** — DMM resistance each pad to ground and between electrodes: electrodes must be isolated (open) where the design says so, continuous where it says so.
4. **CV sweep in PBS** — cyclic voltammetry in PBS buffer to confirm a clean, expected electrochemical window at the exposed electrode (the electrode is wet-active, not passivated over).

## Critical parameters

- Run **DC isolation before wetting** — a short found dry is a fab defect; a short found wet is ambiguous.
- The **CV sweep is the first electrochemical liveness check** and previews the blank-chip EIS baseline that opens the single-pixel run ([[Risks & Kill-Criteria]] step 1).
- Record per-pad results; the prototype's 4 pixels are direct-wired, so each is checked individually.

## Equipment

| Item | Notes |
| --- | --- |
| Optical microscope + camera | Short/defect inspection |
| Profilometer | *Optional*; stylus or optical. Else infer from deposition calibration. |
| Multimeter (DMM) | DC resistance pad-to-ground, continuity |
| Potentiostat + PBS + Ref/counter electrodes | CV sweep; same instrument used for the EIS run |

## Notes / risks

- A pixel that passes DC isolation but fails CV points at a surface/electrochemical problem, not a wiring one — triage accordingly.
- Passing this gate means the *hardware* is sound; whether it produces base-discriminating signal is the separate question owned by [[Risks & Kill-Criteria]].
