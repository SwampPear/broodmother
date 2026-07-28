[[Machines]]
[[Processes]]

Layer-stack overview for the single-pixel build. Each step below is a full process doc under [[Processes]] — the ordered end-to-end flow (including the wet-lab prep and experiment that follow fabrication) lives there; this page is the stack summary.

## Process overview

- Pt and Au sputtered (with Ti adhesion) — [[Sputter Deposition]]
- Al anodized (Al₂O₃) for insulator — [[Anodization]]
- chemical etching — etch-back to reopen the electrode surface

## Substrate prep

Cleave to die size, solvent clean, UV-ozone activate, inspect → [[Substrate Preparation]].

## Layer stack (bottom-up)

### Electrode (Pt)

5 nm Ti + 50–80 nm Pt: [[Photolithography]] → [[Sputter Deposition]] → [[Lift-off]].

### Electrode / lines (Au)

Gold surface electrode and the input/output signal lines (same layer). 5 nm Ti + ~150 nm Au (100–200 nm acceptable; thickness driven by line continuity/step coverage, not resistance): [[Photolithography]] (aligned to Pt) → [[Sputter Deposition]] → [[Lift-off]].

### Isolation (Al₂O₃)

Blanket 30–50 nm Al via [[Sputter Deposition]] → [[Anodization]] → chemical etch-back to open the electrode surface as needed.

## Notes / open items

- Bond pad routing + vias from bottom layer — see [[Packaging & Interconnect]]
- Prototype bonding: silver epoxy — see [[Packaging & Interconnect]]

## Post-fab verification

Optical (no shorts), thickness/step height, DC pad-to-ground resistance, CV sweep in PBS → [[Post-Fab Verification]]. Then [[Packaging & Interconnect]], and the wet-lab prep + experiment ([[Surface Functionalization]], [[Template Loading & Amplification]], [[Risks & Kill-Criteria]]).
