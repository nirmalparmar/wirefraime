import fs from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import { PRESET_THEMES, buildPreviewDoc } from "@/lib/ds";
import { PreviewClient } from "./preview-client";

export const dynamic = "force-dynamic";

const EXAMPLES_DIR = path.join(process.cwd(), "references", "examples");

function listExamples(): string[] {
  return fs
    .readdirSync(EXAMPLES_DIR)
    .filter((f) => f.endsWith(".html"))
    .map((f) => f.replace(/\.html$/, ""))
    .sort();
}

export default async function DevPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ example?: string; theme?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();

  const params = await searchParams;
  const examples = listExamples();
  const example = examples.includes(params.example ?? "")
    ? (params.example as string)
    : examples[0];
  const themeId =
    params.theme && params.theme in PRESET_THEMES ? params.theme : "quartz";

  const fragment = fs.readFileSync(
    path.join(EXAMPLES_DIR, `${example}.html`),
    "utf8",
  );
  const doc = buildPreviewDoc(fragment, PRESET_THEMES[themeId].theme);

  return (
    <PreviewClient
      examples={examples}
      themes={Object.entries(PRESET_THEMES).map(([id, p]) => ({
        id,
        name: p.name,
      }))}
      example={example}
      themeId={themeId}
      doc={doc}
    />
  );
}
