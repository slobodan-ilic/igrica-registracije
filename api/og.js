// The picture a shared link shows: the country's plate, drawn large.
//
// A link to this quiz used to preview as a grey rectangle, which is a poor
// advertisement for an app whose whole subject is how a plate looks. So the
// preview is a plate — the same shape, band and lettering the app draws, at the
// size a chat app will show it.
//
// Rendered here rather than shipped as six pictures because the daily changes
// country every day, and because a picture per country per size is six files to
// forget to update.

import { ImageResponse } from '@vercel/og'

export const config = { runtime: 'edge' }

/**
 * What every country's plate needs, and nothing more than the picture uses.
 *
 * The arms matter more here than anywhere: at preview size a Croatian and a
 * Slovenian plate are both a blue band and black letters, and it is the
 * šahovnica and the Ljubljana dragon that tell them apart. They are the same
 * files the app draws, in PNG — the renderer reads PNG and JPEG and skips
 * anything else without saying so.
 */
const PLATES = {
  srbija: { mark: 'SRB', band: '#0d3a86', code: 'BG', tail: '000-AA', label: 'Srbija', arms: 'rs' },
  hrvatska: { mark: 'HR', band: '#003399', code: 'ZG', tail: '0000-AA', label: 'Hrvatska', arms: 'hr' },
  makedonija: { mark: 'NMK', band: '#1029c4', code: 'SK', tail: '1234 AB', label: 'Makedonija' },
  crnagora: { mark: 'MNE', band: '#003399', code: 'PG', tail: 'AB 375', label: 'Crna Gora', arms: 'me' },
  slovenija: { mark: 'SLO', band: '#003399', code: 'LJ', tail: 'AA-000', label: 'Slovenija', arms: 'LJ' },
  jugoslavija: { mark: '', band: '', code: 'TG', tail: '326-851', label: 'Jugoslavija' },
}

/**
 * Yugoslavia's petokraka, as a shape rather than the character ★ — the font
 * this renders in does not carry that glyph, and a missing glyph draws as an
 * empty box, which is a worse advertisement than no star at all.
 */
const STAR =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
      '<path fill="#c8102e" d="M50 4 61.8 37.6 97 37.6 68.6 58.4 79.4 92 50 71.2 20.6 92 ' +
      '31.4 58.4 3 37.6 38.2 37.6Z"/></svg>',
  )

/** Facebook, WhatsApp and the rest all crop toward this. */
const W = 1200
const H = 630

export default function handler(req) {
  const url = new URL(req.url)
  const topic = url.searchParams.get('t') ?? 'srbija'
  const plate = PLATES[topic] ?? PLATES.srbija
  const yu = topic === 'jugoslavija'
  const site = `${url.protocol}//${url.host}`

  return new ImageResponse(
    {
      type: 'div',
      props: {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 46,
          background: '#f2f1ec',
          fontFamily: 'sans-serif',
        },
        children: [
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                height: 210,
                padding: 8,
                borderRadius: 20,
                background: '#ffffff',
                border: '6px solid #14161a',
              },
              children: [
                plate.mark && {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                      width: 96,
                      paddingBottom: 14,
                      borderRadius: 12,
                      background: plate.band,
                      color: '#ffffff',
                      fontSize: 34,
                      fontWeight: 700,
                    },
                    children: plate.mark,
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      gap: 26,
                      padding: '0 34px',
                      fontSize: 124,
                      fontWeight: 700,
                    },
                    children: [
                      { type: 'span', props: { style: { color: yu ? '#1c2a63' : '#101215' }, children: plate.code } },
                      plate.arms && {
                        type: 'img',
                        props: { src: `${site}/img/grbovi/${plate.arms}.png`, height: 96 },
                      },
                      yu && { type: 'img', props: { src: STAR, width: 74, height: 74 } },
                      { type: 'span', props: { style: { color: '#b9bec6' }, children: plate.tail } },
                    ].filter(Boolean),
                  },
                },
              ].filter(Boolean),
            },
          },
          {
            type: 'div',
            props: {
              style: { display: 'flex', fontSize: 58, fontWeight: 700, color: '#15171c' },
              children: 'Koja je ovo tablica?',
            },
          },
          {
            type: 'div',
            props: {
              style: { display: 'flex', fontSize: 32, color: '#5c626e' },
              children: `${plate.label} · klikni na mapu`,
            },
          },
        ],
      },
    },
    {
      width: W,
      height: H,
      headers: {
        // Long enough that a crawler is not re-rendering it, short enough that
        // a change to the picture reaches the world within a day.
        'cache-control': 'public, max-age=86400, s-maxage=86400',
      },
    },
  )
}
