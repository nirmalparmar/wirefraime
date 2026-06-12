/**
 * Shared types for the design layer (craft + linter, and — in later phases —
 * design-system packages and artifact-type skills).
 *
 * See docs/architecture-plan.md for the full 3-axis architecture.
 */

/** Brand-agnostic craft rulebooks. Each value maps to `craft/<slug>.md`. */
export type CraftRef =
  | "anti-ai-slop"
  | "typography"
  | "color"
  | "state-coverage"
  | "accessibility-baseline"
  | "animation-discipline"
  | "laws-of-ux"
  | "copy-honesty";

/**
 * Artifact shape (Phase 3 routes generation by this). Declared now so craft
 * defaults can vary by output type without a later type churn.
 */
export type ArtifactType = "landing-page" | "app-ui";

/** Severity tiers, mirroring craft/anti-ai-slop.md. */
export type LintSeverity = "P0" | "P1" | "P2";

/** A single linter finding against generated HTML. */
export interface LintFinding {
  /** Stable rule id, e.g. "indigo-accent". */
  rule: string;
  severity: LintSeverity;
  /** Human-readable explanation + how to fix. */
  message: string;
  /** Number of occurrences found. */
  count: number;
  /** First offending snippet (truncated), for logs/UI. */
  sample?: string;
}
