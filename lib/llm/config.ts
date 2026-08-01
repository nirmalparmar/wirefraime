/**
 * Role → model resolution. NO model IDs are hardcoded: every role maps to a
 * required environment variable and we throw a clear error when it is unset.
 * Set each to any slug — the provider is inferred from it (see ./provider):
 *   - Google:     DESIGNER_MODEL=gemini-3.1-pro-preview
 *   - OpenRouter: DESIGNER_MODEL=anthropic/claude-sonnet-4-5
 */
export type ModelRole = "designer" | "fast";

const ENV_VAR_BY_ROLE: Record<ModelRole, string> = {
  designer: "DESIGNER_MODEL",
  fast: "FAST_MODEL",
};

export function modelIdFor(role: ModelRole): string {
  const envVar = ENV_VAR_BY_ROLE[role];
  const value = process.env[envVar]?.trim();
  if (!value) {
    throw new Error(
      `[llm] Missing model config for role "${role}": set ${envVar}. ` +
        `Use a Google slug (e.g. gemini-3.1-pro-preview) or an OpenRouter ` +
        `slug (e.g. anthropic/claude-sonnet-4-5) — the "/" decides the provider.`,
    );
  }
  return value;
}
