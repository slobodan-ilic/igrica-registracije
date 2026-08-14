import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { geoMercator, geoPath } from 'd3-geo'
import { useMapView, type Point } from '../lib/useMapView'
import type { RegionCollection, RegionFeature, RegionState } from '../types'
import './QuizMap.css'

// Nothing here knows about licence plates: it renders a FeatureCollection of
// answerable areas and reports which one the player chose. Any future map quiz
// (districts, rivers, countries) can reuse it as-is.

// The mapped territory is about 0.70 as wide as it is tall; matching that here
// lets the SVG scale to the container's full height instead of being letterboxed.
const W = 612
const H = 880
const TOUCH = typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches

type Props = {
  regions: RegionCollection
  /** Paint state per region code; anything absent is 'idle'. */
  states: Record<string, RegionState>
  /** Codes whose name is printed on the map — the reveal after an answer. */
  labelled: string[]
  /** Codes that can be answered; anything else is shown but inert. */
  playable: Set<string>
  /** Easy mode: draw attention to the handful of areas still in play. */
  spotlight: boolean
  /** Whether an answered area's code is worth showing in the tooltip. */
  showCode: boolean
  /**
   * What hovering reveals about an area. The topic decides, so a topic whose
   * answer is its name does not hand it over.
   */
  describe: (code: string, answered: boolean) => { title: string; sub?: string }
  /** How answers are drawn: filled areas, stroked lines, or point markers. */
  kind?: 'area' | 'line' | 'point'
  /** Which mark a point topic draws, so a spa is not mistaken for a peak. */
  marker?: 'peak' | 'spa'
  /** Drawn underneath, purely as context, and never answerable. */
  base?: RegionCollection
  /** Elevation bands drawn inside the base, so the land shows its shape. */
  relief?: { type: string; features: { properties: { level: number } }[] }
  disabled: boolean
  onPick: (code: string) => void
}

