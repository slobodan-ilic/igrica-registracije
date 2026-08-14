import { useCallback, useEffect, useRef, useState } from 'react'

export type Point = { x: number; y: number }
export type View = { k: number; x: number; y: number }

const MIN_SCALE = 1
const MAX_SCALE = 8

type Options = {
  /** viewBox dimensions the projection was fitted to. */
  width: number
  height: number
  svgRef: React.RefObject<SVGSVGElement | null>
  /** Called when a press that never moved ends — a click or a tap. */
  onTap: (clientX: number, clientY: number, pointerType: string) => void
  /** Called while a single finger is down, for the touch preview banner. */
  onDrag?: () => void
}

/**
 * Zoom and pan for the map, and the gesture rules that drive them.
 *
 * The split of gestures is the part worth knowing: one finger pans, exactly as
 * every map app behaves, and selection happens on a tap. Taking one-finger drag
 * for selection makes the map feel broken the moment it is zoomed in.
 */
export function useMapView({ width, height, svgRef, onTap, onDrag }: Options) {
  const [view, setView] = useState<View>({ k: 1, x: 0, y: 0 })
  const pointers = useRef(new Map<number, Point>())
  const gesture = useRef<'none' | 'pan' | 'pinch'>('none')
  const pinch = useRef<{ dist: number; mid: Point } | null>(null)
  const moved = useRef(false)

  const clamp = useCallback(
    (v: View): View => {
      const k = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.k))
      const maxX = (width * (k - 1)) / 2
      const maxY = (height * (k - 1)) / 2
      return {
        k,
        x: Math.min(maxX, Math.max(-maxX, v.x)),
        y: Math.min(maxY, Math.max(-maxY, v.y)),
      }
    },
    [width, height],
  )

  /**
   * Client coords -> viewBox units measured from the centre, accounting for the
   * letterboxing `preserveAspectRatio` adds. Zooming about a point is only
   * accurate if this matches what the browser actually painted.
   */
  const toView = useCallback(
    (clientX: number, clientY: number): Point | null => {
      const rect = svgRef.current?.getBoundingClientRect()
      if (!rect) return null
      const scale = Math.min(rect.width / width, rect.height / height)
      return {
        x: (clientX - rect.left - (rect.width - width * scale) / 2) / scale - width / 2,
        y: (clientY - rect.top - (rect.height - height * scale) / 2) / scale - height / 2,
      }
    },
    [svgRef, width, height],
  )

  const unitsPerPixel = useCallback(() => {
    const rect = svgRef.current?.getBoundingClientRect()
    return rect ? 1 / Math.min(rect.width / width, rect.height / height) : 1
  }, [svgRef, width, height])

  const zoomAbout = useCallback(
    (at: Point, factor: number, drag: Point = { x: 0, y: 0 }) =>
      setView((v) => {
        const k = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.k * factor))
        const ratio = k / v.k
        return clamp({
          k,
          x: at.x - (at.x - v.x) * ratio + drag.x,
          y: at.y - (at.y - v.y) * ratio + drag.y,
        })
      }),
    [clamp],
  )

  /**
   * React registers wheel handlers as passive, so preventDefault() inside one is
   * ignored and warns. Binding it directly lets the map swallow the scroll it is
   * already consuming.
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
  }, [svgRef, toView, zoomAbout])

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (e.pointerType === 'touch' && pointers.current.size === 2) {
      gesture.current = 'pinch'
      const [a, b] = [...pointers.current.values()]
      pinch.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      }
      return
    }
    gesture.current = 'pan'
    moved.current = false
  }

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const prev = pointers.current.get(e.pointerId)
    if (prev) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

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
      return
    }

    if (gesture.current !== 'pan' || !prev) return
    // A mouse only pans with a button held; a finger always does.
    if (e.pointerType === 'mouse' && e.buttons === 0) return
    const threshold = e.pointerType === 'mouse' ? 2 : 1
    if (Math.hypot(e.clientX - prev.x, e.clientY - prev.y) > threshold) moved.current = true
    onDrag?.()
    const scale = unitsPerPixel()
    setView((v) =>
      clamp({
        ...v,
        x: v.x + (e.clientX - prev.x) * scale,
        y: v.y + (e.clientY - prev.y) * scale,
      }),
    )
  }

  const endPointer = (e: React.PointerEvent<SVGSVGElement>, commit: boolean) => {
    const was = gesture.current
    pointers.current.delete(e.pointerId)

    if (pointers.current.size === 0) {
      if (commit && was === 'pan' && !moved.current) {
        onTap(e.clientX, e.clientY, e.pointerType)
      }
      gesture.current = 'none'
      pinch.current = null
    } else if (was === 'pinch' && pointers.current.size === 1) {
      // Don't let the leftover finger continue as a pan or become a tap.
      gesture.current = 'none'
      pinch.current = null
      moved.current = true
    }
  }

  const reset = () => setView({ k: 1, x: 0, y: 0 })

  /** Transform for the layer that zoom and pan apply to. */
  const transform =
    `translate(${width / 2 + view.x} ${height / 2 + view.y}) ` +
    `scale(${view.k}) translate(${-width / 2} ${-height / 2})`

  return {
    view,
    transform,
    reset,
    handlers: { onPointerDown, onPointerMove, endPointer },
  }
}
