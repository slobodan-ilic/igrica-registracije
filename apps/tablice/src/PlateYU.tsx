import { Plate, Serial } from './Plate'

/** The petokraka, point up, in a 100x100 box. */
const STAR =
  'M50 4 61.8 36.4 96 36.4 68.1 57.2 78.9 90 50 69.6 21.1 90 31.9 57.2 4 36.4 38.2 36.4Z'

/**
 * The red five-pointed star that sat between the letters and the numbers. It
 * is the whole emblem — a Yugoslav plate carried no shield and no country band,
 * just white enamel, dark blue lettering and this.
 */
function Star() {
  return (
    <svg className="plate__star" viewBox="0 0 100 100" aria-hidden="true">
      <path d={STAR} fill="#d81e2c" />
    </svg>
  )
}

/**
 * A Yugoslav plate as it looked into the eighties: no band, two or three
 * letters for the town, the star, then two groups of digits. The real ones came
 * in several lengths — BG★123-456, BG★123-45, BG★12-34 — and the longest is
 * used here.
 */
export function PlateYU({ code }: { code: string }) {
  return (
    <Plate
      country="yu"
      code={code}
      emblem={<Star />}
      serial={<Serial parts={['326', '851']} separator="-" />}
    />
  )
}
