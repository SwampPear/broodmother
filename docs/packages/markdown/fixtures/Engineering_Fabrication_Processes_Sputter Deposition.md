## Overview

Deposit the thin metal films by DC magnetron sputtering: a Ti adhesion layer followed by the electrode metal (Pt or Au), and the Al that [[Anodization]] later converts to Al₂O₃. Uses home-built [[Magnetron]] source. All targets 99.99% purity.

| Layer                | Thickness                         | Stack                                        | Notes                                                             |
| -------------------- | --------------------------------- | -------------------------------------------- | ----------------------------------------------------------------- |
| Pt electrode         | 5 nm Ti + 50–80 nm Pt             | primary impedance electrode                  | over patterned resist                                             |
| Au electrode / lines | 5 nm Ti + ~150 nm Au (100–200 nm) | surface electrode + signal lines, same layer | thickness driven by line continuity/step coverage, not resistance |
| Al (→ Al₂O₃)         | 30–50 nm Al                       | isolation precursor                          | blanket; converted in [[Anodization]]                             |
## Process (per layer)
1. Load the target (Ti, Pt, Au, or Al) and place the patterned die on the grounded baseplate, in line with the target face
2. Pump down, then bleed Ar to working pressure (~10–100 mTorr)
3. Strike the discharge and deposit the **Ti adhesion layer** (~5 nm) first
4. Without breaking the stack, switch to the electrode target and deposit **Pt (50–80 nm)** or **Au (~150 nm)** to the target thickness.
5. Vent, unload. Metal now covers resist + open areas; proceed to [[Lift-off]]
6. For isolation: deposit **Al (30–50 nm)** blanket, then [[Anodization]]

## Critical parameters
- **Ti adhesion first, every metal layer** Pt and Au will not adhere to oxide without it.
- **Thickness by rate × time** calibrate deposition rate first
- **Working pressure / power** set the rate and film stress; keep the magnet cooling running so the racetrack confinement holds (see [[Magnetron]])
- Rough-vacuum-only deposition is acceptable for validation — trades film purity for cost; see [[Magnetron]] reference build

## Equipment

| Item                                               | Notes                        |
| -------------------------------------------------- | ---------------------------- |
| DC magnetron sputter source + supply               | See [[Magnetron]]. *DIY.*    |
| Vacuum chamber + roughing pump + Ar + needle valve | Rough-vacuum sputter setup   |
| Sputter targets                                    | Ti, Pt, Au, Al — 99.99%      |
| Film-thickness monitor (QCM)                       | *Optional*; else rate × time |
