# Double-Layer Range vs. Read Length — A Second, Untracked Read-Length Limit

**2026-07-22** · replaces the earlier "Pt Electrode Return Path" note (same slot — this issue supersedes it per Jack's call). Found while explaining the CPE-Randles model to Jack. Not legal advice.

**Severity: 🔴 — potentially load-bearing, and currently invisible to the single-pixel go/no-go design.**

## What

The dominant signal channel in the model — the double-layer CPE term (Q), explicitly called *"the dominant observable"* in [[Appendix|Appendix B.1]] — is a **short-range electrostatic effect**. Its range is set by the Debye length: at bridge-amplification-strength buffer (tens–100+ mM salt), that's roughly **0.3–1 nm**.

Meanwhile, the thing being sensed — the polymerase's active site, at the growing 3′ end of the strand — physically moves away from the surface-anchored primer as the read progresses. dsDNA rises ~0.34 nm per base pair; even accounting for the strand behaving as a semi-flexible coil rather than a rigid rod (persistence length ~50 nm, so it isn't fully extended), a rough ideal-chain estimate puts the *typical* end-to-end distance at tens of nanometers by a few hundred bases — one to two orders of magnitude past the Debye length the dominant CPE signal is sensitive to.

Nothing in [[Whitepaper]], the [[Provisional Patent Application No. 1 — Filing Copy|patent spec]], or [[Appendix|the appendix]] addresses this. [[Appendix|Appendix B]] describes incorporation as *"localized at the SAM-tethered primer lawn"* — true for the first several bases, but the documents never revisit whether that stays true as the strand grows, or what happens to the signal if it doesn't.

## Why this is distinct from the tracked risks

[[Risks & Kill-Criteria]] failure mode #1 (dephasing) is about the ~1,000 copies in a cluster losing sync *with each other* over time — a population-statistics effect. This is different: it's about whether a **single molecule's own signal** fades as its strand lengthens, independent of any synchronization problem. It would exist even for a perfectly phase-locked cluster, or a true single-molecule read.

**This also means the current validation design can't tell the two apart.** KILL-1 in [[Risks & Kill-Criteria]] tests "ensemble step-signal phase coherence... to ≥ [target] cycles" — but both dephasing *and* double-layer range falloff produce the same observable symptom (accuracy/SNR degrading with read position). A single-pixel run that just watches accuracy decay over a read cannot, by itself, attribute that decay to the right cause.

## What might mitigate it (not yet evaluated)

- The diffusive/Warburg channel (released pyrophosphate and protons diffusing to the electrode, [[Appendix|Appendix B]]) is not distance-limited the same way — small ions diffuse tens of micrometers within a 10–100 ms dwell window, so this pathway could plausibly still reach the electrode from a strand end tens of nanometers away, even if the capacitive ΔQ term can't. Whether this is enough signal on its own, without the dominant CPE term, is unknown.
- Real tethered DNA may lie closer to the surface than an idealized coil estimate assumes (nonspecific SAM/backfill interaction, cluster crowding) — plausible, unquantified.

## Do this

**Owner: whoever designs the single-pixel validation protocol.** Before running KILL-1, add a way to separate the two mechanisms — e.g. compare early-read vs. late-read per-event signal amplitude at matched phase-coherence, or run a deliberately short synchronized template alongside a long one, so a same-shaped decay curve isn't automatically attributed to dephasing by default. If a distance-driven falloff is confirmed, it sets a **hard architectural read-length ceiling** distinct from (and potentially tighter than) the dephasing-derived one in [[Whitepaper|§4.1]].

---

*Internal working notes, confidential. Not legal advice. See [[Notes for Others]].*
