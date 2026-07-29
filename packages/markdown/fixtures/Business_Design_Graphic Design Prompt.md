# Graphic Design Prompt

A production reference for getting an AI (Claude authoring SVG, Claude Code, or an<br>image model) to generate figures in one of two house styles:

- **Style A — Technical Diagram** (distilled from Physical Intelligence's π0 figure):<br>architecture / flow diagrams, system schematics, pipeline figures.
- **Style B — Editorial Illustration** (distilled from Anthropic's research pages):<br>blog/deck heroes, conceptual marketing art, cover images.

They are *different* styles that share a sensibility: muted palettes, hand-drawn<br>restraint, type doing structural work, exactly one accent color, deliberate<br>imperfection. Pick one per artifact — don't blend them.

> **Color caveat:** hex values below are eyeballed from the source screenshots plus<br>brand memory, not official tokens. They're close enough to brief an AI; tune the<br>final swatches against the live sources (`pi.website`, `anthropic.com`).

---

## Style A — Technical Diagram (π-inspired)

### Use it for

ECSEQ-1 sensor-stack / sequencing-flow figures, the Dodgson pipeline, the<br>end-to-end "dNTP → electrode array → impedance → base-caller → reads" schematic,<br>SBIR/Activate system diagrams. This is the workhorse for Proprium's technical<br>figures.

### Canvas & background

- Warm off-white page, **not** pure white.
- A faint **graph-paper / dotted grid** underlay (engineering-notebook feel). Grid<br>is barely-there — structure you sense, not read.

### Color tokens

| Role | Hex | Notes |
| --- | --- | --- |
| Page background | `#FBFAF6` | warm off-white |
| Grid lines/dots | `#E8E5DC` | very low contrast |
| Ink (lines, text) | `#1A1A1A` | near-black, never `#000` |
| Accent fill (gold) | `#E5C04F` | the *only* saturated color |
| Accent line/loops | `#D9A93C` | slightly deeper gold for strokes |
| Box / arrow fill | `#EDEAE2` | warm light gray for flow blocks |
| Card fill | `#F0EDE5` | output cards / panels |
| Muted text | `#9A968C` | the "qualifier" gray (see typography) |

**Discipline:** black + warm grays + one gold. Highlight the single most important<br>element in gold (in π0 it's the Action Expert); everything else is grayscale ink.

### Typography

- **Monospace everywhere** for labels and captions. Stack:<br>`"Berkeley Mono", "JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace`<br>(JetBrains Mono / IBM Plex Mono are the free options).
- **Two-tone label treatment** — the signature move. The keyword is ink black; the<br>qualifier is muted gray. e.g. **`Internet-Scale`**`pre-training.` /<br>**`Open X-Embodiment`**`dataset.` / **`Zero-shot`**`in-distribution tasks`.
- Sentence case, terse, often with a trailing period on flow labels.

### Diagram grammar (layout)

A left-to-right narrative read:

1. **Left column — inputs.** A vertical list of items, each = icon + mono label.
2. **Big filled arrows** (`#EDEAE2`) carry major flows; chunky, blunt, directional.
3. **Center — the model/system box.** White panel, black border with a *slightly<br>rough / hand-drawn* edge (not a crisp CAD rectangle). Nested sub-boxes inside;<br>the key sub-box is gold-filled.
4. **Thin black line arrows** connect the center to outputs (vs. the chunky arrows<br>for primary flow — two arrow weights carry two levels of meaning).
5. **Right column — outputs.** Light-gray cards, each = mono header (two-tone) +<br>image/illustration + caption.
6. Mix **drawn illustration** (inputs, system) with **real photos** (outputs/results).

### Illustration & icons

- **Icons:** monoline glyphs, single consistent stroke weight (\~2px at display<br>size), black, minimal, square or lightly-rounded caps. One concept per icon.
- **Object illustrations** (π's robot arms): line drawing, black outline, **flat<br>single-color fill** in the gold accent, sketchy/inked quality. No gradients, no<br>shading, no 3D.

### Component recipes

- **Chunky flow arrow:** filled `#EDEAE2` block arrow, blunt head, points along the<br>primary read direction.
- **System box:** white fill, `#1A1A1A` border \~2px with hand-drawn jitter; title in<br>mono at top; nested sub-boxes (gray = pretrained/given, gold = the novel part).
- **Output card:** `#F0EDE5` rounded rect, two-tone mono header, image, caption.
- **Connector arrow:** thin black line + small arrowhead, for secondary links.

### How to produce Style A

**Author it as SVG with Claude** — it's geometric and diagrammatic, so an LLM can<br>hand-write clean, editable, perfectly on-palette SVG. Don't use an image model for<br>the diagram structure; reserve image gen only for the flat-fill object<br>illustrations if you want them, then drop them in as elements.

---

## Style B — Editorial Illustration (Anthropic-inspired)

### Use it for

Blog post heroes, the pitch-deck cover, a landing page, any single conceptual<br>image that has to *feel* rather than *explain*. One image, one idea, lots of air.

### Canvas

- Clean **white/cream page**, centered editorial layout, generous whitespace.
- A single **rounded-corner color block** holds the illustration. The block's muted<br>hue *is* the visual identity of the piece.

### Color tokens (the muted "block" palette)

| Role | Hex | Notes |
| --- | --- | --- |
| Page background | `#F0EEE6` | cream / ivory ("paper") |
| Sage block | `#B5C3B0` | the green in the sample |
| Clay / terracotta | `#CC785C` | Anthropic's signature warm accent |
| Dusty blue | `#97B5C8` | alt block |
| Kraft / tan | `#D4A27F` | alt block |
| Slate | `#6B7B7A` | alt block |
| Ink (text + art) | `#181818` | near-black |

Blocks are **desaturated and warm** — muted, never bright. Rotate the block color<br>per post; keep the linework black.

### Typography

- **Headline:** heavy **geometric grotesque**, large, tight leading, near-black,<br>centered. Anthropic's real face is proprietary (Ginto / Styrene family); free<br>analogs: **Bricolage Grotesque** or **Space Grotesque** (Bold), `system-ui`<br>fallback.
- **Eyebrow / category:** small, bold, e.g. `Economic Research`.
- **Date / meta:** regular weight, modest size.
- **Body:** a clean grotesque (Inter / Hanken Grotesk) or a quiet text serif.

### Illustration rules — the heart of the style

- **Single-color black ink line art.** No fill, no color, no shading — just black<br>strokes on the colored block.
- **Organic, variable line weight.** Strokes swell and taper; a woodcut / ink-pen,<br>hand-made quality. Deliberately a little **imperfect** — that's the point.
- **Conceptual / metaphorical**, not literal. (A hand on an abacus stands in for<br>"returns to expertise.") Pick a small physical metaphor, not a diagram.
- One subject, simple composition, sits comfortably inside the block.

### How to produce Style B

Best path is an **image model**, then optionally vectorize:

1. Generate the line illustration with the prompt below (transparent or matched<br>background).
2. Place it on the colored block in your layout.
3. (Optional) Auto-trace to SVG for crisp scaling.

For very simple subjects (a single strand, one hand), Claude can also author the<br>line art directly as SVG paths.

---

## Shared principles (both styles)

- **Restraint:** one accent, one idea per figure, lots of negative space.
- **Muted, warm palettes:** off-white grounds, desaturated blocks. Avoid pure<br>`#000`/`#FFF` and saturated primaries.
- **Hand-made imperfection on purpose:** rough borders, organic strokes. Precision<br>in *layout*, looseness in *line*.
- **Type carries structure:** mono labels (A) or a heavy grotesque headline (B) do<br>real work; don't over-decorate.

---

## Copy-paste prompt templates

### A1 — Technical diagram (Claude → SVG)

> Author a single self-contained SVG figure in the "technical diagram" house style.<br>Canvas: warm off-white `#FBFAF6` with a faint dotted grid `#E8E5DC`. All text in a<br>monospace font. Use a two-tone label treatment: keyword in `#1A1A1A`, qualifier in<br>`#9A968C`. Palette: ink `#1A1A1A`, warm-gray boxes `#EDEAE2`, cards `#F0EDE5`, and a<br>single gold accent `#E5C04F` used only on the most important element. Layout reads<br>left→right: \[INPUTS\] —chunky gray block arrows→ \[CENTER SYSTEM BOX\] —thin black line<br>arrows→ \[OUTPUT CARDS\]. The center box is white with a slightly hand-drawn black<br>border and nested sub-boxes (gray = given, gold = the novel part). No gradients, no<br>shadows, flat fills only. Subject: \<describe your system\>.

### A2 — Monoline icon (Claude → SVG)

> A minimal monoline icon of \<object\>. Single consistent \~2px black stroke `#1A1A1A`,<br>no fill, no shading, square/lightly-rounded caps, one concept, centered in a square<br>viewBox. Flat, schematic, matches an engineering-notebook icon set.

### B1 — Editorial illustration (image model)

> Hand-drawn ink line illustration of \<conceptual metaphor\>. Black ink only, no color,<br>no shading, no fill — just organic strokes with variable, swelling-and-tapering line<br>weight, woodcut / pen-and-ink quality, slightly imperfect and human. Simple<br>composition, single subject, generous negative space, transparent (or `#B5C3B0`<br>sage) background. Minimal, editorial, conceptual — not a technical diagram.

---

## Mapping to Proprium deliverables

| Deliverable | Style | Notes |
| --- | --- | --- |
| ECSEQ-1 end-to-end sequencing flow | A | dNTPs → Pt/Au array → EIS signal → Dodgson → reads; gold = the wash-free EIS step |
| Dodgson architecture (encoder→transformer→faradaic branch) | A | gold = the novel faradaic/Rct-Warburg branch |
| Sensor stack cross-section | A | flat-fill layer illustration, mono layer labels |
| SBIR / Activate "how it works" one-pager figure | A | keep to one read direction, one accent |
| Pitch-deck cover / blog hero | B | e.g. a single inked DNA strand meeting an electrode, black-on-sage |
| Section dividers / marketing | B | rotate block color per section, keep linework black |

**Rule of thumb:** if it *explains a system*, Style A as SVG. If it *sets a tone*,<br>Style B as an illustration. Never mix the two inside one artifact.
