---
name: kviz-design
description: The house visual language shared by every quiz in this workspace. Load before changing any CSS, adding a screen or component, or starting a new app, so the family stays one product instead of drifting back to generic defaults.
---

# House style

The palette comes from **the object the app is about**: a Serbian plate is white
and black, with the blue of the country band and the red of the shield. Every
country added later takes its accents from its own plate the same way.

## Tokens

Defined in `src/index.css`. Use them; do not introduce ad-hoc colours.

| Token | Value | Use |
| --- | --- | --- |
| `--paper` | `#f2f1ec` | page background, warm paper |
| `--card` | `#ffffff` | panels, tooltips-on-light, buttons |
| `--text` | `#15171c` | ink |
| `--muted` | `#5c626e` | secondary text (6.1:1 on paper) |
| `--line` | `#dcd9d1` | hairline borders |
| `--accent` | `#0d3a86` | plate blue — every interactive accent |
| `--accent-soft` | `#eaf0fb` | selected / hover fill |
| `--red` | `#c8102e` | shield red — emphasis, streak, codes |
| `--ok` / `--miss` / `--bad` | green / ochre / red | answer states, on the map |
| `--region*` | blue-greys | map fills; see the file for each state |

## Rules

- **Light, flat, printed** by default, with a dark theme that keeps the same
  identity (see `:root[data-theme='dark']`). Never hardcode a colour — every
  value must come from a token, or the dark theme silently breaks.
- No glassmorphism, no `backdrop-filter`, no background glows or radial
  gradients, in either theme.
- **No gradient text, ever.** Emphasis is a solid colour — usually `--red`.
- **No emoji as UI.** Draw a small SVG mark instead (see `.streak__mark`).
- **Sentence case.** No uppercase + letter-spaced micro-labels.
- **Vary the radii by role**: pills `999px`, cards `12px`, buttons `9–10px`.
  Never one radius everywhere.
- **Shadows are printed-paper subtle**: `0 1px 2px rgba(20,22,26,.05)` plus a
  wide soft one; never a glow.
- **System font stack** (`--font`). No webfont downloads.
- Serbian UI copy throughout, Latin script.

## Map

Reads as an atlas: soft blue-grey land, darker boundaries, a halo behind labels.
Answer colours (`--ok`, `--miss`) must always beat the idle, spotlight and
greyed-out styles — apply idle-only styles only while the region's state is
`idle`.

**Paint order matters.** SVG has no `z-index`: it paints in document order, and a
stroke straddles the edge it sits on, so a neighbour drawn later covers half of
an emphasised region's outline. That looks like borders that are heavy on some
sides and missing on others. Always sort regions by importance before rendering
(plain → spotlit → answered → active); see `ordered` in `QuizMap.tsx`.

## Answer colours

Two hues only: **teal = right, orange = wrong**. A wrong pick and a missed answer
never need telling apart, so they share orange.

Green/red and green/amber are the worst pairings for colour blindness — they
collapse under deuteranopia, which affects ~6% of men. Teal and orange separate
on the blue–yellow axis, which every common form preserves. Verify any change by
simulating deuteranopia, protanopia and tritanopia rather than trusting the eye;
the current pair holds a worst-case contrast of 1.54 in light and 2.96 in dark,
against 1.07 for the green/ochre it replaced.

**Never let colour be the only channel.** A missed peak is ringed, a missed river
is dashed. Someone who cannot see hue at all must still be able to play.

## Audience

Approachable for a child on an iPad, but never so childish that an adult feels
silly opening it among friends. If a choice reads as "kids' app", it is wrong.
