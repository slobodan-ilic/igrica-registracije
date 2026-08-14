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

## Then

Verify against the deployed URL too, not only `localhost` — compare the served
asset hashes with the local `dist/` build to confirm what is live.