export function QuizMap({
  regions,
  states,
  labelled,
  playable,
  spotlight,
  showCode,
  describe,
  kind = 'area',
  marker = 'peak',
  base,
  relief,
  disabled,
  onPick,
}: Props) {
  const [hover, setHover] = useState<string | null>(null)
  /** Touch only: the region a tap selected, awaiting confirmation. */
  const [armed, setArmed] = useState<string | null>(null)
  /** Keeps the banner out of the half of the map being looked at. */
  const [armedLow, setArmedLow] = useState(false)
  const [tip, setTip] = useState<Point | null>(null)

  const svgRef = useRef<SVGSVGElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const { shapes, baseShapes, reliefShapes } = useMemo(() => {
    const projection = geoMercator().fitExtent(
      [
        [10, 10],
        [W - 10, H - 10],
      ],
      (base ?? regions) as unknown as GeoJSON.FeatureCollection,
    )
    const path = geoPath(projection)
    const baseShapes = (base?.features ?? []).map(
      (f) => path(f as unknown as GeoJSON.Feature) ?? '',
    )
    const reliefShapes = [...((relief?.features ?? []) as unknown as GeoJSON.Feature[])]
      .sort(
        (a, b) =>
          ((a.properties as { level: number })?.level ?? 0) -
          ((b.properties as { level: number })?.level ?? 0),
      )
      .map((f, i) => ({ d: path(f) ?? '', step: i }))
    const shapes = regions.features.map((f: RegionFeature) => ({
      code: f.properties.code,
      name: f.properties.name,
      covers: f.properties.covers,
      kim: f.properties.kim === true,
      d: path(f as unknown as GeoJSON.Feature) ?? '',
      centroid: path.centroid(f as unknown as GeoJSON.Feature),
    }))
    return { shapes, baseShapes, reliefShapes }
  }, [regions, base, relief])

  const byCode = useMemo(() => new Map(shapes.map((s) => [s.code, s])), [shapes])

  /** True when the touch is in the upper half, so the banner should drop down. */
  const inTopHalf = (clientY: number) => {
    const rect = wrapRef.current?.getBoundingClientRect()
    return rect ? clientY - rect.top < rect.height * 0.55 : false
  }

  /** Which region is under this screen point, if any. */
  const regionAt = (clientX: number, clientY: number): string | null => {
    const el = document.elementFromPoint(clientX, clientY)
    const owner = el instanceof Element ? el.closest('[data-code]') : null
    return owner instanceof SVGElement ? owner.dataset.code ?? null : null
  }

  /** A tap or click: on touch it arms first and commits on a second press. */
  const onTap = useCallback(
    (clientX: number, clientY: number, pointerType: string) => {
      if (disabled) return
      const code = regionAt(clientX, clientY)
      if (pointerType !== 'touch') {
        if (code) onPick(code)
        return
      }
      if (code && code === armed) {
        onPick(code)
        setArmed(null)
      } else {
        setArmed(code)
        setArmedLow(inTopHalf(clientY))
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [disabled, armed, onPick],
  )

  const map = useMapView({
    width: W,
    height: H,
    svgRef,
    onTap,
    onDrag: () => setArmed(null),
  })

  /** Mouse only: the tooltip follows the cursor. */
  const trackTip = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType !== 'mouse') return
    const rect = wrapRef.current?.getBoundingClientRect()
    if (rect) setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  // A new question clears whatever was selected.
  useEffect(() => {
    if (disabled) setArmed(null)
  }, [disabled])

  const labelSet = new Set(labelled)
  const active = armed ?? hover
  const activeShape = active ? byCode.get(active) : undefined
  // Already-asked regions also show their code, as reinforcement.
  const answered = active ? states[active] === 'correct' || states[active] === 'missed' : false
  const info = activeShape ? describe(activeShape.code, answered) : null

  /**
   * SVG paints in document order and a stroke straddles the edge it sits on, so
   * a neighbour drawn later covers half of an emphasised region's outline —
   * which is why highlighted borders looked heavy on some sides and missing on
   * others. Ordering by importance keeps every highlighted border complete.
   */
  const ordered = useMemo(() => {
    const rank: Record<string, number> = { correct: 2, missed: 2, wrong: 3, revealed: 3 }
    return shapes
      .map((s) => {
        const state = states[s.code] ?? 'idle'
        const weight =
          active === s.code
            ? 4
            : (rank[state] ?? (spotlight && playable.has(s.code) ? 1 : 0))
        return { s, state, weight }
      })
      .sort((a, b) => a.weight - b.weight)
  }, [shapes, states, playable, spotlight, active])

  return (
    <div className="map" ref={wrapRef}>
      <svg
        ref={svgRef}
        className={`map__svg${disabled ? ' map__svg--locked' : ''}`}
        viewBox={`0 0 ${W} ${H}`}
        onPointerDown={map.handlers.onPointerDown}
        onPointerMove={(e) => {
          trackTip(e)
          map.handlers.onPointerMove(e)
        }}
        onPointerUp={(e) => map.handlers.endPointer(e, true)}
        onPointerCancel={(e) => map.handlers.endPointer(e, false)}
        onPointerLeave={() => {
          setHover(null)
          setTip(null)
        }}
        onDoubleClick={map.reset}
        role="group"
        aria-label="Map of Serbian registration areas"
      >
        <g transform={map.transform}>
          {baseShapes.map((d, i) => (
            <path key={`base-${i}`} d={d} className="region region--base" />
          ))}

          {/* Measured elevation, clipped to the land. The clip lives on its own
              wrapper because a clip-path resolves in the coordinate system the
              element's own transform establishes. */}
          {reliefShapes.length > 0 && (
            <>
              <defs>
                <clipPath id="land-clip">
                  {baseShapes.map((d, i) => (
                    <path key={`clip-${i}`} d={d} />
                  ))}
                </clipPath>
              </defs>
              <g clipPath="url(#land-clip)">
                {reliefShapes.map(({ d, step }) => (
                  <path key={`relief-${step}`} d={d} className={`relief relief--${step}`} />
                ))}
              </g>
            </>
          )}

          {ordered.map(({ s, state }) => {
            const off = !playable.has(s.code)
            // Answer colours must survive both the dimming and the spotlight,
            // so the idle-only styles are applied only while the region is idle.
            const idle = state === 'idle'
            const p = kind === 'line' ? 'rv' : kind === 'point' ? 'pt' : 'region'
            const cls = [
              p,
              `${p}--${state}`,
              off && `${p}--inert`,
              off && idle && `${p}--off`,
              !off && idle && spotlight && `${p}--candidate`,
              !off && idle && s.kim && `${p}--kim`,
              labelSet.has(s.code) && `${p}--flash`,
              active === s.code && `${p}--hover`,
            ]
              .filter(Boolean)
              .join(' ')
            const shared = {
              'data-code': s.code,
              className: cls,
              onMouseEnter: () => setHover(s.code),
              onMouseLeave: () => setHover((h: string | null) => (h === s.code ? null : h)),
              tabIndex: disabled || off ? -1 : 0,
              role: 'button',
              'aria-label': `Region ${s.code}`,
              onKeyDown: (e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  if (!disabled && !off) onPick(s.code)
                }
              },
            }

            // Lines and points are hard targets, so both get a generous
            // invisible hit shape under the visible mark. Markers are
            // counter-scaled so they stay the same size however far you zoom.
            if (kind === 'line') {
              return (
                <g key={s.code} {...shared}>
                  <path className="rv__hit" d={s.d} />
                  <path className="rv__line" d={s.d} />
                </g>
              )
            }
            if (kind === 'point') {
              return (
                <g
                  key={s.code}
                  {...shared}
                  transform={`translate(${s.centroid}) scale(${1 / map.view.k})`}
                >
                  <circle className="pt__hit" r={12} />
                  {/* An answered marker becomes a solid badge: a small glyph is
                      lost against terrain, a filled disc never is. The ring is
                      the non-colour channel that separates missed from correct. */}
                  <circle className="pt__ring" r={11} />
                  <circle className="pt__disc" r={8.4} />
                  {marker === 'spa' ? (
                    // A droplet: unmistakably water rather than a summit.
                    <path
                      className="pt__mark"
                      d="M0,-6.6 C3.4,-2.4 5.2,-0.2 5.2,2 A5.2,5.2 0 0 1 -5.2,2 C-5.2,-0.2 -3.4,-2.4 0,-6.6 Z"
                    />
                  ) : (
                    <path className="pt__mark" d="M0,-6.4 L5.6,3.8 H-5.6 Z" />
                  )}
                </g>
              )
            }
            return <path key={s.code} d={s.d} {...shared} />
          })}

          {shapes
            .filter((s) => labelSet.has(s.code))
            .map((s) => (
              <g key={`l-${s.code}`} className="region__label" transform={`translate(${s.centroid})`}>
                {/* Sits below a marker so it never covers it. */}
                <text
                  className="region__label-halo"
                  y={kind === 'point' ? 17 / map.view.k : 0}
                  style={{ fontSize: 15 / map.view.k }}
                >
                  {s.name}
                </text>
                <text
                  className="region__label-text"
                  y={kind === 'point' ? 17 / map.view.k : 0}
                  style={{ fontSize: 15 / map.view.k }}
                >
                  {s.name}
                </text>
              </g>
            ))}
        </g>
      </svg>

      {/* Touch: the name sits clear of the map area being looked at, and the pick
          only lands when it is confirmed. */}
      {armed && info && (
        <div className={`picker${armedLow ? ' picker--low' : ''}`} role="status">
          <span className="picker__name">{info.title}</span>
          {info.sub && <span className="picker__covers">{info.sub}</span>}
          <button
            className="picker__confirm"
            onClick={() => {
              if (!disabled) onPick(armed)
              setArmed(null)
            }}
          >
            Potvrdi ✓
          </button>
        </div>
      )}

      {!armed && hover && info && tip && (
        <div
          className="tip"
          style={{
            left: Math.min(Math.max(tip.x, 96), (wrapRef.current?.clientWidth ?? 0) - 96),
            top: tip.y,
          }}
          role="tooltip"
        >
          <span className="tip__name">
            {info.title}
            {answered && showCode && <b className="tip__code">{activeShape!.code}</b>}
          </span>
          {info.sub && <span className="tip__covers">{info.sub}</span>}
        </div>
      )}

      <div className={`map__hint${armed ? ' map__hint--hidden' : ''}`}>
        {map.view.k > 1.02 ? (
          <button className="map__reset" onClick={map.reset}>
            Poništi zum
          </button>
        ) : (
          <span>
            {TOUCH
              ? 'Prevuci da pomeriš · dva prsta za zum'
              : 'Točkićem zumiraj · prevuci da pomeriš'}
          </span>
        )}
      </div>
    </div>
  )
}
