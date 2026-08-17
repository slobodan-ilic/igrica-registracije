---
name: visual-qa
description: Check a UI change in a real browser before calling it done — screenshots at three sizes, contrast, touch targets, and real input events. Use after any visual or interaction change to this app.
---

# Visual QA

Never report a UI change as working on the strength of the code alone.

## Drive a real browser

`puppeteer-core` is a dev dependency; Chrome is at
`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`. Launching it
needs `dangerouslyDisableSandbox: true` on the Bash call.

**Use real input, never synthetic events.** `dispatchEvent(new MouseEvent(...))`
bypasses hit-testing and pointer capture, and has already passed against a build
where clicking was completely broken for real users. Use `page.mouse.click()`,
`page.mouse.down/move/up()`, `page.mouse.wheel()`, and CDP
`Input.dispatchTouchEvent` for touch.

## Every pass

1. **Three viewports**: 390×844 phone, 834×1112 tablet, 1440×900 desktop.
2. **Screenshot and actually look at it** with the Read tool — do not infer.
3. **Contrast**: compute ratios for text on its real background; AA needs 4.5:1
   for body text, 3:1 for large.
4. **Touch targets**: interactive elements ≥ 40px on the tablet viewport.
5. **Console**: assert zero `pageerror` and zero console errors.
6. **Both input models**: mouse (hover, click, drag, wheel) and touch (tap,
   drag-to-pan, pinch) — they take different code paths here.

## A check that tests nothing passes

Twice now a green check has been meaningless. Once the tooltip check ran in a
browser launched with `--touch-events=enabled`, where the app shows no hover
tooltip at all, so it verified nothing and reported a tick. Once a selector was
simply wrong, so the loop skipped every iteration.

So: **count what you actually exercised, and fail on zero.** `checked 34, worst
0.0px` is a result; a bare tick is not. If a check can pass without the thing
under test ever appearing, it will eventually do exactly that.

The same applies to selectors that catch more than intended — `[class*="--kim"]`
matched the legend swatch as well as the regions, and every count came back one
too high. Scope to the thing (`[data-code][class*="--kim"]`), and print the
count so an off-by-one is visible rather than silently absorbed.

## Floating UI must stay inside its container

Tooltips, pickers and popovers get positioned from the cursor, and near an edge
they leave the frame. The rule: prefer one side, flip to the other when there is
no room, and clamp along the other axis using the element's **measured** size.
Two traps, both hit here:

- **Measure after every render, not on a dependency list.** The element's size
  changes with its content, and any list of dependencies is a guess about when.
  Write state only when the position actually changed, or the effect loops.
- **Check the entrance animation.** A keyframe left over from CSS-based
  positioning (`translate(-50%, calc(-100% - 8px))`) threw the tooltip a full
  height off the top for the length of the animation, long after the JS was
  correct.

## Then

Verify against the deployed URL too, not only `localhost` — compare the served
asset hashes with the local `dist/` build to confirm what is live.
