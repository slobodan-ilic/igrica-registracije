import './Plate.css'

const CYRILLIC: Record<string, string> = {
  A: 'А', B: 'Б', V: 'В', G: 'Г', D: 'Д', Đ: 'Ђ', E: 'Е', Ž: 'Ж', Z: 'З', I: 'И',
  J: 'Ј', K: 'К', L: 'Л', M: 'М', N: 'Н', O: 'О', P: 'П', R: 'Р', S: 'С', T: 'Т',
  Ć: 'Ћ', U: 'У', F: 'Ф', H: 'Х', C: 'Ц', Č: 'Ч', Š: 'Ш',
}

const toCyrillic = (code: string) =>
  [...code].map((ch) => CYRILLIC[ch] ?? ch).join('')

/**
 * One ocilo (firesteel), drawn in a 100x100 box as a ribbon with a flat back
 * and two lobes spiralling inward. The back faces the cross and the volutes
 * curl outward, as on the coat of arms.
 */
const OCILO = 'M 40.13,35.14 C 39.78,35.67 39.02,37.42 38.05,38.31 C 37.09,39.21 35.78,40.06 34.37,40.49 C 32.96,40.92 31.22,41.14 29.6,40.89 C 27.98,40.65 26.15,40.03 24.65,39.03 C 23.15,38.03 21.63,36.56 20.61,34.87 C 19.59,33.19 18.77,31.04 18.54,28.92 C 18.3,26.8 18.48,24.32 19.21,22.14 C 19.94,19.95 21.23,17.62 22.92,15.82 C 24.61,14.01 26.9,12.32 29.34,11.32 C 31.78,10.32 34.76,9.7 37.56,9.81 C 40.36,9.92 43.5,10.64 46.16,11.97 C 48.82,13.3 47.2,17.47 53.51,17.81 C 59.81,18.15 78.92,2.64 84,14 C 89.08,25.36 89.08,74.64 84,86 C 78.92,97.36 59.81,81.85 53.51,82.19 C 47.2,82.53 48.82,86.7 46.16,88.03 C 43.5,89.36 40.36,90.08 37.56,90.19 C 34.76,90.3 31.78,89.68 29.34,88.68 C 26.9,87.68 24.61,85.99 22.92,84.18 C 21.23,82.38 19.94,80.05 19.21,77.86 C 18.48,75.68 18.3,73.2 18.54,71.08 C 18.77,68.96 19.59,66.81 20.61,65.13 C 21.63,63.44 23.15,61.97 24.65,60.97 C 26.15,59.97 27.98,59.35 29.6,59.11 C 31.22,58.86 32.96,59.08 34.37,59.51 C 35.78,59.94 37.09,60.79 38.05,61.69 C 39.02,62.58 39.78,64.33 40.13,64.86'

/** The red shield with the cross and four ocila, as stamped on the plate. */
function Emblem() {
  return (
    <svg className="plate__shield" viewBox="0 0 40 52" aria-hidden="true">
      <defs>
        <path id="pl-shield" d="M2 2h36v27.6c0 12.4-11.2 18.6-18 20.4C13.2 48.2 2 42 2 29.6V2z" />
        <clipPath id="pl-clip">
          <use href="#pl-shield" />
        </clipPath>
        <path
          id="pl-ocilo"
          d={OCILO}
          fill="none"
          stroke="#fff"
          strokeWidth="19"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </defs>

      <use href="#pl-shield" fill="#c8102e" stroke="#8c0c20" strokeWidth="1.4" />

      {/* The emblem is laid out in a 360x360 square and clipped to the shield, so
          the cross arms run to the edges the way they do on the real one. The clip
          lives on its own wrapper: a clip-path resolves in the coordinate system
          the element's own transform establishes, so scaling here would shrink it. */}
      <g clipPath="url(#pl-clip)">
        <g transform="translate(2 6) scale(0.1)">
          {/* Deliberately overlong: the clip trims the arms to the shield, so they
              reach every edge including the point at the bottom. */}
          <g fill="#fff">
            <rect x="-160" y="144" width="680" height="72" />
            <rect x="144" y="-160" width="72" height="680" />
          </g>
          <use href="#pl-ocilo" transform="translate(24 26)" />
          <use href="#pl-ocilo" transform="translate(336 26) scale(-1 1)" />
          <use href="#pl-ocilo" transform="translate(24 246)" />
          <use href="#pl-ocilo" transform="translate(336 246) scale(-1 1)" />
        </g>
      </g>
    </svg>
  )
}

/** Serbian tricolour, 3:2, on the plate's blue band. */
function Flag() {
  return (
    <svg className="plate__flag" viewBox="0 0 9 6" aria-hidden="true">
      <rect width="9" height="6" fill="#0c4076" />
      <rect width="9" height="2" fill="#c6363c" />
      <rect y="4" width="9" height="2" fill="#fff" />
      <rect x="0.2" y="0.2" width="8.6" height="5.6" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.4" />
    </svg>
  )
}

export function Plate({ code }: { code: string }) {
  return (
    <div className="plate" role="img" aria-label={`Registration code ${code}`}>
      <div className="plate__band">
        <Flag />
        <span className="plate__srb">SRB</span>
      </div>

      <div className="plate__body">
        <span className="plate__code" key={code}>{code}</span>
        <span className="plate__stamp">
          <Emblem />
          <span className="plate__cyr">{toCyrillic(code)}</span>
        </span>
        <span className="plate__digits">
          <span className="plate__dots">000</span>
          <span className="plate__dash">-</span>
          <span className="plate__dots">AA</span>
        </span>
      </div>
    </div>
  )
}
