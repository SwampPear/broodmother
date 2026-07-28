# Processes

Every manufacturing and prep process needed to go from a bare Si/SiO₂ wafer to a running **single-pixel experiment** ([[Whitepaper]] §3.2), each broken out as its own doc. This page is the ordered master flow; the [[Fabrication]] page holds the layer-stack overview and [[Machines]] holds the tooling. The experiment's go/no-go thresholds are owned by [[Risks & Kill-Criteria]], not here.

The prototype target is **4 direct-wired pixels** (no multiplexer) on one die — the smallest thing that validates real electrochemical signal against the model.

## End-to-end flow

**A. Chip fabrication** (dry / bench)

1. [[Substrate Preparation]] — cleave to die size, solvent clean, UV-ozone activate, inspect.
2. **Pt electrode layer** — [[Photolithography]] → [[Sputter Deposition]] (5 nm Ti + 50–80 nm Pt) → [[Lift-off]].
3. **Au electrode / lines layer** — [[Photolithography]] (aligned to Pt) → [[Sputter Deposition]] (5 nm Ti + ~150 nm Au) → [[Lift-off]].
4. **Al₂O₃ isolation** — [[Sputter Deposition]] (30–50 nm Al, blanket) → [[Anodization]] (Al → Al₂O₃) → chemical etch-back to reopen the electrode surface where needed.
5. [[Post-Fab Verification]] — optical/thickness/DC-isolation checks + CV sweep in PBS. **Fabrication acceptance gate.**
6. [[Packaging & Interconnect]] — dice, mount, silver-epoxy bond to carrier PCB, seal fluid well.

**B. Assay prep** (wet lab, on the packaged chip)

7. [[Surface Functionalization]] — thiol-primer SAM lawn on the Au (with blank-chip EIS baseline before, functionalization EIS QC after).
8. [[Template Loading & Amplification]] — load a known template, bridge-amplify (Bst 2.0 WarmStart, 65 °C) to ~1000-copy clonal clusters.

**C. The experiment** — wash-free sequencing loop, all four dNTPs, per-cycle EIS readout. Scoped in [[Whitepaper]] §3.2; pre-registered KILL/PASS rules in [[Risks & Kill-Criteria]]. Not a manufacturing process — the payoff the chain above exists to enable.

## Process library

| Process | Stage | Feeds |
| --- | --- | --- |
| [[Substrate Preparation]] | Fab | Photolithography |
| [[Photolithography]] | Fab (per layer) | Sputter Deposition |
| [[Sputter Deposition]] | Fab (per layer) | Lift-off / Anodization |
| [[Lift-off]] | Fab (per layer) | next layer / Verification |
| [[Anodization]] | Fab (isolation) | Verification |
| [[Post-Fab Verification]] | Fab gate | Packaging |
| [[Packaging & Interconnect]] | Fab → run | Functionalization |
| [[Surface Functionalization]] | Assay prep | Loading & Amplification |
| [[Template Loading & Amplification]] | Assay prep | Sequencing run |

## Notes

- Steps 2–4 build the vertical stack bottom-up (Pt → Au → isolation); the physical stack and thicknesses are in [[Whitepaper]] §2.1 and [[Fabrication]].
- The isolation dielectric is **anodized** Al₂O₃ (the DIY route) rather than the ALD Al₂O₃ named in the top-level chip overview — process reality follows [[Anodization]].
- All tooling, DIY build notes, and the per-process equipment tables live under [[Machines]]; consumables (resist, developer, acids, reagents) are process inputs, not machines.
