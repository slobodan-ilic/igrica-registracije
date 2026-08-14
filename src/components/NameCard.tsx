import './NameCard.css'

/** The question card for topics whose prompt is a name rather than a plate. */
export function NameCard({ title, kicker }: { title: string; kicker: string }) {
  return (
    <div className="namecard" role="img" aria-label={`${kicker}: ${title}`}>
      <span className="namecard__kicker">{kicker}</span>
      <span className="namecard__title" key={title}>
        {title}
      </span>
    </div>
  )
}
