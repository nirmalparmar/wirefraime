import type { WireframeApp, DesignSystem } from "./types";

/** Slugify a string for use as a URL path or directory name */
function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Convert an HTML body string to basic JSX-compatible syntax */
function htmlToJsx(html: string): string {
  let jsx = html;

  // class= → className= (not inside <style> or already className)
  jsx = jsx.replace(/\bclass=/g, "className=");

  // for= → htmlFor=
  jsx = jsx.replace(/\bfor=/g, "htmlFor=");

  // Self-close void elements
  const voidTags = [
    "br",
    "hr",
    "img",
    "input",
    "meta",
    "link",
    "area",
    "base",
    "col",
    "embed",
    "source",
    "track",
    "wbr",
  ];
  for (const tag of voidTags) {
    // Match <tag ...> that isn't already self-closed
    const re = new RegExp(`<(${tag})(\\s[^>]*)?\\/?>(?!\\s*<\\/${tag}>)`, "gi");
    jsx = jsx.replace(re, (_, t, attrs) => {
      const a = attrs ? attrs.replace(/\/$/, "").trimEnd() : "";
      return `<${t}${a} />`;
    });
  }

  // Strip inline event handlers (onclick, onchange, etc.)
  jsx = jsx.replace(/\s+on[a-z]+=("[^"]*"|'[^']*'|\{[^}]*\})/gi, "");

  // Convert style="..." strings to JSX style objects (basic)
  jsx = jsx.replace(/\bstyle="([^"]*)"/g, (_match, styleStr: string) => {
    const pairs = styleStr
      .split(";")
      .filter((s: string) => s.trim())
      .map((s: string) => {
        const [prop, ...valParts] = s.split(":");
        const val = valParts.join(":").trim();
        const camel = prop
          .trim()
          .replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase());
        // Wrap numeric values without "px" etc as numbers, else as strings
        return `${camel}: "${val}"`;
      });
    return `style={{${pairs.join(", ")}}}`;
  });

  // Convert HTML comments to JSX comments
  jsx = jsx.replace(/<!--([\s\S]*?)-->/g, "{/* $1 */}");

  // tabindex= → tabIndex=
  jsx = jsx.replace(/\btabindex=/gi, "tabIndex=");

  // readonly → readOnly
  jsx = jsx.replace(/\breadonly\b/gi, "readOnly");

  // autocomplete= → autoComplete=
  jsx = jsx.replace(/\bautocomplete=/gi, "autoComplete=");

  return jsx;
}

/** Extract body content from a full HTML document */
function extractBody(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) return bodyMatch[1].trim();
  // If no body tag, strip head/html tags
  return html
    .replace(/<\!DOCTYPE[^>]*>/i, "")
    .replace(/<html[^>]*>/i, "")
    .replace(/<\/html>/i, "")
    .replace(/<head>[\s\S]*<\/head>/i, "")
    .trim();
}

/** Extract Google Fonts URLs from HTML head */
function extractGoogleFonts(html: string): string[] {
  const urls: string[] = [];
  const re = /href="(https:\/\/fonts\.googleapis\.com\/css2[^"]*)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    urls.push(m[1]);
  }
  return urls;
}

/** Extract <style> content from <head> */
function extractHeadStyles(html: string): string {
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  if (!headMatch) return "";
  const head = headMatch[1];
  const styles: string[] = [];
  const re = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let m;
  while ((m = re.exec(head)) !== null) {
    styles.push(m[1]);
  }
  return styles.join("\n\n");
}

/** Generate CSS variables from design system */
function generateDesignVars(ds: DesignSystem): string {
  const { colors, layout } = ds;
  let vars = `  /* Design System Colors */
  --color-primary: ${colors.primary};
  --color-secondary: ${colors.secondary};
  --color-background: ${colors.background};
  --color-surface: ${colors.surface};
  --color-text: ${colors.text};
  --color-text-muted: ${colors.textMuted};
  --color-border: ${colors.border};
  --color-success: ${colors.success};
  --color-error: ${colors.error};`;

  if (layout) {
    vars += `

  /* Layout Tokens */
  --radius: ${layout.borderRadius};
  --radius-lg: ${layout.borderRadiusLg};
  --radius-sm: ${layout.borderRadiusSm};
  --shadow: ${layout.shadow};
  --shadow-lg: ${layout.shadowLg};
  --spacing-unit: ${layout.spacingUnit}px;
  --card-padding: ${layout.cardPadding};
  --section-gap: ${layout.sectionGap};
  --button-height: ${layout.buttonHeight};
  --input-height: ${layout.inputHeight};
  --nav-height: ${layout.navHeight};`;
  }

  return vars;
}

/** Build the globals.css for the exported project */
function buildGlobalsCss(
  ds: DesignSystem,
  googleFontUrls: string[],
  headStyles: string
): string {
  const fontImports = googleFontUrls
    .map((url) => `@import url("${url}");`)
    .join("\n");

  return `@import "tailwindcss";

${fontImports}

:root {
${generateDesignVars(ds)}
}

body {
  font-family: ${ds.fonts.primary};
  background-color: var(--color-background);
  color: var(--color-text);
  margin: 0;
  padding: 0;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code, pre, kbd {
  font-family: ${ds.fonts.mono};
}

${headStyles}
`;
}

