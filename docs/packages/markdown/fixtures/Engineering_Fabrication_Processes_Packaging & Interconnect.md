

## Overview

Mount the verified die on a carrier and wire its pixels out to the readout so it can be run. For the 4-pixel prototype this is deliberately crude: direct-wired, no multiplexer, silver-epoxy bonds to a carrier PCB that routes to a 16-bit ADC + microcontroller. Final fabrication stage of the [[Processes|single-pixel build]], between [[Post-Fab Verification]] and the wet-lab prep.

## Process

1. **Dice / singulate** the die to final size if not already at size.
2. **Mount** the die to the carrier PCB.
3. **Bond** each pixel's bond pads to the carrier traces — **silver epoxy** via a fine dispenser, then cure. (Wire bonding is the scale-up path; silver epoxy is the prototype primitive.)
4. **Continuity check** — DMM each pixel through its bond to the carrier pad; confirm no bond-to-bond shorts.
5. **Seal the fluid well** — gasketed well over the die that holds sequencing buffer and houses the Ag/AgCl reference + Pt counter electrodes (added at run time).

## Critical parameters

- **Epoxy dispense control** — a bridge between adjacent pads shorts pixels; keep beads small and separated.
- Bonds and the fluid-well seal must survive **65 °C** operation (bridge amplification / Bst sequencing) without lifting or leaking.
- Leave the electrode active area **open to the well**; epoxy and gasket touch pads and die edge only.

## Equipment

| Item | Notes |
| --- | --- |
| Probe station / micromanipulators | Probe pixels, place interconnects. *DIY:* manual under a microscope. |
| Silver epoxy + fine dispenser + cure | Prototype bonding |
| Carrier PCB | Mounts die, routes pads to readout |
| Readout PCB | Direct-wired (no mux) → 16-bit ADC + MCU, serialized to host |
| Fluid cell / flow chamber | Gasketed well sealed to the die; holds buffer + ref/counter electrodes |

## Notes / risks

- Bond-pad routing + vias from the bottom layer is an open fab item ([[Fabrication]] notes).
- This is the interface where fabrication hands off to the run — the well, reference/counter electrodes, and readout here are what [[Surface Functionalization]] and the sequencing loop build on. Run tooling in [[Machines]] §6–8.
