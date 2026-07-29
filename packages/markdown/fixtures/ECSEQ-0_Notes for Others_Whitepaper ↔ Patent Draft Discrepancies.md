# Whitepaper ↔ Patent Draft Discrepancies

**2026-07-20** · found while assembling the [[Provisional #1 Filing Package]] and reviewing the [[Whitepaper]]. Not legal advice.

**3 open items.** 🔴 = fix **before publishing the whitepaper or showing investors** (disclosure starts the patent clocks). 🟡 = cosmetic.

| #   | Item                                                           | Owner             | Severity |
| --- | -------------------------------------------------------------- | ----------------- | -------- |
| 1   | Al₂O₃ dielectric: whitepaper says *anodized*, draft said *ALD* | Engineering (fab) | 🔴       |
| 2   | Throughput math ignores Poisson loading (~37% pixel cap)       | Evan (§4.1)       | 🔴       |
| 3   | Faradaic axis (§2.4) written three times + stray chat note     | Whitepaper author | 🟡       |

---

## 1. Al₂O₃ deposition — anodized vs. ALD 🔴

- **What:** [[Whitepaper]] §2.1 says the Au/Pt layers are separated by **anodized** Al₂O₃; the [[ECSEQ/IP & Patents/Provisional Patent Application No. 1 — Draft|patent draft]] said **ALD**. Different processes, different oxide.
- **Where it bites:** pixel cross-section (Fig. 1) and any process claim.
- **Status:** draft now recites **both** → patent priority is safe either way, but the *actual* process is still unpicked.
- **Do this — Engineering:** confirm the intended process, then make the whitepaper and draft agree.

## 2. Throughput math ignores Poisson loading 🔴

- **What:** §4.1.4 treats all **225M pixels as usable**. But loading is Poisson-limited (§2.3), and Poisson single-occupancy maxes out at **1/e ≈ 37%** — the rest are empty or polyclonal and get excluded.
- **Impact:** usable ≈ 83M px → ~**50 Gb/run** < the 96 Gb a 30× genome needs → runs flip **1 → 2** → the flagship "**~36-min genome**" becomes **~72 min**; the 42×/pass figure is really ~15× *usable*.
- **Do this — Evan:** present §4.1.4 as a 100%-occupancy **upper bound**, add a ~37%-derated row, and cross-reference the **active-bias loading** proposal (§2.3) as the lever that could restore it.

## 3. Faradaic axis (§2.4) described three times 🟡

- **What:** the faradaic-axis explanation repeats ~**3× near-verbatim** in §2.4, and a "**Working notes (carried over from chat)**" callout is still inline (plus a duplicated sentence in §2.6.1).
- **Do this — whitepaper author:** dedupe to one clean statement, keep the one real open item (elevated-potential fidelity risk, gated on §3.2), and delete the chat callout.

---

*Internal working notes, confidential. Not legal advice. See [[Notes for Others]].*
