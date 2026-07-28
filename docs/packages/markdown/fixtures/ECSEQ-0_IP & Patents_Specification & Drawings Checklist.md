# 📑 Specification & Drawings Checklist

**Working copy — Proprium Labs, Inc. — Confidential** · *Prepared 2026-07-20*

> The **specification** is the one document that actually secures the priority date — everything else in [[Provisional #1 Filing Package]] is a wrapper around it. This note tracks getting the spec and its figures filing-ready. The spec body is [[copyå/ECSEQ-1/IP & Patents (Jack)/Provisional #1 Filing Package/Provisional Patent Application No. 1 — Draft]].
>
> Not legal advice. A registered practitioner should review §112 support and claim scope before filing.

---

## 1. Specification

- **Source:** [[copyå/ECSEQ-1/IP & Patents (Jack)/Provisional #1 Filing Package/Provisional Patent Application No. 1 — Draft]]
- **Requirement:** must satisfy 35 U.S.C. §112 (written description + enablement) *for every feature intended for later claims.* Anything not adequately described here gets only the later non-provisional date — the single most common way provisionals fail (see [[Patent Plan]]).
- **No working prototype required** — a sufficiently detailed engineering description ("constructive reduction to practice") is enough, and the [[Whitepaper]] + physics simulator provide it (see [[Patent Plan]]).
- **Claims:** optional in a provisional, harmless to include.

### ⚠️ Must-fix before this becomes the filed spec

- [ ] **Sync draft to the current [[Whitepaper]].** Flagged in [[Patent Plan]] — the draft still carries outdated specs:
  - Model is described as **dual-branch** CNN (draft §Summary item 5, Fig. 6) → whitepaper is **tri-branch** (adds the faradaic branch).
  - Array is **960×960 / ~1.92 mm × 1.92 mm (~3.7 mm²)** (draft §2, Fig. 2) → whitepaper is **900 mm²** at 2 µm pitch (~225M pixels).
- [ ] **Confirm inventorship** (draft §Inventors is a placeholder) → flows into [[Form SB-16 — Provisional Cover Sheet]] and [[Form AIA-14 — Application Data Sheet]].
- [ ] **Pull the PROPOSAL mechanisms into the spec at description level** — multidentate anchor, active-bias loading, learned band-selector — per [[Patent Plan]] ("cast the disclosure as wide as possible; it costs nothing").
- [ ] Convert the finalized spec to a clean **PDF** for upload; record its **page count** on [[Form SB-16 — Provisional Cover Sheet]].

---

## 2. Drawings

- **Requirement:** include drawings if they are needed to understand the invention. **Informal / hand drawings are accepted in a provisional** — but *missing* a figure the text relies on = unsupported disclosure. Include them.
- The draft currently defers drawings ("to be provided at non-provisional filing"). **Recommendation:** produce at least informal versions of Figs. 1–7 now so the disclosure is self-supporting, rather than deferring.
- Attachments belong in the top-level `attachments/` folder per vault convention; embed with `![[filename]]` and record the **sheet count** on the cover sheet and ADS.

### Anticipated figures (from the draft)

| Fig. | Subject | Status | Note |
| --- | --- | --- | --- |
| 1 | Single-pixel cross-section: Au/Pt stack, ALD Al₂O₃ isolation, thiol-SAM primer surface, bridge-amplified cluster on flat surface | [ ] not produced | |
| 2 | Array layout: ~2 µm pitch, polymer isolation grid; production array; 4-pixel direct-wired prototype | [ ] not produced | ⚠️ update array size to **900 mm²** to match whitepaper (draft says 960×960 / 1.92 mm) |
| 3 | AC-EIS measurement chain: AC source → per-layer electrode-to-solution measurement → peripheral analog mux → off-chip ADC → host compute | [ ] not produced | |
| 4 | CPE-Randles equivalent circuit and composite stack impedance Z(ω) | [ ] not produced | |
| 5 | Representative complex-impedance spectra (Nyquist + Bode), baseline vs. incorporation, four bases | [ ] not produced | |
| 6 | Two-stage base caller: SpectrumEncoder + TemporalBasecaller (transformer) | [ ] not produced | ⚠️ update to **tri-branch** encoder to match whitepaper (draft says dual-branch) |
| 7 | Optional faradaic axis: Au biased toward guanine oxidation onset; base-dependent low-frequency charge-transfer arc | [ ] not produced | |

> Existing whitepaper figures in `attachments/` (pixel array, throughput envelope, training curves, etc.) can seed several of these — reuse rather than redraw where they cover the same content.

---

## Final assembly

- [ ] Spec PDF finalized (synced, inventorship set, PROPOSALs included) — page count: ______
- [ ] Drawings PDF finalized — sheet count: ______
- [ ] Both counts transcribed to [[Form SB-16 — Provisional Cover Sheet]] and [[Form AIA-14 — Application Data Sheet]]
- [ ] Every feature intended for later claims confirmed present in the text (§112 support)

---

*Working copy for preparation only. Not legal advice.*
