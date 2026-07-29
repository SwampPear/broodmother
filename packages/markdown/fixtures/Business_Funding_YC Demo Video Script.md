# YC Demo Video Script

**Runtime:** 56 seconds of voiceover, 60 second cut
**Format:** Voiceover over b-roll and screen recording. No talking head.
**Voice:** Plain, concrete, unhurried. Explain the physics like you would to a smart friend who does not do biology.

---

## Voiceover

> Delivery note: roughly 2.9 words per second. Do not rush the physics beat at 0:10. The last four seconds are silent on purpose.

**(0:00 - 0:10)**
Sequencing is a plumbing problem. Wash the chip, flood it with a labelled base, photograph it, repeat. Millions of dollars of optics and fluidics to answer a question that is electrical.

**(0:10 - 0:19)**
When a polymerase adds a base, it moves charge. Moving charge changes how that spot looks to a small AC signal. Each base moves it differently.

**(0:19 - 0:34)**
So: a flat array of electrodes, and a model trained to read them. No labels, no optics, no wash, all four bases at once. It calls seventy-one percent of bases on simulated signal today. G is at ninety-nine. T is where it breaks.

**(0:34 - 0:43)**
That is a software curve, not a hardware respin. Nanopore made the same climb on an unchanged signal. The chip stays passive. The intelligence lives in the model.

**(0:43 - 0:56)**
All of this is still simulation. The fab line goes up this month. In August we put real DNA on a real pixel. Proprium builds arrays that read biology electrically. DNA is only the first thing.

**(0:56 - 1:00)**
Silence. Logo.

**Word count:** 163

---

## Shot list

| Time | Visual | Source |
|---|---|---|
| 0:00 - 0:05 | Slow push across the workbench. Out of focus foreground, tools and parts. Establishes a real bench, not a slide deck. | Film |
| 0:05 - 0:10 | Hands doing something precise. Handling a coupon, adjusting the stepper stage. No face. | Film |
| 0:10 - 0:16 | `whitepaper/whitepaper/figures/fig01-overview.png`. Slow zoom into the pixel and stack detail on the left panel. | Screen |
| 0:16 - 0:23 | `whitepaper/whitepaper/figures/fig07-raw-spectra.png`. Hold on the 2x2 grid, then push toward one panel. Four colors doing four different things is the entire argument. | Screen |
| 0:23 - 0:28 | `proprium-docs/attachments/whitepaper-pixel-array.png` or `figures/fig03-array.png`. The array render, layers labelled. | Screen |
| 0:28 - 0:34 | `whitepaper/whitepaper/figures/fig10-confusion.png`. Land on the normalized panel as the VO hits the numbers. The G cell must be readable. | Screen |
| 0:34 - 0:39 | `whitepaper/whitepaper/figures/fig09-training.png` or `fig08b-phase2.png`. A curve going up. Cut on the motion of the line. | Screen |
| 0:39 - 0:45 | Strata running (`propriumbioscience/strata/scripts/open.sh`). Scroll the layout script, let the geometry redraw. | Screen |
| 0:45 - 0:51 | **Hero shot. Spin coater spinning up.** Overhead, close, shallow depth of field. Get the liquid spreading and the interference colors. Shoot at 60fps and slow to 50% for the spread. Hold longer than feels comfortable. | Film |
| 0:51 - 0:56 | Stepper. Slow pan across the optics or the stage moving. Low, raking light. | Film |
| 0:56 - 1:00 | Bench wide, or logo on black. Silent. | Film |

**The cut at 0:45 is the most important edit in the video.** You go from a screen full of figures to a real machine moving, exactly as the VO says "the fab line goes up this month." Land that cut on the word "fab."

---

## On-screen text

Four cards. Lower third, small, one line each. The VO carries the content; text catches the numbers the ear drops.

| Time | Card |
|---|---|
| 0:02 | ECSEQ-1 / Proprium Bioscience |
| 0:29 | 71.2% per-base, Q5.4 · simulated signal, L=30 |
| 0:37 | Target: Q20 |
| 0:49 | Single-pixel validation, August 2026 · kill criteria pre-registered |

That last card is doing real work. Your `Risks & Kill-Criteria.md` sets three falsifiable thresholds before the experiment, on the reasoning that setting them afterward is how a kill criterion quietly becomes unfalsifiable. Almost nobody applying thinks that way, and it costs you zero seconds of voiceover.

---

## Production notes

**Do not say 89.6%.** It is an L=100 result your own whitepaper abstract calls a statement about decoder capacity rather than an operating point, and the faradaic ablation pair (54.5% / 76.7%) is formally withdrawn in `revision-todo.md` pending an L=30 faradaic-off run. 71.2% at L=30 is what you can defend in an interview.

**Do not show a GDS file.** `engineering/ecseq-1/*.gds` are 170 to 1,194 byte placeholder boxes from the Strata tutorial. Use the rendered stack diagrams.

**Nothing is fabricated.** The stepper and spin coater are tools, not results. Film them as capability, never as evidence. The VO is careful about this: "the fab line goes up this month" is a claim about July, not a claim about silicon.

**Do not use `peripheral-device-render.png`.** Branded "SEQUAIL PRECISE", not a Proprium asset.

**Caption or move `proprium-docs/attachments/Pasted image 20260710125837.png`.** It reads as a photograph of a working magnetron with plasma lit and it is sitting unlabelled among real assets. It has already caused one misreading.

**Say "simulation" out loud.** It is at 0:43 on purpose. A partner works it out in five seconds regardless, and volunteering it converts a weakness into a signal about how you operate.

**The last line matters.** "DNA is only the first thing" is what makes this a platform application rather than a sequencer application. Do not cut it for time.

**Audio.** Record in a small carpeted room, phone within arm's reach, HVAC off. Adobe Podcast Enhance, then normalize to -14 LUFS. Music at least 18 dB under the voice, or none at all. Silence under a good VO reads as confident.

**Resist grading this heavily.** YC guidance is explicit that post-production effort is a negative signal. One consistent LUT across the b-roll, matched exposure, stop.

---

## If you run long

Cut in this order:

1. The Strata beat (0:39 - 0:45). Nice to have, not load-bearing.
2. The stepper shot (0:51 - 0:56). Extend the spin coater over it instead.
3. "The chip stays passive." Four words, and the passive-array point survives in the figures.

Never cut: the charge-moves beat, the 71.2% number, the simulation admission, or the last line.
