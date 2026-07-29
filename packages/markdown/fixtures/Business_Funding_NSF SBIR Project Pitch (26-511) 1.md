# NSF SBIR Project Pitch — 26-511 (Scientific Instrumentation)

Status: DRAFT — prep for submission, 2026-07-10. Working doc for the Project Pitch (the mandatory on-ramp to a Phase I proposal). Read alongside [[Funding]], [[Business Plan]], [[Throughput & Competitive Landscape]], [[Whitepaper]]. ClickUp: [Submit NSF SBIR Project Pitch (26-511 instrumentation)](https://app.clickup.com/t/86batymb8).

---

## 0. Why 26-511, not 26-510

26-511 is a $40M FY2026 pilot inside the SBIR/STTR relaunch, scoped narrowly to **next-generation scientific instrumentation, novel experimental platforms, and equipment that enables new science** — explicitly including "instrumentation for the coming era of AI-driven discoveries." That framing fits ECSEQ-1 better than the general deep-tech track (26-510): the reviewer asks whether the instrument *opens a class of measurement not otherwise accessible*, not merely whether it's deep tech with a market. Wash-free electrochemical base discrimination is a new measurement modality — a fit for the pilot's thesis, and AI-as-the-instrument is directly on-topic.

## 1. Mechanics (what the pitch is)

- **Non-binding, ~1-page structured form.** Four prompts, hard character limits (below). No budget, no biosketches.
- **It is a gate, not the proposal.** You cannot submit a Phase I / Fast-Track proposal without an official NSF invitation, and the only way to get one is a Project Pitch that program staff accept.
- **Turnaround ~1–2 months.** Invite → you may submit a full proposal by a deadline. A decline comes with a brief reason. An invitation does not guarantee funding.
- **Limits:** max **2 pitches per company per year**; same project/technology max 3 total submissions; only one pitch pending at a time (must hear back before submitting another).
- **New FY2026 constraint:** enhanced foreign-influence and beneficial-ownership disclosure applies across agencies.

## 2. Award structure & deadlines

- **Phase I:** up to **$305,000**, 6–18 months. Fast-Track (Phase I+II) up to $400k + $1,155k. Phase II up to $1.25M; a Strategic Breakthrough tier reaches $30M for later stage.
- **Full-proposal deadlines:** July 27, 2026 · **Nov 4, 2026** · Mar 4, 2027 (then first Wed of Nov / first Thu of Mar / first Wed of Jul annually).
- **Our target: Nov 4, 2026.** July 27 is unrealistic without an invitation already in hand. To make Nov 4, the pitch should go in **now (July 2026)** so the ~1–2 month response lands with proposal-writing time to spare.

## 2.1 Realistic end-to-end timeline

Money does not arrive when you submit — it arrives ~6 months after a full proposal that itself follows an invite. Plan against the whole chain, not just the pitch:

| Milestone | Realistic date | Notes |
| --- | --- | --- |
| Submit Project Pitch | **Jul 2026** | Only one pitch pending at a time; submit early to protect the Nov 4 proposal window. |
| NSF pitch response (invite / decline) | **~Aug–Sep 2026** | ~1–2 months. Decline comes with a brief reason; can revise and resubmit (same project ≤3 total, ≤2 pitches/company/yr). |
| Prepare full Phase I proposal | **Sep–Oct 2026** | ~6–8 weeks of real work: project description, budget + justification, biosketches, disclosures, letters. Needs the invite in hand first. |
| Full-proposal deadline | **Nov 4, 2026** | Our target window. (Miss → Mar 4, 2027 → award slips ~4 months.) |
| NSF merit review | **~Nov 2026 – Apr 2027** | External + panel review; typically ~6 months from deadline to decision. |
| Award decision | **~Apr–May 2027** | An invitation never guaranteed funding; this is the real go/no-go. |
| Phase I period of performance | **starts ~mid-2027**, 6–18 mo | Up to $305k. Single-pixel validation work fits inside this window. |

**Reading of the schedule:** even on the aggressive path, non-dilutive cash is **~9–10 months out** from the pitch and lands *~mid-2027*. So NSF funds the single-pixel hardware validation but does **not** de-risk it on the near-term calendar — bridge funding (Activate, angel) or self-funding still governs whether the gating experiment happens before mid-2027. Slipping the pitch past summer 2026 cascades the whole chain by a full deadline cycle (~4 months). See [[Funding]] for the parallel non-dilutive / equity paths and how they gate on the same single-pixel result.

## 3. Eligibility check

- US small business, ≤500 employees incl. affiliates. ✔ (confirm entity registration: SAM.gov, SBIR.gov company registry, NSF ID.)
- **≥66.7% of Phase I R&D performed in-house** (by budget). Plan fabrication/outsourcing accordingly.
- PI employed ≥51% by the company; PI effort ≥1 person-month per 6 months (Phase I).
- STTR variant would require a nonprofit research-institution partner and ≥40% by the small business / ≥30% by the institution — only relevant if we route fabrication through a university fab.

## 4. Drafted pitch answers (ECSEQ-1)

Character counts are the ceiling; keep each under. These are first drafts to edit down against [[Whitepaper]] wording.

### Q1 — Technology Innovation (≤3,500 char)
ECSEQ-1 is a wash-free, label-free DNA sequencer that reads polymerase kinetics *electrochemically* instead of optically. A flat, passive silicon array of Au/Pt thin-film electrode pixels (2 µm pitch) sits under a sequencing-by-synthesis reaction in which all four natural dNTPs are present simultaneously — no reversible terminators, no fluorescent labels, no flow cell, no per-cycle wash. As each base incorporates, the closed-fingers polymerase state perturbs the local double-layer, and a 50-point AC impedance spectrum (100 Hz–100 kHz) acquired *inside* the incorporation dwell encodes a base-dependent kinetic signature. A two-stage neural network is the actual instrument: a per-event CNN embeds each spectrum, and a temporal transformer integrates sequence context across the read to call bases. The core high-risk innovation is that base identity can be discriminated from intrinsic electrochemical kinetics alone — turning a cheap, reusable, transistor-free electrode array plus a model into a sequencer, where every gain in model capability upgrades the instrument without touching the chip.

### Q2 — Technical Objectives and Challenges (≤3,500 char)
The foundational claim to prove is that real incorporation events produce *distinguishable* impedance signatures on the Pt/Au stack. Phase I objectives: (1) fabricate a minimal 4-pixel, direct-wired prototype (no multiplexer) with the specified isolation stack (Au/thiol-SAM → ALD Al₂O₃ → Pt → Al₂O₃ → Si/SiO₂); (2) run isothermal bridge amplification to form ~1000-copy clusters and drive wash-free SBS with all four dNTPs; (3) acquire per-event EIS during incorporation and measure whether the four bases separate above noise; (4) recalibrate the physics simulator against measured parameters and fine-tune the model from its synthetic-trained checkpoint; (5) demonstrate that temporal/consensus decoding lifts per-event discrimination to a useful per-read accuracy. Key challenges and risks: SNR at the 100 Hz frequency floor, where one full sweep must fit inside the shortest (~66 ms) chemistry window while the enzyme keeps moving; within-group confusion (A↔G, C↔T) that dominates per-event error; and the Ion Torrent cautionary case — proving the kinetic+molecular+temporal read does not inherit a homopolymer/indel failure mode the way cumulative-proton counting did. Success criterion: measured four-base separation and consensus accuracy consistent with the simulator, converting the central technical risk from "does the physics work" to "can the array and readout scale."

### Q3 — Market Opportunity (≤1,750 char)
Sequencing cost and speed are structurally set by optics, consumable flow cells, and per-cycle washes — the $0.3–1.25M instruments and $11k+ per-run kits of Illumina, PacBio, and others exist to run and image those washes. ECSEQ deletes all three: a passive thin-film array (no optics, no per-pixel transistors), a reusable surface (50–100 runs via thiol-gold anchor), and natural dNTPs from one common pool. That collapses recurring cost toward buffer + polymerase + natural nucleotides and makes the instrument cheap and reusable. Beneficiaries: research labs priced out of high-end sequencers, and — on the roadmap — point-of-care and home diagnostics that need a low-cost, wash-free reader. As a 26-511 instrument, the payoff is a new low-cost electrochemical measurement modality that scales with silicon area on flat-panel-display fab economics rather than with optics.

### Q4 — Company and Team (≤1,750 char)
[NEEDS FOUNDER INPUT] Proprium Bioscience is a biointegrated-semiconductor company building silicon sensor arrays that interface with biological processes, using AI as the primary instrument. Fill in: founder/PI name, relevant background (semiconductor/EE, electrochemistry, ML, genomics), why this team can execute chip fabrication + electrochemistry + basecalling model, any fab/lab access or advisors, and prior work (the physics simulator + trained two-stage model already exist and drive the design). Confirm PI meets the 51%-employment / ≥1 person-month effort requirement.

## 5. Open items before submitting

- [ ] Confirm company registrations: SAM.gov (active), SBIR.gov company registry, NSF ID / Research.gov account.
- [ ] Write Q4 team answer (founder to supply bios / PI designation).
- [ ] Verify the Phase I R&D plan keeps ≥66.7% in-house given fabrication needs (decide in-house vs. university fab; the latter pushes toward STTR).
- [ ] Prepare beneficial-ownership / foreign-influence disclosure info.
- [ ] Final pass trimming each answer under its character limit; align claims with [[Whitepaper]] and the honest accuracy framing in [[Throughput & Competitive Landscape]] (per-read ~88% is simulation-only — do not overclaim).
- [ ] Submit the pitch (target: July 2026) to leave runway for the Nov 4, 2026 full-proposal deadline.

## Sources

Accessed 2026-07-10:
- [NSF 26-511 solicitation](https://www.nsf.gov/funding/opportunities/small-business-innovation-research-small-business-technology-0/nsf26-511/solicitation)
- [NSF SBIR — Project Pitch (prompts & limits)](https://seedfund.nsf.gov/apply/project-pitch/)
- [NSF SBIR — How it works / eligibility](https://seedfund.nsf.gov/apply/get-started/)
- [BBCetc — 26-510 & 26-511 overview](https://bbcetc.com/nsf-sbir-sttr/the-nsf-has-published-its-new-sbir-sttr-solicitation-26-510-and-26-511/)
- [Granted AI — relaunch, $250M, instrumentation lane](https://grantedai.com/news/nsf-sbir-sttr-250m-2026-05-31)
