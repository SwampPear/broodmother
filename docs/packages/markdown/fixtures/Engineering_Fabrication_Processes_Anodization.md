# Anodization

## Overview

Convert sputtered Al into Al₂O₃ via electrochemical anodization — the isolation dielectric of the [[Processes|single-pixel build]]. This is the DIY substitute for ALD Al₂O₃. Runs after the Al is laid down in [[Sputter Deposition]] and feeds [[Post-Fab Verification]].

- Rule of thumb: \~1.3 nm/V (e.g., 15 V → \~20 nm; 75 V → \~100 nm)

## Process (per isolation layer)

1. Sputter Al (\~30–50 nm target) — see [[Sputter Deposition]]
2. Anodize: slow ramp to target voltage, then hold until current drops near zero
3. DI rinse + N₂ dry
4. Etch back to reopen the electrode surface where the design needs bare metal (chemical etch)
5. Verify: continuity/coverage check before next layer

## Electrolyte

- Oxalic acid (0.3 M): preferred for thin films (more controlled)
- Sulfuric acid (0.1–0.3 M): faster/more aggressive

Start with oxalic acid.

## Critical parameters

- Ramp: 1–2 V/min
- Temp: \~15–20 °C (cooler = denser, more controlled)
- Endpoint: current \<5% of peak (approx. full conversion)
- Use high-purity Al target (99.99%)

## Equipment

| Item | Notes |
| --- | --- |
| DC power supply (0–100 V, current-limited) | Required |
| Counter electrode (Pt or graphite) | Required |
| Stir plate + beakers/clamps + DI water | Basic bench setup |
| Oxalic acid (reagent grade) | Preferred electrolyte |
| Multimeter | Endpoint/continuity checks |

## Notes / risks

- Edge coverage can be weaker than ALD; mitigate with slightly thicker Al + slow ramp + between-layer checks.
- Open question: does this fit the existing GDS layer ordering, or require re-ordering?
