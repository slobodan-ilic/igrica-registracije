import { useMemo, useState } from 'react'
import { BackLink } from './Chrome'
import { href, linkProps } from './router'
import { appName } from './prefs'
import { history } from './history'
import { due, ENOUGH, GRADUATES_AT } from './practice'
import { progress, type Mode } from './stats'
import { plural } from './sr'
import type { Player } from './account'
import type { Topic } from './topic'
import './Progress.css'

/**
 * What the rounds you have played add up to.
 *
 * Every chart here is one series, so each is a single hue rather than a set of
 * them — nothing on this page asks you to tell two colours apart, which is the
 * cheapest way to be safe for the six percent of men who could not. Identity is
 * carried by the labels, which are always drawn.
 */

const W = 720
const H = 190
const PAD = { top: 14, right: 12, bottom: 26, left: 34 }

type Point = { at: number; topic: string; accuracy: number; questions: number }

/** Accuracy round by round. One series, so no legend — the heading names it. */
function OverTime({ data, label }: { data: Point[]; label: (id: string) => string }) {
  const [at, setAt] = useState<number | null>(null)
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  const x = (i: number) => PAD.left + (data.length < 2 ? plotW / 2 : (i / (data.length - 1)) * plotW)
  const y = (v: number) => PAD.top + plotH - (v / 100) * plotH

  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(d.accuracy).toFixed(1)}`).join(' ')
  const area = `${line} L${x(data.length - 1).toFixed(1)} ${PAD.top + plotH} L${x(0).toFixed(1)} ${PAD.top + plotH} Z`
  const shown = at === null ? null : data[at]

  return (
    <figure className="chart">
      <figcaption className="chart__title">Tačnost kroz vreme</figcaption>
      <div className="chart__plot">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Tačnost po partiji">
          {[0, 50, 100].map((v) => (
            <g key={v}>
              <line className="chart__grid" x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} />
              <text className="chart__tick" x={PAD.left - 8} y={y(v)} dy="0.32em">{v}%</text>
            </g>
          ))}

          <path className="chart__area" d={area} />
          <path className="chart__line" d={line} />

          {shown && <line className="chart__cross" x1={x(at!)} x2={x(at!)} y1={PAD.top} y2={PAD.top + plotH} />}
          {data.map((d, i) => (
            <circle
              key={i}
              className={`chart__dot${at === i ? ' chart__dot--on' : ''}`}
              cx={x(i)}
              cy={y(d.accuracy)}
              r={at === i ? 5 : 3}
            />
          ))}

          {/* Hit areas wider than the marks, so a point is easy to reach. */}
          {data.map((_, i) => (
            <rect
              key={`hit-${i}`}
              className="chart__hit"
              x={x(i) - plotW / Math.max(data.length, 2) / 2}
              y={PAD.top}
              width={plotW / Math.max(data.length, 2)}
              height={plotH}
              onMouseEnter={() => setAt(i)}
              onMouseLeave={() => setAt(null)}
            />
          ))}
        </svg>

        {shown && (
          <div className="chart__tip" style={{ left: `${(x(at!) / W) * 100}%` }}>
            <b>{shown.accuracy}%</b>
            <span>
              {label(shown.topic)} · {shown.questions}{' '}
              {plural(shown.questions, 'pitanje', 'pitanja', 'pitanja')}
            </span>
          </div>
        )}
      </div>
      <p className="chart__note">
        Poslednj{data.length === 1 ? 'a partija' : `ih ${data.length} partija`}
      </p>
    </figure>
  )
}

/** Accuracy per country: magnitude across a handful of names, so ranks. */
function ByCountry({
  rows,
  label,
}: {
  rows: { topic: string; accuracy: number; questions: number }[]
  label: (id: string) => string
}) {
  return (
    <figure className="chart">
      <figcaption className="chart__title">Po zemljama</figcaption>
      <ul className="ranks">
        {rows.map((r) => (
          <li key={r.topic} className="rank">
            <span className="rank__name">{label(r.topic)}</span>
            <span className="rank__track">
              <span className="rank__fill" style={{ width: `${Math.max(r.accuracy, 1.5)}%` }} />
            </span>
            <span className="rank__value">
              {r.accuracy}%
              <em>
                {r.questions} {plural(r.questions, 'pitanje', 'pitanja', 'pitanja')}
              </em>
            </span>
          </li>
        ))}
      </ul>
    </figure>
  )
}

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className="tile">
      <b className="tile__value">{value}</b>
      <span className="tile__label">{label}</span>
    </div>
  )
}

/**
 * Which set of rounds is being counted. Shown only when both kinds have been
 * played, since otherwise there is nothing to choose between — and it opens on
 * whichever was played more, so the first accuracy anyone reads is one that
 * means something rather than an average across two different games.
 */
function Filter({ mode, onMode, counts }: {
  mode: Mode
  onMode: (m: Mode) => void
  counts: { easy: number; classic: number }
}) {
  if (!counts.easy || !counts.classic) return null
  const of: [Mode, string][] = [['classic', 'Klasično'], ['easy', 'Lako'], ['all', 'Sve']]
  return (
    <div className="filter" role="group" aria-label="Koje partije">
      {of.map(([m, text]) => (
        <button
          key={m}
          type="button"
          className={`filter__pick${mode === m ? ' filter__pick--on' : ''}`}
          onClick={() => onMode(m)}
        >
          {text}
        </button>
      ))}
    </div>
  )
}

export function Progress({
  topics,
  player,
  accounts,
}: {
  topics: Record<string, Topic>
  player: Player | null
  accounts: boolean
}) {
  const counts = useMemo(() => progress(appName()).modes, [])
  const [mode, setMode] = useState<Mode>(counts.easy > counts.classic ? 'easy' : 'classic')
  const p = useMemo(() => progress(appName(), mode), [mode])
  const label = (id: string) => topics[id]?.label ?? id

  /**
   * What is owed, per topic, worst first.
   *
   * Counted without a map, because no dataset is loaded on this page — so on
   * Serbia a Kosovo code could be counted here and then be undealable in a
   * round played without that set. It cannot in practice: the only way to get a
   * Kosovo code wrong is to have played with the set on, and the setting is
   * remembered. `/greske` deals against the real map either way, so the worst
   * case is a round one question shorter than the number here.
   */
  const owed = useMemo(() => {
    const mine = history().filter((r) => r.app === appName())
    return Object.keys(topics)
      .map((id) => ({ id, n: due(mine, id).length }))
      .filter((t) => t.n >= ENOUGH)
      .sort((a, b) => b.n - a.n)
  }, [topics])

  // Nothing played yet. A heading and a button in an empty screen teaches
  // nobody anything, so this says what the page will hold, shows what one of
  // those lines looks like, and offers the two ways to fill it — play a round,
  // or sign in and bring across what was played somewhere else.
  if (!counts.easy && !counts.classic) {
    return (
      <div className="intro intro--menu napredak napredak--empty">
        <BackLink to={href.home()} label="Nazad" />
        <h1 className="intro__title">Vaš napredak</h1>
        <p className="intro__lead">
          Ovde se skuplja sve što odigrate. Čuva se u ovom pregledaču — nalog nije potreban.
        </p>

        <ul className="waiting">
          <li>
            <b>Tačnost kroz vreme</b>
            <span>partiju po partiju, i posebno za svaku zemlju</span>
          </li>
          <li>
            <b>Najduži niz i prosečno vreme</b>
            <span>koliko tačnih zaredom, i koliko vam treba po pitanju</span>
          </li>
          <li>
            <b>Oznake koje najčešće pogrešite</b>
            <span>
              ono najkorisnije — na primer <em>KŠ → Kraljevo, 6 puta</em>, i partija
              sastavljena samo od njih
            </span>
          </li>
        </ul>

        <div className="intro__actions">
          <a className="btn btn--go" {...linkProps(href.daily())}>Dnevni izazov</a>
          <a className="btn" {...linkProps(href.home())}>Izaberi zemlju</a>
        </div>

        {accounts && !player && (
          <p className="napredak__nudge">
            Već ste igrali na drugom uređaju? Prijavite se gore desno i napredak dolazi sa
            vama.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="intro intro--menu napredak">
      <BackLink to={href.home()} label="Nazad" />
      <h1 className="intro__title">Vaš napredak</h1>
      <Filter mode={mode} onMode={setMode} counts={counts} />

      <div className="tiles">
        <Tile value={`${p.all.rounds}`} label={plural(p.all.rounds, 'partija', 'partije', 'partija')} />
        <Tile value={`${p.all.questions}`} label={plural(p.all.questions, 'pitanje', 'pitanja', 'pitanja')} />
        <Tile value={`${p.all.accuracy}%`} label="tačnost" />
        <Tile value={`${p.all.streak}`} label="najduži niz" />
        <Tile value={`${p.all.pace}s`} label="po pitanju" />
      </div>

      <p className="napredak__scope">
        {mode === 'all'
          ? 'Sve partije zajedno — lako i klasično se ne porede.'
          : mode === 'easy'
            ? 'Samo partije na lako, gde birate između četiri područja.'
            : 'Samo klasične partije, na celoj mapi.'}
      </p>

      {p.line.length > 1 && <OverTime data={p.line} label={label} />}
      {p.topics.length > 0 && <ByCountry rows={p.topics} label={label} />}

      {/* The one thing on this page that is not a number to read but a thing to
          do. Above the list of mistakes rather than below it, because the list
          is what it acts on and nobody scrolls past a chart to find a verb. */}
      {owed.length > 0 && (
        <section className="chart">
          <h2 className="chart__title">Vežbajte greške</h2>
          <p className="chart__note chart__note--lead">
            Partija sastavljena samo od onoga što stalno grešite. Oznaka silazi sa spiska kada
            je pogodite {GRADUATES_AT} puta zaredom.
          </p>
          <div className="drills">
            {owed.map((t) => (
              <a key={t.id} className="btn btn--drill" {...linkProps(href.practice(t.id))}>
                {label(t.id)} <b>{t.n}</b>
              </a>
            ))}
          </div>
          {p.drilled.rounds > 0 && (
            <p className="chart__note">
              Odigrano vežbi: {p.drilled.rounds} · {p.drilled.questions}{' '}
              {plural(p.drilled.questions, 'pitanje', 'pitanja', 'pitanja')}. Ne ulaze u brojke
              iznad — namerno su teže od običnih partija.
            </p>
          )}
        </section>
      )}

      {p.confused.length > 0 && (
        <section className="chart">
          <h2 className="chart__title">Najčešće greške</h2>
          <p className="chart__note chart__note--lead">
            Oznake koje ste više puta stavili na pogrešno mesto.
          </p>
          <ul className="mistakes">
            {p.confused.slice(0, 8).map((c) => (
              <li key={`${c.code}>${c.picked}`} className="mistake">
                <b className="mistake__code">{c.code}</b>
                <span className="mistake__arrow" aria-hidden="true">→</span>
                <span className="mistake__picked">{c.picked}</span>
                <span className="mistake__times">
                  {c.times} {plural(c.times, 'put', 'puta', 'puta')}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {accounts && !player && (
        <p className="napredak__nudge">
          Ovo se čuva samo u ovom pregledaču. Prijavite se gore desno i napredak vas prati i na
          telefonu.
        </p>
      )}
    </div>
  )
}
