import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { geoMercator, geoPath } from 'd3-geo'
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
const MIN_SCALE = 1
const MAX_SCALE = 8

type View = { k: number; x: number; y: number }
type Point = { x: number; y: number }

type Props = {
  regions: RegionCollection
  /** Paint state per region code; anything absent is 'idle'. */
  states: Record<string, RegionState>
  /** Codes whose name should be printed on the map (the reveal after an answer). */
  labelled: string[]
  /** Codes that can be answered; anything else is shown but inert. */
  playable: Set<string>
  /** Easy mode: draw attention to the handful of areas still in play. */
  spotlight: boolean
  /** Whether an answered area's code is worth showing in the tooltip. */
  showCode: boolean
  /** What to reveal about an area on hover — the topic decides, so a topic
   *  whose answer is the name doesn't hand it over. */
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
  const [view, setView] = useState<View>({ k: 1, x: 0, y: 0 })
  const [hover, setHover] = useState<string | null>(null)
  /** Touch only: the region a tap selected, awaiting confirmation. */
  const [armed, setArmed] = useState<string | null>(null)
  /** Keeps the banner out of the half of the map being looked at. */
  const [armedLow, setArmedLow] = useState(false)
  const [tip, setTip] = useState<Point | null>(null)

  const svgRef = useRef<SVGSVGElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const pointers = useRef(new Map<number, Point>())
  const gesture = useRef<'none' | 'pan' | 'pinch'>('none')
  const pinch = useRef<{ dist: number; mid: Point } | null>(null)
  const panned = useRef(false)

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

  const clamp = (v: View): View => {
    const k = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.k))
    const maxX = (W * (k - 1)) / 2
    const maxY = (H * (k - 1)) / 2
    return {
      k,
      x: Math.min(maxX, Math.max(-maxX, v.x)),
      y: Math.min(maxY, Math.max(-maxY, v.y)),
    }
  }

  /**
   * Client coords -> viewBox units measured from the centre, accounting for the
   * letterboxing that `preserveAspectRatio` adds. Zooming about a point is only
   * accurate if this matches what the browser actually painted.
   */
  const toView = useCallback((clientX: number, clientY: number): Point | null => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return null
    const scale = Math.min(rect.width / W, rect.height / H)
    const x = (clientX - rect.left - (rect.width - W * scale) / 2) / scale
    const y = (clientY - rect.top - (rect.height - H * scale) / 2) / scale
    return { x: x - W / 2, y: y - H / 2 }
  }, [])

  const unitsPerPixel = () => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return 1
    return 1 / Math.min(rect.width / W, rect.height / H)
  }

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

  const zoomAbout = useCallback((at: Point, factor: number, drag: Point = { x: 0, y: 0 }) =>
    setView((v) => {
      const k = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.k * factor))
      const ratio = k / v.k
      return clamp({
        k,
        x: at.x - (at.x - v.x) * ratio + drag.x,
        y: at.y - (at.y - v.y) * ratio + drag.y,
      })
    }), [])

  /**
   * React registers wheel handlers as passive, so preventDefault() inside one is
   * ignored and warns. Binding it directly lets the map actually swallow the
   * scroll it is consuming.
   */
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const at = toView(e.clientX, e.clientY)
      if (at) zoomAbout(at, Math.exp(-e.deltaY * 0.0016))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [toView, zoomAbout])

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (e.pointerType === 'touch') {
      if (pointers.current.size === 1) {
        // One finger drags the map; a tap (a press that never moves) selects.
        gesture.current = 'pan'
        panned.current = false
      } else if (pointers.current.size === 2) {
        gesture.current = 'pinch'
        const [a, b] = [...pointers.current.values()]
        pinch.current = {
          dist: Math.hypot(a.x - b.x, a.y - b.y),
          mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        }
      }
    } else {
      gesture.current = 'pan'
      panned.current = false
    }
  }

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const prev = pointers.current.get(e.pointerId)
    if (prev) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (e.pointerType === 'mouse') {
      const rect = wrapRef.current?.getBoundingClientRect()
      if (rect) setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top })
      if (gesture.current === 'pan' && prev && e.buttons !== 0) {
        const scale = unitsPerPixel()
        if (Math.hypot(e.clientX - prev.x, e.clientY - prev.y) > 2) panned.current = true
        setView((v) =>
          clamp({ ...v, x: v.x + (e.clientX - prev.x) * scale, y: v.y + (e.clientY - prev.y) * scale }),
        )
      }
      return
    }

    if (gesture.current === 'pan' && prev) {
      if (Math.hypot(e.clientX - prev.x, e.clientY - prev.y) > 1) panned.current = true
      const scale = unitsPerPixel()
      setView((v) =>
        clamp({ ...v, x: v.x + (e.clientX - prev.x) * scale, y: v.y + (e.clientY - prev.y) * scale }),
      )
      return
    }

    if (gesture.current === 'pinch' && pointers.current.size >= 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const at = toView(mid.x, mid.y)
      if (at && dist > 0) {
        const scale = unitsPerPixel()
        zoomAbout(at, dist / pinch.current.dist, {
          x: (mid.x - pinch.current.mid.x) * scale,
          y: (mid.y - pinch.current.mid.y) * scale,
        })
      }
      pinch.current = { dist, mid }
    }
  }

  const endPointer = (e: React.PointerEvent<SVGSVGElement>, commit: boolean) => {
    const was = gesture.current
    pointers.current.delete(e.pointerId)

    if (pointers.current.size === 0) {
      // A press that never moved selects; dragging the map never picks anything.
      // This is handled here rather than in a click handler because capturing the
      // pointer retargets the click away from the region that was under it.
      if (commit && was === 'pan' && !panned.current && !disabled) {
        const code = regionAt(e.clientX, e.clientY)
        if (e.pointerType === 'touch') {
          // Touch selects first and commits on a second, deliberate confirmation.
          if (code && code === armed) {
            onPick(code)
            setArmed(null)
          } else {
            setArmed(code)
            setArmedLow(inTopHalf(e.clientY))
          }
        } else if (code) {
          onPick(code)
        }
      }
      gesture.current = 'none'
      pinch.current = null
    } else if (was === 'pinch' && pointers.current.size === 1) {
      // Don't let the leftover finger continue as a pan or a tap.
      gesture.current = 'none'
      pinch.current = null
      panned.current = true
    }
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
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => endPointer(e, true)}
        onPointerCancel={(e) => endPointer(e, false)}
        onPointerLeave={() => {
          setHover(null)
          setTip(null)
        }}
        onDoubleClick={() => setView({ k: 1, x: 0, y: 0 })}
        role="group"
        aria-label="Map of Serbian registration areas"
      >
        <g
          transform={`translate(${W / 2 + view.x} ${H / 2 + view.y}) scale(${view.k}) translate(${-W / 2} ${-H / 2})`}
        >
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
                  transform={`translate(${s.centroid}) scale(${1 / view.k})`}
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
                  y={kind === 'point' ? 17 / view.k : 0}
                  style={{ fontSize: 15 / view.k }}
                >
                  {s.name}
                </text>
                <text
                  className="region__label-text"
                  y={kind === 'point' ? 17 / view.k : 0}
                  style={{ fontSize: 15 / view.k }}
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
        {view.k > 1.02 ? (
          <button className="map__reset" onClick={() => setView({ k: 1, x: 0, y: 0 })}>
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
