/**
 * PricingCard — reusable pricing tier card in the landing ("wf-landing") theme.
 *
 * Presentational only. Styling lives in app/globals.css under `.wf-landing`
 * (`.price-card`, `.price-card.featured`, `.price-*`), so this MUST render
 * inside the `.wf-landing` root to inherit the theme.
 */

export interface PricingTier {
  /** Plan name, shown as an uppercase eyebrow. */
  name: string;
  /** One-line description under the name. */
  tagline: string;
  /** Pre-formatted price, e.g. "$20" or "Free". */
  price: string;
  /** Optional unit shown next to the price, e.g. "/ mo". */
  period?: string;
  features: string[];
  cta: string;
  ctaHref: string;
  /** Highlights the recommended tier. */
  featured?: boolean;
  /** Optional pill, e.g. "Most popular". */
  badge?: string;
}

function CheckIcon() {
  return (
    <svg
      className="price-check"
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.5 7.5l2.8 2.8L11.5 4" />
    </svg>
  );
}

export function PricingCard({
  tier,
  className = "",
}: {
  tier: PricingTier;
  className?: string;
}) {
  return (
    <div className={`price-card${tier.featured ? " featured" : ""} ${className}`.trim()}>
      {tier.badge && <span className="price-badge">{tier.badge}</span>}

      <p className="price-name">{tier.name}</p>
      <p className="price-tagline">{tier.tagline}</p>

      <div className="price-amount">
        <span className="price-value">{tier.price}</span>
        {tier.period && <span className="price-period">{tier.period}</span>}
      </div>

      <div className="price-divider" />

      <ul className="price-features">
        {tier.features.map((f) => (
          <li className="price-feature" key={f}>
            <CheckIcon />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <a
        href={tier.ctaHref}
        className={`price-cta${tier.featured ? " price-cta-primary" : ""}`}
      >
        {tier.cta}
      </a>
    </div>
  );
}
