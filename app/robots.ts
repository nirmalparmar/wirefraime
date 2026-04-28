import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://wirefraime.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard", "/workspace/", "/sign-in", "/sign-up"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