/** Build root layout.tsx */
function buildLayoutTsx(appName: string, fontFamily: string): string {
  return `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "${appName}",
  description: "Generated by Wirefraime",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: '${fontFamily.replace(/'/g, "\\'")}' }}>
        {children}
      </body>
    </html>
  );
}
`;
}

/** Build a page component from body HTML */
function buildPageTsx(
  screenName: string,
  bodyJsx: string,
  isHomePage: boolean
): string {
  const componentName = isHomePage
    ? "HomePage"
    : screenName
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join("") + "Page";

  return `export default function ${componentName}() {
  return (
    <>
${bodyJsx
  .split("\n")
  .map((line) => `      ${line}`)
  .join("\n")}
    </>
  );
}
`;
}

/** Build package.json */
function buildPackageJson(appName: string): string {
  return JSON.stringify(
    {
      name: slug(appName) || "my-app",
      version: "0.1.0",
      private: true,
      scripts: {
        dev: "next dev",
        build: "next build",
        start: "next start",
        lint: "next lint",
      },
      dependencies: {
        next: "^15.0.0",
        react: "^19.0.0",
        "react-dom": "^19.0.0",
      },
      devDependencies: {
        "@types/node": "^22.0.0",
        "@types/react": "^19.0.0",
        "@types/react-dom": "^19.0.0",
        typescript: "^5.0.0",
        tailwindcss: "^4.0.0",
        "@tailwindcss/postcss": "^4.0.0",
      },
    },
    null,
    2
  );
}

/** Build tsconfig.json */
function buildTsconfig(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: "ES2017",
        lib: ["dom", "dom.iterable", "esnext"],
        allowJs: true,
        skipLibCheck: true,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        module: "esnext",
        moduleResolution: "bundler",
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: "preserve",
        incremental: true,
        plugins: [{ name: "next" }],
        paths: {
          "@/*": ["./*"],
        },
      },
      include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
      exclude: ["node_modules"],
    },
    null,
    2
  );
}

/** Build next.config.ts */
function buildNextConfig(): string {
  return `import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
`;
}

/** Build postcss.config.mjs */
function buildPostcssConfig(): string {
  return `/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
`;
}

/** Export a WireframeApp as a Next.js project ZIP file */
export async function exportNextjsZip(app: WireframeApp): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const JSZip = ((await import("jszip")) as any).default ?? (await import("jszip"));
  const zip = new JSZip();
  const projectName = slug(app.name) || "my-app";
  const root = zip.folder(projectName)!;

  // Collect Google Font URLs and head styles from first screen
  let googleFontUrls: string[] = [];
  let headStyles = "";

  if (app.screens.length > 0 && app.screens[0].html) {
    googleFontUrls = extractGoogleFonts(app.screens[0].html);
    headStyles = extractHeadStyles(app.screens[0].html);
  }

  // Also check other screens for any additional font URLs
  for (const screen of app.screens.slice(1)) {
    if (!screen.html) continue;
    for (const url of extractGoogleFonts(screen.html)) {
      if (!googleFontUrls.includes(url)) googleFontUrls.push(url);
    }
  }

  const ds = app.designSystem ?? {
    colors: {
      primary: "#3b82f6",
      secondary: "#64748b",
      background: "#ffffff",
      surface: "#f8fafc",
      text: "#0f172a",
      textMuted: "#64748b",
      border: "#e2e8f0",
      success: "#22c55e",
      error: "#ef4444",
    },
    fonts: {
      primary: "system-ui, sans-serif",
      mono: "monospace",
    },
  };

  // Root config files
  root.file("package.json", buildPackageJson(app.name));
  root.file("tsconfig.json", buildTsconfig());
  root.file("next.config.ts", buildNextConfig());
  root.file("postcss.config.mjs", buildPostcssConfig());

  // app/ directory
  const appDir = root.folder("app")!;
  appDir.file("globals.css", buildGlobalsCss(ds, googleFontUrls, headStyles));
  appDir.file("layout.tsx", buildLayoutTsx(app.name, ds.fonts.primary));

  // Generate pages for each screen
  for (let i = 0; i < app.screens.length; i++) {
    const screen = app.screens[i];
    if (!screen.html) continue;

    const bodyHtml = extractBody(screen.html);
    const bodyJsx = htmlToJsx(bodyHtml);
    const isHome = i === 0;

    if (isHome) {
      appDir.file("page.tsx", buildPageTsx(screen.name, bodyJsx, true));
    } else {
      const screenSlug = slug(screen.name);
      const screenDir = appDir.folder(screenSlug)!;
      screenDir.file(
        "page.tsx",
        buildPageTsx(screen.name, bodyJsx, false)
      );
    }
  }

  // public/ directory (empty, with .gitkeep)
  const publicDir = root.folder("public")!;
  publicDir.file(".gitkeep", "");

  // components/ui/ directory (empty, with .gitkeep)
  const componentsDir = root.folder("components")!;
  const uiDir = componentsDir.folder("ui")!;
  uiDir.file(".gitkeep", "");

  // Generate and download ZIP
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${projectName}-nextjs.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
