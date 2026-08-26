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
// The same rule the challenge itself follows, imported rather than repeated:
// this picture said Serbia every day precisely because it had its own copy.
// The .js extension is what Node's own module resolution wants; it resolves
// to rota.ts at build time.
import { ZONE, countryFor, today } from '../packages/kviz/src/rota.js'
import { decode, headline, labelFor, quizName, score, type Shared } from '../packages/kviz/src/result.js'

export const config = { runtime: 'edge' }

/**
 * Satori reads the element tree as data rather than rendering React, so plain
 * objects of this shape are what it wants — but ImageResponse is typed for a
 * real ReactElement. Named here so the cast happens once, at the boundary,
 * rather than being scattered through the tree.
 */
type Node = { type: string; props: Record<string, unknown> }
const asElement = (tree: Node) => tree as unknown as ConstructorParameters<typeof ImageResponse>[0]

/**
 * What every country's plate needs, and nothing more than the picture uses.
 *
 * The arms matter more here than anywhere: at preview size a Croatian and a
 * Slovenian plate are both a blue band and black letters, and it is the
 * šahovnica and the Ljubljana dragon that tell them apart. They are the same
 * files the app draws, in PNG — the renderer reads PNG and JPEG and skips
 * anything else without saying so.
 */
type Plate = {
  mark: string
  band: string
  code: string
  tail: string
  label: string
  /** Not every country has one on its plate, and two of these do not. */
  arms?: string
}

const PLATES: Record<string, Plate> = {
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

/**
 * Seconds until the day turns over in Belgrade. The daily's picture is asked
 * for at one address every day and has to be a different picture each time, so
 * it may only be cached until the country changes — not for a flat day, which
 * would leave it a few hours stale every morning.
 */
function untilTomorrow(now: Date) {
  const midnight = Date.parse(`${today(new Date(now.getTime() + 86_400_000))}T00:00:00Z`)
  const hereNow = Date.parse(`${today(now)}T${new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now)}Z`)
  return Math.max(60, Math.round((midnight - hereNow) / 1000))
}

/**
 * The answer colours, the same two the app and the saved card use. Teal and
 * orange rather than green and red: those two collapse for the six percent of
 * men who cannot separate them, and these squares carry no label to fall back
 * on.
 */
const RIGHT = '#009486'
const WRONG = '#f08b45'

/**
 * A finished round, drawn for the link that carries it.
 *
 * Landscape, because this is what a chat app and a timeline crop toward — the
 * square card is a different object for a different place, the one somebody
 * posts to Instagram themselves. What the two must agree on is what they say,
 * and they do: both take their line from `headline` in result.ts.
 */
function resultCard(shared: Shared, label: string) {
  const rows: boolean[][] = []
  for (let at = 0; at < shared.marks.length; at += 5) rows.push(shared.marks.slice(at, at + 5))
  // Ten questions draw at full size; seventy-four across Yugoslavia is fifteen
  // rows, and it is the square that gives way rather than the picture.
  const size = Math.max(10, Math.min(58, Math.floor((250 - 8 * (rows.length - 1)) / rows.length)))
  const gap = Math.max(4, Math.round(size * 0.18))

  return {
    type: 'div',
    props: {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 26,
        background: '#f2f1ec',
        fontFamily: 'sans-serif',
      },
      children: [
        // The plate, small. A preview without it is a score on a beige field
        // and could be any quiz in the world; the plate is the one thing that
        // says which app this came from at the size a timeline shows it.
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              height: 82,
              padding: 5,
              borderRadius: 11,
              background: '#ffffff',
              border: '4px solid #14161a',
            },
            children: [
              {
                type: 'div',
                props: { style: { display: 'flex', width: 34, borderRadius: 7, background: '#0d3a86' } },
              },
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 22px',
                    fontSize: 44,
                    fontWeight: 700,
                    color: '#101215',
                  },
                  children: quizName(shared.topic).toUpperCase(),
                },
              },
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: { display: 'flex', fontSize: 34, fontWeight: 600, color: '#5c626e' },
            children: headline(shared, label),
          },
        },
        {
          type: 'div',
          props: {
            style: { display: 'flex', fontSize: 132, fontWeight: 700, color: '#15171c' },
            children: `${score(shared)}/${shared.marks.length}`,
          },
        },
        {
          type: 'div',
          props: {
            style: { display: 'flex', flexDirection: 'column', gap },
            children: rows.map((row) => ({
              type: 'div',
              props: {
                style: { display: 'flex', gap },
                children: row.map((ok) => ({
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      width: size,
                      height: size,
                      borderRadius: Math.max(3, Math.round(size * 0.14)),
                      background: ok ? RIGHT : WRONG,
                    },
                  },
                })),
              },
            })),
          },
        },
        {
          type: 'div',
          props: {
            style: { display: 'flex', fontSize: 30, color: '#5c626e' },
            children: 'Probaj isti krug — tablice.vercel.app',
          },
        },
      ],
    },
  }
}

export default function handler(req: Request) {
  const url = new URL(req.url)
  const asked = url.searchParams.get('t') ?? 'srbija'
  // A date may be given so the rotation can be checked without waiting a day.
  const when = url.searchParams.get('d')
  const daily = asked === 'dnevni'
  const topic = daily ? countryFor(when ?? today()) : asked
  const plate = PLATES[topic] ?? PLATES.srbija
  const yu = topic === 'jugoslavija'
  const site = `${url.protocol}//${url.host}`

  // A round came with the ask, so the picture is that round rather than the
  // country's plate. Everything below is untouched by this and stays what a
  // link to a country previews as.
  const shared = decode(topic, url.searchParams)
  if (shared) {
    // The topic's own name, from the one place that holds them, rather than
    // the plate table — which has no entry for a river and quietly says Srbija.
    return new ImageResponse(asElement(resultCard(shared, labelFor(shared.topic)) as Node), {
      width: W,
      height: H,
      headers: {
        // A finished round never changes, so its picture never does either.
        'cache-control': 'public, max-age=31536000, s-maxage=31536000, immutable',
        'x-plate': topic,
      },
    })
  }

  return new ImageResponse(
    asElement({
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
    }),
    {
      width: W,
      height: H,
      headers: {
        // The daily's picture only holds until the country changes; everything
        // else is the same tomorrow as it is today.
        'cache-control': daily
          ? `public, max-age=${untilTomorrow(new Date())}, s-maxage=${untilTomorrow(new Date())}`
          : 'public, max-age=86400, s-maxage=86400',
        // Which country is in the picture. Nothing reads this in a browser; it
        // is here so the rotation can be checked without decoding a PNG and
        // guessing from its size, which is what the first attempt did.
        'x-plate': topic,
      },
    },
  )
}
